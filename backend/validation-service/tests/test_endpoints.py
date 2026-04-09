"""Integration tests for validation-service API endpoints and business rules."""

import sys
import os
import uuid

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-pytest")

from database import Base, get_db
from deps import get_current_user, require_roles
from function import app, _check_hierarchy
from models import ValidationAction

# StaticPool forces all sessions to share the same connection so that
# tables created by Base.metadata.create_all are visible to every session.
TEST_ENGINE = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)


def override_get_db():
    """Return a test database session."""
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


def _set_auth(role: str = "admin", sub: str = "reviewer-001", email: str = "reviewer@company.com"):
    """Override auth dependencies to simulate the given user."""
    payload = {"sub": sub, "email": email, "role": role}
    app.dependency_overrides[get_current_user] = lambda: payload

    def _require(allowed_roles):
        def _check():
            if role not in allowed_roles:
                raise HTTPException(status_code=403, detail="Access denied: insufficient permissions")
            return payload
        return _check

    app.dependency_overrides[require_roles] = _require


@pytest.fixture(autouse=True)
def setup_db():
    """Recreate the schema before each test."""
    Base.metadata.create_all(bind=TEST_ENGINE)
    yield
    Base.metadata.drop_all(bind=TEST_ENGINE)
    app.dependency_overrides.clear()
    app.dependency_overrides[get_db] = override_get_db


@pytest.fixture()
def client():
    return TestClient(app)


# ---------------------------------------------------------------------------
# Hierarchy unit tests (pure function, no DB)
# ---------------------------------------------------------------------------

class TestCheckHierarchy:
    """Unit tests for the _check_hierarchy helper."""

    def test_admin_can_always_review(self):
        """admin is permitted to review any submitter role."""
        _check_hierarchy("admin", "team_member")
        _check_hierarchy("admin", "org_leader")

    def test_team_lead_can_review_team_member(self):
        """team_lead is a valid reviewer for team_member submissions."""
        _check_hierarchy("team_lead", "team_member")

    def test_team_lead_cannot_review_manager(self):
        """team_lead may not review a manager submission."""
        with pytest.raises(HTTPException) as exc_info:
            _check_hierarchy("team_lead", "manager")
        assert exc_info.value.status_code == 403

    def test_manager_can_review_team_lead(self):
        """manager is a valid reviewer for team_lead submissions."""
        _check_hierarchy("manager", "team_lead")

    def test_manager_cannot_review_org_leader(self):
        """manager may not review an org_leader submission."""
        with pytest.raises(HTTPException):
            _check_hierarchy("manager", "org_leader")

    def test_org_leader_can_review_manager(self):
        """org_leader is a valid reviewer for manager submissions."""
        _check_hierarchy("org_leader", "manager")

    def test_no_submitter_role_skips_enforcement(self):
        """When submitter_role is None the hierarchy check is skipped."""
        _check_hierarchy("team_member", None)  # no exception expected

    def test_team_member_cannot_review(self):
        """team_member is not a valid reviewer for any submitter role."""
        with pytest.raises(HTTPException):
            _check_hierarchy("team_member", "team_member")


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

class TestHealthCheck:
    def test_health_returns_200(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Submit validation
# ---------------------------------------------------------------------------

class TestSubmitValidation:
    """Tests for POST /validations."""

    def _payload(self, **kwargs) -> dict:
        defaults = {
            "achievement_id": str(uuid.uuid4()),
            "action": "approved",
            "comment": "Great work!",
            "submitted_by": "submitter-999",
            "submitter_role": "team_member",
        }
        defaults.update(kwargs)
        return defaults

    def test_submit_approval_success(self, client):
        """A reviewer can approve an achievement."""
        _set_auth("admin")
        resp = client.post("/validations", json=self._payload())
        assert resp.status_code == 201
        body = resp.json()
        assert body["action"] == "approved"
        assert "id" in body

    def test_submit_rejection_success(self, client):
        """A reviewer can reject an achievement."""
        _set_auth("admin")
        resp = client.post("/validations", json=self._payload(action="rejected", comment="Incomplete details"))
        assert resp.status_code == 201
        assert resp.json()["action"] == "rejected"

    def test_empty_comment_returns_422(self, client):
        """An empty or whitespace-only comment must be rejected at schema level."""
        _set_auth("admin")
        resp = client.post("/validations", json=self._payload(comment="   "))
        assert resp.status_code == 422

    def test_self_review_returns_403(self, client):
        """Reviewer cannot approve/reject their own submission."""
        _set_auth("admin", sub="reviewer-001")
        resp = client.post(
            "/validations",
            json=self._payload(submitted_by="reviewer-001"),
        )
        assert resp.status_code == 403
        assert "self" in resp.json()["detail"].lower() or "own" in resp.json()["detail"].lower()

    def test_duplicate_decision_returns_409(self, client):
        """A second final decision on the same achievement returns 409."""
        _set_auth("admin")
        payload = self._payload()
        client.post("/validations", json=payload)
        resp = client.post("/validations", json=payload)
        assert resp.status_code == 409

    def test_hierarchy_violation_returns_403(self, client):
        """Wrong reviewer role for the submitter's role returns 403."""
        _set_auth("team_lead", sub="reviewer-001")
        resp = client.post(
            "/validations",
            json=self._payload(submitter_role="org_leader"),
        )
        assert resp.status_code == 403

    def test_non_reviewer_returns_403(self, client):
        """A team_member cannot submit validations."""
        _set_auth("team_member")
        resp = client.post("/validations", json=self._payload())
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# List validations
# ---------------------------------------------------------------------------

class TestListValidations:
    """Tests for GET /validations."""

    def test_list_returns_created_records(self, client):
        """GET /validations returns previously submitted validations."""
        _set_auth("admin")
        achievement_id = str(uuid.uuid4())
        client.post(
            "/validations",
            json={
                "achievement_id": achievement_id,
                "action": "approved",
                "comment": "Well done",
                "submitted_by": "other-user",
            },
        )
        resp = client.get("/validations", params={"achievement_id": achievement_id})
        assert resp.status_code == 200
        results = resp.json()
        assert len(results) == 1
        assert results[0]["achievement_id"] == achievement_id


# ---------------------------------------------------------------------------
# Get single validation
# ---------------------------------------------------------------------------

class TestGetValidation:
    """Tests for GET /validations/{id}."""

    def test_get_existing_validation(self, client):
        """Fetching a validation by valid ID returns correct data."""
        _set_auth("admin")
        created = client.post(
            "/validations",
            json={
                "achievement_id": str(uuid.uuid4()),
                "action": "approved",
                "comment": "Looks good",
                "submitted_by": "other-user",
            },
        ).json()
        resp = client.get(f"/validations/{created['id']}")
        assert resp.status_code == 200
        assert resp.json()["id"] == created["id"]

    def test_get_nonexistent_returns_404(self, client):
        """Requesting an unknown validation ID returns 404."""
        _set_auth("admin")
        resp = client.get(f"/validations/{uuid.uuid4()}")
        assert resp.status_code == 404

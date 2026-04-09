"""Integration tests for achievement-service API endpoints."""

import sys
import os
import uuid
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-pytest")

from database import Base, get_db
from deps import get_current_user, require_roles
from function import app, REVIEWER_ROLES, WRITER_ROLES

TEST_ENGINE = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
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


# ---------------------------------------------------------------------------
# Auth helpers: bypass real JWT validation in unit tests
# ---------------------------------------------------------------------------

def _make_user_payload(role: str = "team_member", sub: str = "user-001") -> dict:
    return {"sub": sub, "email": f"{sub}@company.com", "role": role}


def _override_current_user(role: str = "team_member", sub: str = "user-001"):
    def _dep():
        return _make_user_payload(role, sub)
    return _dep


def _set_auth(role: str = "team_member", sub: str = "user-001"):
    """Override both get_current_user and require_roles for a given role."""
    payload = _make_user_payload(role, sub)
    app.dependency_overrides[get_current_user] = lambda: payload

    def _require(allowed_roles):
        def _check():
            if role not in allowed_roles:
                from fastapi import HTTPException, status
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: insufficient permissions")
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
    """Return an HTTP test client."""
    return TestClient(app)


# ---------------------------------------------------------------------------
# Payload helpers
# ---------------------------------------------------------------------------

def _achievement_payload(**kwargs) -> dict:
    defaults = {
        "employee_id": "emp-001",
        "team_id": "team-001",
        "title": "Shipped new feature",
        "description": "Delivered ahead of schedule",
        "month": 6,
        "year": 2025,
        "submitted_by": "user-001",
    }
    defaults.update(kwargs)
    return defaults


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

class TestHealthCheck:
    """Tests for GET /health."""

    def test_health_returns_200(self, client):
        """Health endpoint is always accessible."""
        resp = client.get("/health")
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Create achievement
# ---------------------------------------------------------------------------

class TestCreateAchievement:
    """Tests for POST /achievements."""

    def test_create_success(self, client):
        """Any authenticated user can create an achievement with status=pending."""
        _set_auth("team_member")
        resp = client.post("/achievements", json=_achievement_payload())
        assert resp.status_code == 201
        body = resp.json()
        assert body["title"] == "Shipped new feature"
        assert body["status"] == "pending"
        assert "id" in body

    def test_create_requires_auth(self, client):
        """Without an auth override the endpoint should reject the request."""
        # Remove any override so the real dep runs → 403 (no Bearer header)
        app.dependency_overrides.clear()
        app.dependency_overrides[get_db] = override_get_db
        resp = client.post("/achievements", json=_achievement_payload())
        assert resp.status_code in (401, 403)

    def test_create_invalid_month_returns_422(self, client):
        """Month must be between 1 and 12."""
        _set_auth("team_member")
        resp = client.post("/achievements", json=_achievement_payload(month=13))
        assert resp.status_code == 422

    def test_create_invalid_year_returns_422(self, client):
        """Year must be between 2000 and 2100."""
        _set_auth("team_member")
        resp = client.post("/achievements", json=_achievement_payload(year=1999))
        assert resp.status_code == 422

    def test_create_missing_title_returns_422(self, client):
        """Title is required."""
        _set_auth("team_member")
        payload = _achievement_payload()
        del payload["title"]
        resp = client.post("/achievements", json=payload)
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# List achievements
# ---------------------------------------------------------------------------

class TestListAchievements:
    """Tests for GET /achievements."""

    def test_list_returns_all(self, client):
        """Listed achievements include those just created."""
        _set_auth("team_member")
        client.post("/achievements", json=_achievement_payload(title="First"))
        client.post("/achievements", json=_achievement_payload(title="Second"))
        resp = client.get("/achievements")
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_filter_by_employee_id(self, client):
        """Filtering by employee_id returns only matching records."""
        _set_auth("team_member")
        client.post("/achievements", json=_achievement_payload(employee_id="emp-001"))
        client.post("/achievements", json=_achievement_payload(employee_id="emp-002"))
        resp = client.get("/achievements", params={"employee_id": "emp-001"})
        assert resp.status_code == 200
        results = resp.json()
        assert len(results) == 1
        assert results[0]["employee_id"] == "emp-001"

    def test_filter_by_status(self, client):
        """Filtering by status returns only records with that status."""
        _set_auth("team_member")
        client.post("/achievements", json=_achievement_payload())
        resp = client.get("/achievements", params={"status": "pending"})
        assert resp.status_code == 200
        assert all(a["status"] == "pending" for a in resp.json())


# ---------------------------------------------------------------------------
# Get single achievement
# ---------------------------------------------------------------------------

class TestGetAchievement:
    """Tests for GET /achievements/{id}."""

    def test_get_existing_achievement(self, client):
        """Fetching by a valid ID returns the correct record."""
        _set_auth("team_member")
        created = client.post("/achievements", json=_achievement_payload()).json()
        resp = client.get(f"/achievements/{created['id']}")
        assert resp.status_code == 200
        assert resp.json()["id"] == created["id"]

    def test_get_nonexistent_returns_404(self, client):
        """Requesting an unknown ID returns 404."""
        _set_auth("team_member")
        resp = client.get(f"/achievements/{uuid.uuid4()}")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Update achievement
# ---------------------------------------------------------------------------

class TestUpdateAchievement:
    """Tests for PUT /achievements/{id}."""

    def test_reviewer_can_update_pending(self, client):
        """A reviewer-role user can update a pending achievement."""
        _set_auth("admin")
        created = client.post("/achievements", json=_achievement_payload()).json()
        resp = client.put(f"/achievements/{created['id']}", json={"title": "Updated Title"})
        assert resp.status_code == 200
        assert resp.json()["title"] == "Updated Title"

    def test_non_reviewer_cannot_update(self, client):
        """A team_member (non-reviewer) should receive 403 on update."""
        _set_auth("team_member")
        created = client.post("/achievements", json=_achievement_payload()).json()
        resp = client.put(f"/achievements/{created['id']}", json={"title": "Try Update"})
        assert resp.status_code == 403

    def test_cannot_update_nonexistent(self, client):
        """Updating an unknown achievement returns 404."""
        _set_auth("admin")
        resp = client.put(f"/achievements/{uuid.uuid4()}", json={"title": "X"})
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Delete achievement
# ---------------------------------------------------------------------------

class TestDeleteAchievement:
    """Tests for DELETE /achievements/{id}."""

    def test_writer_can_delete(self, client):
        """A writer-role user can delete an achievement."""
        _set_auth("admin")
        created = client.post("/achievements", json=_achievement_payload()).json()
        resp = client.delete(f"/achievements/{created['id']}")
        assert resp.status_code == 200
        assert resp.json()["message"] == "Achievement deleted successfully"

    def test_non_writer_cannot_delete(self, client):
        """A team_lead (not in WRITER_ROLES) cannot delete."""
        _set_auth("team_lead")
        created_payload = _achievement_payload()
        # create as admin first
        _set_auth("admin")
        created = client.post("/achievements", json=created_payload).json()
        _set_auth("team_lead")
        resp = client.delete(f"/achievements/{created['id']}")
        assert resp.status_code == 403

    def test_delete_nonexistent_returns_404(self, client):
        """Deleting a non-existent achievement returns 404."""
        _set_auth("admin")
        resp = client.delete(f"/achievements/{uuid.uuid4()}")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Status update
# ---------------------------------------------------------------------------

class TestUpdateAchievementStatus:
    """Tests for PATCH /achievements/{id}/status."""

    def test_reviewer_can_approve(self, client):
        """A reviewer can change status to approved."""
        _set_auth("admin")
        created = client.post("/achievements", json=_achievement_payload()).json()
        resp = client.patch(f"/achievements/{created['id']}/status", params={"new_status": "approved"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "approved"

    def test_invalid_status_returns_400(self, client):
        """Passing an unknown status value returns 400."""
        _set_auth("admin")
        created = client.post("/achievements", json=_achievement_payload()).json()
        resp = client.patch(f"/achievements/{created['id']}/status", params={"new_status": "unknown"})
        assert resp.status_code == 400

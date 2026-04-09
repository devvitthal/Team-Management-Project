"""Integration tests for employee-service API endpoints."""

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
from function import app

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


def _set_auth(role: str = "admin", sub: str = "user-001"):
    """Override auth dependencies for a given role."""
    payload = {"sub": sub, "email": f"{sub}@company.com", "role": role}
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


def _emp_payload(**kwargs) -> dict:
    defaults = {
        "full_name": "Jane Doe",
        "email": "jane.doe@company.com",
        "role": "team_member",
        "designation": "Engineer",
        "location": "New York",
    }
    defaults.update(kwargs)
    return defaults


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

class TestHealthCheck:
    def test_health_returns_200(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert "message" in resp.json()


# ---------------------------------------------------------------------------
# Create employee
# ---------------------------------------------------------------------------

class TestCreateEmployee:
    """Tests for POST /employees."""

    def test_create_success(self, client):
        """A writer-role user can create a new employee."""
        _set_auth("admin")
        resp = client.post("/employees", json=_emp_payload())
        assert resp.status_code == 201
        body = resp.json()
        assert body["full_name"] == "Jane Doe"
        assert body["email"] == "jane.doe@company.com"
        assert "id" in body

    def test_create_duplicate_email_returns_409(self, client):
        """Creating two employees with the same email must return 409."""
        _set_auth("admin")
        client.post("/employees", json=_emp_payload())
        resp = client.post("/employees", json=_emp_payload())
        assert resp.status_code == 409

    def test_non_writer_cannot_create(self, client):
        """A team_member cannot create employees."""
        _set_auth("team_member")
        resp = client.post("/employees", json=_emp_payload())
        assert resp.status_code == 403

    def test_create_missing_required_fields_returns_422(self, client):
        """full_name is required."""
        _set_auth("admin")
        payload = _emp_payload()
        del payload["full_name"]
        resp = client.post("/employees", json=payload)
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# List employees
# ---------------------------------------------------------------------------

class TestListEmployees:
    """Tests for GET /employees."""

    def test_list_returns_all(self, client):
        """All created employees are returned by the list endpoint."""
        _set_auth("admin")
        client.post("/employees", json=_emp_payload(email="a@company.com"))
        client.post("/employees", json=_emp_payload(email="b@company.com"))
        resp = client.get("/employees")
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_search_filters_by_name(self, client):
        """Search query filters records by name."""
        _set_auth("admin")
        client.post("/employees", json=_emp_payload(full_name="Alice Smith", email="alice@company.com"))
        client.post("/employees", json=_emp_payload(full_name="Bob Jones", email="bob@company.com"))
        resp = client.get("/employees", params={"search": "alice"})
        assert resp.status_code == 200
        results = resp.json()
        assert len(results) == 1
        assert results[0]["full_name"] == "Alice Smith"

    def test_filter_by_role(self, client):
        """Filtering by role returns only matching employees."""
        _set_auth("admin")
        client.post("/employees", json=_emp_payload(email="mgr@company.com", role="manager"))
        client.post("/employees", json=_emp_payload(email="mem@company.com", role="team_member"))
        resp = client.get("/employees", params={"role": "manager"})
        assert resp.status_code == 200
        assert all(e["role"] == "manager" for e in resp.json())

    def test_unauthenticated_returns_403(self, client):
        """Without auth the list endpoint should be blocked."""
        app.dependency_overrides.clear()
        app.dependency_overrides[get_db] = override_get_db
        resp = client.get("/employees")
        assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Get single employee
# ---------------------------------------------------------------------------

class TestGetEmployee:
    """Tests for GET /employees/{id}."""

    def test_get_existing_employee(self, client):
        """Fetching by a valid ID returns the correct employee."""
        _set_auth("admin")
        created = client.post("/employees", json=_emp_payload()).json()
        resp = client.get(f"/employees/{created['id']}")
        assert resp.status_code == 200
        assert resp.json()["id"] == created["id"]

    def test_get_nonexistent_returns_404(self, client):
        """Requesting an unknown employee ID returns 404."""
        _set_auth("admin")
        resp = client.get(f"/employees/{uuid.uuid4()}")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Update employee
# ---------------------------------------------------------------------------

class TestUpdateEmployee:
    """Tests for PUT /employees/{id}."""

    def test_writer_can_update(self, client):
        """A writer-role user can update an employee."""
        _set_auth("admin")
        created = client.post("/employees", json=_emp_payload()).json()
        resp = client.put(f"/employees/{created['id']}", json={"full_name": "Jane Updated"})
        assert resp.status_code == 200
        assert resp.json()["full_name"] == "Jane Updated"

    def test_non_writer_cannot_update(self, client):
        """team_member cannot update employees."""
        _set_auth("admin")
        created = client.post("/employees", json=_emp_payload()).json()
        _set_auth("team_member")
        resp = client.put(f"/employees/{created['id']}", json={"full_name": "Jane Hacked"})
        assert resp.status_code == 403

    def test_update_nonexistent_returns_404(self, client):
        """Updating a non-existent employee returns 404."""
        _set_auth("admin")
        resp = client.put(f"/employees/{uuid.uuid4()}", json={"full_name": "Ghost"})
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Delete employee
# ---------------------------------------------------------------------------

class TestDeleteEmployee:
    """Tests for DELETE /employees/{id}."""

    def test_writer_can_delete(self, client):
        """A writer-role user can delete an employee."""
        _set_auth("admin")
        created = client.post("/employees", json=_emp_payload()).json()
        resp = client.delete(f"/employees/{created['id']}")
        assert resp.status_code == 200

    def test_non_writer_cannot_delete(self, client):
        """A team_member cannot delete employees."""
        _set_auth("admin")
        created = client.post("/employees", json=_emp_payload()).json()
        _set_auth("team_member")
        resp = client.delete(f"/employees/{created['id']}")
        assert resp.status_code == 403

    def test_delete_nonexistent_returns_404(self, client):
        """Deleting a non-existant employee returns 404."""
        _set_auth("admin")
        resp = client.delete(f"/employees/{uuid.uuid4()}")
        assert resp.status_code == 404

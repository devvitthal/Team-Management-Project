"""Integration tests for auth-service API endpoints."""

import sys
import os
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Make the service package importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Use an in-memory SQLite database for isolation
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-pytest")

from database import Base, get_db
from function import app

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


@pytest.fixture(autouse=True)
def setup_db():
    """Create all tables before each test and drop them after."""
    Base.metadata.create_all(bind=TEST_ENGINE)
    yield
    Base.metadata.drop_all(bind=TEST_ENGINE)


@pytest.fixture()
def client():
    """Return an HTTP test client."""
    return TestClient(app)


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _register(client: TestClient, email: str = "alice@company.com", password: str = "Password1") -> dict:
    """Register a user and return the JSON response."""
    resp = client.post(
        "/auth/register",
        json={"email": email, "full_name": "Alice Smith", "password": password},
    )
    return resp


def _auth_headers(client: TestClient, email: str = "alice@company.com", password: str = "Password1") -> dict:
    """Register (or reuse) a user and return an Authorization header dict."""
    _register(client, email, password)
    resp = client.post("/auth/login", json={"email": email, "password": password})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

class TestHealthCheck:
    """Tests for GET /health."""

    def test_health_returns_200(self, client):
        """Health endpoint should be accessible without auth."""
        resp = client.get("/health")
        assert resp.status_code == 200
        assert "message" in resp.json()


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

class TestRegisterUser:
    """Tests for POST /auth/register."""

    def test_register_success(self, client):
        """A valid registration creates a user and returns a JWT."""
        resp = _register(client)
        assert resp.status_code == 201
        body = resp.json()
        assert "access_token" in body
        assert body["user"]["email"] == "alice@company.com"
        assert body["user"]["role"] == "team_member"

    def test_register_duplicate_email_returns_409(self, client):
        """Registering with the same e-mail twice must raise 409."""
        _register(client)
        resp = _register(client)
        assert resp.status_code == 409

    def test_register_invalid_domain_returns_422(self, client):
        """E-mail domain must be @company.com."""
        resp = _register(client, email="user@gmail.com")
        assert resp.status_code == 422

    def test_register_weak_password_returns_422(self, client):
        """Password must have >=8 chars, 1 uppercase, 1 digit."""
        resp = _register(client, password="weak")
        assert resp.status_code == 422

    def test_register_role_defaults_to_team_member(self, client):
        """New users always start with the team_member role."""
        resp = _register(client)
        assert resp.json()["user"]["role"] == "team_member"


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

class TestLoginUser:
    """Tests for POST /auth/login."""

    def test_login_success(self, client):
        """Valid credentials return a JWT and the user object."""
        _register(client)
        resp = client.post("/auth/login", json={"email": "alice@company.com", "password": "Password1"})
        assert resp.status_code == 200
        body = resp.json()
        assert "access_token" in body
        assert body["token_type"] == "bearer"

    def test_login_wrong_password_returns_401(self, client):
        """Incorrect password must return 401."""
        _register(client)
        resp = client.post("/auth/login", json={"email": "alice@company.com", "password": "WrongPass9"})
        assert resp.status_code == 401

    def test_login_unknown_email_returns_401(self, client):
        """Login for a non-registered e-mail must return 401."""
        resp = client.post("/auth/login", json={"email": "nobody@company.com", "password": "Password1"})
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# GET /auth/me
# ---------------------------------------------------------------------------

class TestGetMe:
    """Tests for GET /auth/me."""

    def test_get_me_authenticated(self, client):
        """Authenticated user gets their own profile."""
        headers = _auth_headers(client)
        resp = client.get("/auth/me", headers=headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["email"] == "alice@company.com"

    def test_get_me_without_token_returns_403(self, client):
        """No token → 403 (HTTPBearer raises 403 when header is missing)."""
        resp = client.get("/auth/me")
        assert resp.status_code == 403

    def test_get_me_invalid_token_returns_401(self, client):
        """An invalid/tampered token must return 401."""
        resp = client.get("/auth/me", headers={"Authorization": "Bearer invalid.token.here"})
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# GET /auth/users  (admin only)
# ---------------------------------------------------------------------------

class TestListUsers:
    """Tests for GET /auth/users."""

    def _make_admin_headers(self, client: TestClient) -> dict:
        """Register a user, promote to admin via DB, then return headers."""
        from models import User, UserRole
        _register(client, email="admin@company.com")
        db = TestingSession()
        try:
            user = db.query(User).filter(User.email == "admin@company.com").first()
            user.role = UserRole.admin
            db.commit()
        finally:
            db.close()
        resp = client.post("/auth/login", json={"email": "admin@company.com", "password": "Password1"})
        return {"Authorization": f"Bearer {resp.json()['access_token']}"}

    def test_non_admin_returns_403(self, client):
        """A team_member cannot list all users."""
        headers = _auth_headers(client)
        resp = client.get("/auth/users", headers=headers)
        assert resp.status_code == 403

    def test_admin_can_list_users(self, client):
        """An admin user receives the full user list."""
        _register(client)  # regular user
        admin_headers = self._make_admin_headers(client)
        resp = client.get("/auth/users", headers=admin_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        assert len(resp.json()) >= 2

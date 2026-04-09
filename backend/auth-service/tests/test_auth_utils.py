"""Unit tests for auth utility functions (hashing, JWT)."""

import time
from datetime import timedelta

import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from auth import hash_password, verify_password, create_access_token, decode_access_token


class TestHashPassword:
    """Tests for hash_password and verify_password."""

    def test_hash_returns_string(self):
        """Hash result should be a non-empty string."""
        result = hash_password("SecurePass1")
        assert isinstance(result, str)
        assert len(result) > 0

    def test_hash_differs_from_plain(self):
        """Hash must not equal the original plain-text password."""
        plain = "SecurePass1"
        assert hash_password(plain) != plain

    def test_hash_is_not_deterministic(self):
        """Each call to hash_password generates a unique salt."""
        plain = "SecurePass1"
        assert hash_password(plain) != hash_password(plain)

    def test_verify_correct_password(self):
        """verify_password returns True for a matching plain/hash pair."""
        plain = "SecurePass1"
        hashed = hash_password(plain)
        assert verify_password(plain, hashed) is True

    def test_verify_wrong_password(self):
        """verify_password returns False when the plain password does not match."""
        hashed = hash_password("SecurePass1")
        assert verify_password("WrongPass99", hashed) is False

    def test_verify_empty_password_against_hash(self):
        """An empty string does not match a hash of a real password."""
        hashed = hash_password("SecurePass1")
        assert verify_password("", hashed) is False


class TestCreateAccessToken:
    """Tests for JWT token creation."""

    def test_returns_string(self):
        """create_access_token should return a non-empty string."""
        token = create_access_token({"sub": "user-123", "role": "team_member"})
        assert isinstance(token, str)
        assert len(token) > 0

    def test_token_has_three_parts(self):
        """JWTs are dot-separated in three parts."""
        token = create_access_token({"sub": "user-123"})
        assert len(token.split(".")) == 3

    def test_custom_expiry(self):
        """Token created with a custom delta encodes the correct expiry window."""
        token = create_access_token({"sub": "user-123"}, expires_delta=timedelta(seconds=60))
        payload = decode_access_token(token)
        assert payload is not None
        # expiry should be roughly 60 seconds from now
        remaining = payload["exp"] - time.time()
        assert 50 <= remaining <= 70

    def test_payload_claims_preserved(self):
        """Custom claims are encoded verbatim into the token."""
        token = create_access_token({"sub": "abc", "role": "admin", "email": "a@company.com"})
        payload = decode_access_token(token)
        assert payload["sub"] == "abc"
        assert payload["role"] == "admin"
        assert payload["email"] == "a@company.com"


class TestDecodeAccessToken:
    """Tests for JWT token decoding."""

    def test_valid_token_returns_payload(self):
        """A freshly issued token should decode without errors."""
        token = create_access_token({"sub": "user-123", "role": "manager"})
        result = decode_access_token(token)
        assert result is not None
        assert result["sub"] == "user-123"

    def test_expired_token_returns_none(self):
        """A token that has already expired should return None."""
        token = create_access_token({"sub": "user-123"}, expires_delta=timedelta(seconds=-1))
        assert decode_access_token(token) is None

    def test_invalid_token_returns_none(self):
        """A completely invalid token string should return None."""
        assert decode_access_token("not.a.token") is None

    def test_tampered_token_returns_none(self):
        """Modifying the token payload makes the signature invalid."""
        token = create_access_token({"sub": "user-123"})
        parts = token.split(".")
        tampered = parts[0] + ".AAAA" + parts[2]
        assert decode_access_token(tampered) is None

    def test_empty_string_returns_none(self):
        """An empty string is not a valid token."""
        assert decode_access_token("") is None

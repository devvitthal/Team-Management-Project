"""
Auth Service: Pydantic schemas for request/response validation.
"""

import re
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator, ConfigDict
from models import UserRole


COMPANY_DOMAIN = "company.com"


class UserRegisterRequest(BaseModel):
    """Schema for user registration requests. Role is always team_member."""

    email: EmailStr
    full_name: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_company_email(cls, value: str) -> str:
        """Ensure the email belongs to the company domain."""
        if not value.lower().endswith(f"@{COMPANY_DOMAIN}"):
            raise ValueError(f"Email must be a @{COMPANY_DOMAIN} address")
        return value.lower()

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        """Enforce minimum password security requirements."""
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", value):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"\d", value):
            raise ValueError("Password must contain at least one digit")
        return value

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        """Ensure full name is not empty or whitespace only."""
        if not value.strip():
            raise ValueError("Full name must not be empty")
        return value.strip()


class UserLoginRequest(BaseModel):
    """Schema for user login requests."""

    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Schema for user data returned in responses."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    role: UserRole
    is_active: bool


class TokenResponse(BaseModel):
    """Schema for JWT token response."""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class MessageResponse(BaseModel):
    """Schema for simple message responses."""

    message: str
    detail: Optional[str] = None


class UserRoleUpdateRequest(BaseModel):
    """Schema for admin role-update requests."""

    role: UserRole

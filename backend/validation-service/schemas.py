"""
Validation Service: Pydantic schemas for validation workflow.
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator
from models import ValidationAction


class ValidationRequest(BaseModel):
    """
    Schema for submitting a validation decision on an achievement.

    Notes:
        ``reviewer_id`` and ``reviewer_name`` are *ignored* by the server —
        both are extracted from the Bearer JWT to prevent spoofing.
        ``submitted_by`` is the auth-user ID of the achievement's creator;
        used server-side to enforce the self-review ban.
        ``submitter_role`` is the role of the submitter; used server-side to
        enforce the approval-hierarchy routing rules.
    """
    achievement_id: str
    # Accepted from client for backward-compat but overridden server-side from JWT
    reviewer_id: Optional[str] = None
    reviewer_name: Optional[str] = None
    action: ValidationAction
    comment: str
    # Submitter context — provided by the client, validated server-side
    submitted_by: Optional[str] = None
    submitter_role: Optional[str] = None

    @field_validator("comment")
    @classmethod
    def validate_comment_not_empty(cls, value: str) -> str:
        """Ensure a comment is always provided with a validation action."""
        if not value.strip():
            raise ValueError("A comment is mandatory for all validation actions")
        return value.strip()


class ValidationResponse(BaseModel):
    """Schema for validation record data returned in responses."""
    model_config = ConfigDict(from_attributes=True)
    id: str
    achievement_id: str
    reviewer_id: str
    reviewer_name: Optional[str]
    action: ValidationAction
    comment: str
    created_at: Optional[datetime]


class MessageResponse(BaseModel):
    """Schema for simple message responses."""
    message: str

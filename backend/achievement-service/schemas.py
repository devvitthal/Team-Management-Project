"""
Achievement Service: Pydantic schemas for request/response validation.
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator
from models import AchievementStatus


class AchievementCreateRequest(BaseModel):
    """Schema for submitting a new achievement."""
    employee_id: str
    team_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    month: int
    year: int
    submitted_by: Optional[str] = None

    @field_validator("month")
    @classmethod
    def validate_month(cls, value: int) -> int:
        """Ensure month is between 1 and 12."""
        if not 1 <= value <= 12:
            raise ValueError("Month must be between 1 and 12")
        return value

    @field_validator("year")
    @classmethod
    def validate_year(cls, value: int) -> int:
        """Ensure year is within a reasonable range."""
        if not 2000 <= value <= 2100:
            raise ValueError("Year must be between 2000 and 2100")
        return value


class AchievementUpdateRequest(BaseModel):
    """Schema for updating an achievement record."""
    title: Optional[str] = None
    description: Optional[str] = None
    month: Optional[int] = None
    year: Optional[int] = None


class AchievementResponse(BaseModel):
    """Schema for achievement data returned in responses."""
    model_config = ConfigDict(from_attributes=True)
    id: str
    employee_id: str
    team_id: Optional[str]
    title: str
    description: Optional[str]
    month: int
    year: int
    status: AchievementStatus
    submitted_by: Optional[str]


class TeamMonthlyStatsResponse(BaseModel):
    """Schema for per-team monthly approved-achievement counts (Q3)."""

    model_config = ConfigDict(from_attributes=True)

    team_id: str
    month: int
    year: int
    approved_count: int


class MessageResponse(BaseModel):
    """Schema for simple message responses."""
    message: str


class TeamSummaryCreateRequest(BaseModel):
    """Schema for creating a monthly team achievement summary."""
    team_id: str
    month: int
    year: int
    title: str
    summary: Optional[str] = None

    @field_validator("month")
    @classmethod
    def validate_month(cls, value: int) -> int:
        """Ensure month is between 1 and 12."""
        if not 1 <= value <= 12:
            raise ValueError("Month must be between 1 and 12")
        return value

    @field_validator("year")
    @classmethod
    def validate_year(cls, value: int) -> int:
        """Ensure year is within a reasonable range."""
        if not 2000 <= value <= 2100:
            raise ValueError("Year must be between 2000 and 2100")
        return value

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        """Ensure title is not empty."""
        if not value.strip():
            raise ValueError("Title must not be empty")
        return value.strip()


class TeamSummaryResponse(BaseModel):
    """Schema for team summary data returned in responses."""
    model_config = ConfigDict(from_attributes=True)
    id: str
    team_id: str
    month: int
    year: int
    title: str
    summary: Optional[str]
    approved_count: int
    created_by: Optional[str]
    created_at: Optional[datetime]

"""
Achievement Service: SQLAlchemy ORM models.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Text, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from database import Base
import enum


class AchievementStatus(str, enum.Enum):
    """Enumeration of achievement approval statuses."""
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class Achievement(Base):
    """Individual employee achievement submission."""

    __tablename__ = "achievements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(String(255), nullable=False, index=True)
    team_id = Column(String(255), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(String(2000), nullable=True)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    status = Column(SAEnum(AchievementStatus), nullable=False, default=AchievementStatus.pending)
    submitted_by = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class TeamSummary(Base):
    """
    Monthly team-level achievement summary aggregated by a Team Lead.

    A Team Lead creates this record to roll-up all approved individual
    achievements for their team into a single monthly summary.
    """

    __tablename__ = "team_summaries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(String(255), nullable=False, index=True)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    summary = Column(Text, nullable=True)
    approved_count = Column(Integer, nullable=False, default=0)
    created_by = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

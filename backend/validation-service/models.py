"""
Validation Service: SQLAlchemy ORM models for achievement review workflow.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Enum as SAEnum, Text
from sqlalchemy.dialects.postgresql import UUID
from database import Base
import enum


class ValidationAction(str, enum.Enum):
    """Enumeration of possible reviewer actions on an achievement."""
    approved = "approved"
    rejected = "rejected"


class ValidationRecord(Base):
    """Audit record of each approval or rejection action on an achievement."""

    __tablename__ = "validation_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    achievement_id = Column(String(255), nullable=False, index=True)
    reviewer_id = Column(String(255), nullable=False, index=True)
    reviewer_name = Column(String(255), nullable=True)
    action = Column(SAEnum(ValidationAction), nullable=False)
    comment = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

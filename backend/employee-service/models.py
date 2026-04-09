"""
Employee Service: SQLAlchemy ORM models.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from database import Base
import enum


class EmployeeRole(str, enum.Enum):
    """Enumeration of employee roles within the organization."""
    admin = "admin"
    org_leader = "org_leader"
    manager = "manager"
    team_lead = "team_lead"
    team_member = "team_member"


class Employee(Base):
    """Employee profile model linked to a user account."""

    __tablename__ = "employees"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(255), nullable=True, index=True)
    employee_code = Column(String(50), unique=True, nullable=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    role = Column(SAEnum(EmployeeRole), nullable=False, default=EmployeeRole.team_member)
    designation = Column(String(100), nullable=True)
    location = Column(String(255), nullable=True)
    manager_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    team_id = Column(UUID(as_uuid=True), nullable=True)
    department_id = Column(UUID(as_uuid=True), nullable=True)
    branch_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

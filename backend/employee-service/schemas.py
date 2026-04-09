"""
Employee Service: Pydantic schemas for request/response validation.
"""

from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict
from models import EmployeeRole


class EmployeeCreateRequest(BaseModel):
    """Schema for creating a new employee record."""

    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    role: EmployeeRole = EmployeeRole.team_member
    designation: Optional[str] = None
    location: Optional[str] = None
    employee_code: Optional[str] = None
    manager_id: Optional[str] = None
    team_id: Optional[str] = None
    department_id: Optional[str] = None
    branch_id: Optional[str] = None
    user_id: Optional[str] = None


class EmployeeUpdateRequest(BaseModel):
    """Schema for updating an existing employee record."""

    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[EmployeeRole] = None
    designation: Optional[str] = None
    location: Optional[str] = None
    manager_id: Optional[str] = None
    team_id: Optional[str] = None
    department_id: Optional[str] = None
    branch_id: Optional[str] = None


class EmployeeResponse(BaseModel):
    """Schema for employee data returned in responses."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: Optional[str]
    employee_code: Optional[str]
    full_name: str
    email: str
    phone: Optional[str]
    role: EmployeeRole
    designation: Optional[str]
    location: Optional[str]
    manager_id: Optional[str]
    team_id: Optional[str]
    department_id: Optional[str]
    branch_id: Optional[str]


class MessageResponse(BaseModel):
    """Schema for simple message responses."""

    message: str

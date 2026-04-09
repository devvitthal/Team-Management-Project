"""
Organization Service: Pydantic schemas for branches, departments, and teams.
"""

from typing import Optional
from pydantic import BaseModel, ConfigDict


class BranchCreateRequest(BaseModel):
    """Schema for creating a new branch."""
    name: str
    location: Optional[str] = None
    org_leader_id: Optional[str] = None


class BranchUpdateRequest(BaseModel):
    """Schema for updating an existing branch."""
    name: Optional[str] = None
    location: Optional[str] = None
    org_leader_id: Optional[str] = None


class BranchResponse(BaseModel):
    """Schema for branch data returned in responses."""
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    location: Optional[str]
    org_leader_id: Optional[str]


class DepartmentCreateRequest(BaseModel):
    """Schema for creating a new department."""
    name: str
    branch_id: str
    manager_id: Optional[str] = None


class DepartmentUpdateRequest(BaseModel):
    """Schema for updating an existing department."""
    name: Optional[str] = None
    manager_id: Optional[str] = None


class DepartmentResponse(BaseModel):
    """Schema for department data returned in responses."""
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    branch_id: str
    manager_id: Optional[str]


class TeamCreateRequest(BaseModel):
    """Schema for creating a new team."""
    name: str
    department_id: str
    team_lead_id: Optional[str] = None
    location: Optional[str] = None


class TeamUpdateRequest(BaseModel):
    """Schema for updating an existing team."""
    name: Optional[str] = None
    team_lead_id: Optional[str] = None
    location: Optional[str] = None


class TeamResponse(BaseModel):
    """Schema for team data returned in responses."""
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    department_id: str
    team_lead_id: Optional[str]
    location: Optional[str]


class OrgLeaderTeamsResponse(BaseModel):
    """Schema for org-leader to reporting-teams analytics (Q7)."""

    model_config = ConfigDict(from_attributes=True)

    branch_id: str
    branch_name: str
    org_leader_id: Optional[str]
    branch_location: Optional[str]
    department_count: int
    team_count: int


class MessageResponse(BaseModel):
    """Schema for simple message responses."""
    message: str

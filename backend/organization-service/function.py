"""Organization Service: CRUD for branches, departments, and teams."""

import os
from mangum import Mangum
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import engine, get_db, Base
from deps import get_current_user, require_roles
from models import Branch, Department, Team
from schemas import (
    BranchCreateRequest, BranchUpdateRequest, BranchResponse,
    DepartmentCreateRequest, DepartmentUpdateRequest, DepartmentResponse,
    TeamCreateRequest, TeamUpdateRequest, TeamResponse,
    MessageResponse, OrgLeaderTeamsResponse,
)

app = FastAPI(
    title="Organization Service",
    description="Organizational hierarchy management for the Team Management System",
    version="1.0.0",
    root_path=os.getenv("ROOT_PATH", ""),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)


WRITER_ROLES = ["admin", "org_leader", "manager"]


@app.get("/health", response_model=MessageResponse)
def health_check():
    """Health check endpoint."""
    return {"message": "Organization service is running"}


# Branches

@app.post("/branches", response_model=BranchResponse, status_code=status.HTTP_201_CREATED)
def create_branch(payload: BranchCreateRequest, db: Session = Depends(get_db), _: dict = Depends(require_roles(WRITER_ROLES))):
    """Create a new organizational branch."""
    branch = Branch(name=payload.name, location=payload.location, org_leader_id=payload.org_leader_id)
    db.add(branch)
    db.commit()
    db.refresh(branch)
    return _branch_to_response(branch)


@app.get("/branches", response_model=list[BranchResponse])
def list_branches(db: Session = Depends(get_db), _: dict = Depends(get_current_user)):
    """List all branches."""
    return [_branch_to_response(b) for b in db.query(Branch).order_by(Branch.name).all()]


@app.get("/branches/{branch_id}", response_model=BranchResponse)
def get_branch(branch_id: str, db: Session = Depends(get_db), _: dict = Depends(get_current_user)):
    """Retrieve a single branch by ID."""
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found")
    return _branch_to_response(branch)


@app.put("/branches/{branch_id}", response_model=BranchResponse)
def update_branch(branch_id: str, payload: BranchUpdateRequest, db: Session = Depends(get_db), _: dict = Depends(require_roles(WRITER_ROLES))):
    """Update an existing branch."""
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(branch, field, value)
    db.commit()
    db.refresh(branch)
    return _branch_to_response(branch)


@app.delete("/branches/{branch_id}", response_model=MessageResponse)
def delete_branch(branch_id: str, db: Session = Depends(get_db), _: dict = Depends(require_roles(WRITER_ROLES))):
    """Delete a branch and all its child departments and teams."""
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found")
    db.delete(branch)
    db.commit()
    return {"message": "Branch deleted successfully"}


# Departments

@app.post("/departments", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(payload: DepartmentCreateRequest, db: Session = Depends(get_db), _: dict = Depends(require_roles(WRITER_ROLES))):
    """Create a new department within a branch."""
    branch = db.query(Branch).filter(Branch.id == payload.branch_id).first()
    if not branch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found")
    dept = Department(name=payload.name, branch_id=payload.branch_id, manager_id=payload.manager_id)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return _dept_to_response(dept)


@app.get("/departments", response_model=list[DepartmentResponse])
def list_departments(branch_id: str = "", db: Session = Depends(get_db), _: dict = Depends(get_current_user)):
    """List all departments, optionally filtered by branch."""
    query = db.query(Department)
    if branch_id:
        query = query.filter(Department.branch_id == branch_id)
    return [_dept_to_response(d) for d in query.order_by(Department.name).all()]


@app.get("/departments/{dept_id}", response_model=DepartmentResponse)
def get_department(dept_id: str, db: Session = Depends(get_db), _: dict = Depends(get_current_user)):
    """Retrieve a single department by ID."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    return _dept_to_response(dept)


@app.put("/departments/{dept_id}", response_model=DepartmentResponse)
def update_department(dept_id: str, payload: DepartmentUpdateRequest, db: Session = Depends(get_db), _: dict = Depends(require_roles(WRITER_ROLES))):
    """Update an existing department."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(dept, field, value)
    db.commit()
    db.refresh(dept)
    return _dept_to_response(dept)


@app.delete("/departments/{dept_id}", response_model=MessageResponse)
def delete_department(dept_id: str, db: Session = Depends(get_db), _: dict = Depends(require_roles(WRITER_ROLES))):
    """Delete a department and all its child teams."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    db.delete(dept)
    db.commit()
    return {"message": "Department deleted successfully"}


# Teams

@app.post("/teams", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
def create_team(payload: TeamCreateRequest, db: Session = Depends(get_db), _: dict = Depends(require_roles(WRITER_ROLES))):
    """Create a new team within a department."""
    dept = db.query(Department).filter(Department.id == payload.department_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    team = Team(
        name=payload.name,
        department_id=payload.department_id,
        team_lead_id=payload.team_lead_id,
        location=payload.location,
    )
    db.add(team)
    db.commit()
    db.refresh(team)
    return _team_to_response(team)


@app.get("/teams", response_model=list[TeamResponse])
def list_teams(department_id: str = "", db: Session = Depends(get_db), _: dict = Depends(get_current_user)):
    """List all teams, optionally filtered by department."""
    query = db.query(Team)
    if department_id:
        query = query.filter(Team.department_id == department_id)
    return [_team_to_response(t) for t in query.order_by(Team.name).all()]


@app.get("/teams/{team_id}", response_model=TeamResponse)
def get_team(team_id: str, db: Session = Depends(get_db), _: dict = Depends(get_current_user)):
    """Retrieve a single team by ID."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    return _team_to_response(team)


@app.put("/teams/{team_id}", response_model=TeamResponse)
def update_team(team_id: str, payload: TeamUpdateRequest, db: Session = Depends(get_db), _: dict = Depends(require_roles(WRITER_ROLES))):
    """Update an existing team."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(team, field, value)
    db.commit()
    db.refresh(team)
    return _team_to_response(team)


@app.delete("/teams/{team_id}", response_model=MessageResponse)
def delete_team(team_id: str, db: Session = Depends(get_db), _: dict = Depends(require_roles(WRITER_ROLES))):
    """Delete a team."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    db.delete(team)
    db.commit()
    return {"message": "Team deleted successfully"}


# Analytics

@app.get("/analytics/org-leader-teams", response_model=list[OrgLeaderTeamsResponse])
def get_org_leader_teams(db: Session = Depends(get_db), _: dict = Depends(get_current_user)):
    """Return team and department counts grouped by branch/org leader."""
    branches = db.query(Branch).order_by(Branch.name).all()
    result = []
    for branch in branches:
        dept_count: int = (
            db.query(func.count(Department.id))
            .filter(Department.branch_id == branch.id)
            .scalar()
            or 0
        )
        team_count: int = (
            db.query(func.count(Team.id))
            .join(Department, Team.department_id == Department.id)
            .filter(Department.branch_id == branch.id)
            .scalar()
            or 0
        )
        result.append(
            OrgLeaderTeamsResponse(
                branch_id=str(branch.id),
                branch_name=branch.name,
                org_leader_id=branch.org_leader_id,
                branch_location=branch.location,
                department_count=dept_count,
                team_count=team_count,
            )
        )
    return result


# Helpers

def _branch_to_response(branch: Branch) -> BranchResponse:
    """Convert a Branch ORM object to a BranchResponse schema."""
    return BranchResponse(
        id=str(branch.id),
        name=branch.name,
        location=branch.location,
        org_leader_id=branch.org_leader_id,
    )


def _dept_to_response(dept: Department) -> DepartmentResponse:
    """Convert a Department ORM object to a DepartmentResponse schema."""
    return DepartmentResponse(
        id=str(dept.id),
        name=dept.name,
        branch_id=str(dept.branch_id),
        manager_id=dept.manager_id,
    )


def _team_to_response(team: Team) -> TeamResponse:
    """Convert a Team ORM object to a TeamResponse schema."""
    return TeamResponse(
        id=str(team.id),
        name=team.name,
        department_id=str(team.department_id),
        team_lead_id=team.team_lead_id,
        location=team.location,
    )


handler = Mangum(app, lifespan="off", api_gateway_base_path=os.getenv("ROOT_PATH", ""))

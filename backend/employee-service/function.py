"""Employee Service: CRUD operations for employee profiles."""

import os
from mangum import Mangum
from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import or_

from database import engine, get_db, Base
from deps import get_current_user, require_roles
from models import Employee
from schemas import EmployeeCreateRequest, EmployeeUpdateRequest, EmployeeResponse, MessageResponse

app = FastAPI(
    title="Employee Service",
    description="Employee profile management for the Team Management System",
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
    return {"message": "Employee service is running"}


@app.post("/employees", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_employee(payload: EmployeeCreateRequest, db: Session = Depends(get_db), _: dict = Depends(require_roles(WRITER_ROLES))):
    """Create a new employee record."""
    existing = db.query(Employee).filter(Employee.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An employee with this email already exists",
        )

    new_employee = Employee(
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
        role=payload.role,
        designation=payload.designation,
        location=payload.location,
        employee_code=payload.employee_code,
        user_id=payload.user_id,
        manager_id=payload.manager_id,
        team_id=payload.team_id,
        department_id=payload.department_id,
        branch_id=payload.branch_id,
    )
    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)
    return _to_response(new_employee)


@app.get("/employees", response_model=list[EmployeeResponse])
def list_employees(
    search: str = Query(default="", description="Search by name or email"),
    role: str = Query(default="", description="Filter by role"),
    department_id: str = Query(default="", description="Filter by department"),
    branch_id: str = Query(default="", description="Filter by branch"),
    location: str = Query(default="", description="Filter by location"),
    team_id: str = Query(default="", description="Filter by team"),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """List employees with optional search and filter parameters."""
    query = db.query(Employee)

    if search:
        query = query.filter(
            or_(
                Employee.full_name.ilike(f"%{search}%"),
                Employee.email.ilike(f"%{search}%"),
                Employee.designation.ilike(f"%{search}%"),
            )
        )
    if role:
        query = query.filter(Employee.role == role)
    if department_id:
        query = query.filter(Employee.department_id == department_id)
    if branch_id:
        query = query.filter(Employee.branch_id == branch_id)
    if location:
        query = query.filter(Employee.location.ilike(f"%{location}%"))
    if team_id:
        query = query.filter(Employee.team_id == team_id)

    return [_to_response(e) for e in query.order_by(Employee.full_name).all()]


@app.get("/employees/{employee_id}", response_model=EmployeeResponse)
def get_employee(employee_id: str, db: Session = Depends(get_db), _: dict = Depends(get_current_user)):
    """Retrieve a single employee by ID."""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return _to_response(employee)


@app.put("/employees/{employee_id}", response_model=EmployeeResponse)
def update_employee(employee_id: str, payload: EmployeeUpdateRequest, db: Session = Depends(get_db), _: dict = Depends(require_roles(WRITER_ROLES))):
    """Update an existing employee record."""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(employee, field, value)

    db.commit()
    db.refresh(employee)
    return _to_response(employee)


@app.delete("/employees/{employee_id}", response_model=MessageResponse)
def delete_employee(employee_id: str, db: Session = Depends(get_db), _: dict = Depends(require_roles(WRITER_ROLES))):
    """Delete an employee record."""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    db.delete(employee)
    db.commit()
    return {"message": "Employee deleted successfully"}


def _to_response(employee: Employee) -> EmployeeResponse:
    """Convert an Employee ORM object to an EmployeeResponse schema."""
    return EmployeeResponse(
        id=str(employee.id),
        user_id=employee.user_id,
        employee_code=employee.employee_code,
        full_name=employee.full_name,
        email=employee.email,
        phone=employee.phone,
        role=employee.role,
        designation=employee.designation,
        location=employee.location,
        manager_id=str(employee.manager_id) if employee.manager_id else None,
        team_id=str(employee.team_id) if employee.team_id else None,
        department_id=str(employee.department_id) if employee.department_id else None,
        branch_id=str(employee.branch_id) if employee.branch_id else None,
    )


handler = Mangum(app, lifespan="off")

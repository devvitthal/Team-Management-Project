"""Validation Service: achievement approval/rejection workflow.

Rules:
  - Reviewer must provide a comment.
  - Reviewer cannot review their own submission.
  - Reviewer must be the correct next hierarchy level.
  - reviewer_id is always taken from the Bearer JWT.
"""

import logging
import os
from typing import Dict, List, Optional
from mangum import Mangum
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import engine, get_db, Base
from deps import get_current_user, require_roles
from models import ValidationRecord, ValidationAction
from schemas import ValidationRequest, ValidationResponse, MessageResponse

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Validation Service",
    description="Achievement review and approval workflow for the Team Management System",
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


REVIEWER_ROLES = ["admin", "org_leader", "manager", "team_lead"]

# Maps submitter role to permitted reviewer roles. admin can always review.
_HIERARCHY: Dict[str, List[str]] = {
    "team_member": ["team_lead", "admin"],
    "team_lead": ["manager", "admin"],
    "manager": ["org_leader", "admin"],
    "org_leader": ["admin"],
}


def _check_hierarchy(reviewer_role: str, submitter_role: Optional[str]) -> None:
    """Raise 403 if reviewer is not the correct next-level approver for submitter_role."""
    if reviewer_role == "admin":
        return  # admin can always review
    if not submitter_role:
        return  # no submitter role provided — skip enforcement
    allowed_reviewers = _HIERARCHY.get(submitter_role, [])
    if reviewer_role not in allowed_reviewers:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Hierarchy violation: a '{submitter_role}' achievement must be "
                f"reviewed by [{', '.join(allowed_reviewers)}], "
                f"not '{reviewer_role}'."
            ),
        )


@app.get("/health", response_model=MessageResponse)
def health_check():
    """Health check endpoint."""
    return {"message": "Validation service is running"}


@app.post("/validations", response_model=ValidationResponse, status_code=status.HTTP_201_CREATED)
def submit_validation(
    payload: ValidationRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(REVIEWER_ROLES)),
):
    """Submit an approval or rejection decision for an achievement."""
    # reviewer identity always from JWT
    reviewer_id: str = current_user["sub"]
    reviewer_name: str = current_user.get("email", reviewer_id)
    reviewer_role: str = current_user.get("role", "")

    # self-review ban
    if payload.submitted_by and reviewer_id == payload.submitted_by:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot approve or reject your own achievement submission.",
        )

    # hierarchy check
    _check_hierarchy(reviewer_role, payload.submitter_role)

    # duplicate final-decision guard
    existing_final = (
        db.query(ValidationRecord)
        .filter(ValidationRecord.achievement_id == payload.achievement_id)
        .filter(ValidationRecord.action.in_([ValidationAction.approved, ValidationAction.rejected]))
        .first()
    )
    if existing_final:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This achievement has already been reviewed and cannot be changed",
        )

    record = ValidationRecord(
        achievement_id=payload.achievement_id,
        reviewer_id=reviewer_id,
        reviewer_name=reviewer_name,
        action=payload.action,
        comment=payload.comment,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    logger.info(
        "Validation recorded: achievement=%s reviewer=%s role=%s action=%s",
        payload.achievement_id,
        reviewer_id,
        reviewer_role,
        payload.action.value,
    )

    return _to_response(record)


@app.get("/validations", response_model=list[ValidationResponse])
def list_validations(
    achievement_id: str = "",
    reviewer_id: str = "",
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """List validation records, optionally filtered by achievement or reviewer."""
    query = db.query(ValidationRecord)
    if achievement_id:
        query = query.filter(ValidationRecord.achievement_id == achievement_id)
    if reviewer_id:
        query = query.filter(ValidationRecord.reviewer_id == reviewer_id)
    return [_to_response(r) for r in query.order_by(ValidationRecord.created_at.desc()).all()]


@app.get("/validations/pending-achievements", response_model=list[str])
def get_pending_achievement_ids(db: Session = Depends(get_db), _: dict = Depends(get_current_user)):
    """Return achievement IDs that have no final validation action."""
    reviewed_ids = {
        r.achievement_id
        for r in db.query(ValidationRecord.achievement_id)
        .filter(ValidationRecord.action.in_([ValidationAction.approved, ValidationAction.rejected]))
        .all()
    }
    all_ids = {r.achievement_id for r in db.query(ValidationRecord.achievement_id).all()}
    return list(all_ids - reviewed_ids)


@app.get("/validations/{validation_id}", response_model=ValidationResponse)
def get_validation(validation_id: str, db: Session = Depends(get_db), _: dict = Depends(get_current_user)):
    """Retrieve a single validation record by ID."""
    record = db.query(ValidationRecord).filter(ValidationRecord.id == validation_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Validation record not found")
    return _to_response(record)


def _to_response(record: ValidationRecord) -> ValidationResponse:
    """Convert a ValidationRecord ORM object to a ValidationResponse schema."""
    return ValidationResponse(
        id=str(record.id),
        achievement_id=record.achievement_id,
        reviewer_id=record.reviewer_id,
        reviewer_name=record.reviewer_name,
        action=record.action,
        comment=record.comment,
        created_at=record.created_at,
    )


handler = Mangum(app, lifespan="off")

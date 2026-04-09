"""Achievement Service: CRUD for employee achievement submissions."""

import os
from mangum import Mangum
from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import engine, get_db, Base
from deps import get_current_user, require_roles
from models import Achievement, AchievementStatus, TeamSummary
from schemas import (
    AchievementCreateRequest, AchievementUpdateRequest, AchievementResponse,
    TeamSummaryCreateRequest, TeamSummaryResponse, MessageResponse,
    TeamMonthlyStatsResponse,
)

app = FastAPI(
    title="Achievement Service",
    description="Achievement submission and tracking for the Team Management System",
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
WRITER_ROLES = ["admin", "org_leader", "manager"]


@app.get("/health", response_model=MessageResponse)
def health_check():
    """Health check endpoint."""
    return {"message": "Achievement service is running"}


@app.post("/achievements", response_model=AchievementResponse, status_code=status.HTTP_201_CREATED)
def create_achievement(payload: AchievementCreateRequest, db: Session = Depends(get_db), _: dict = Depends(get_current_user)):
    """Submit a new individual achievement."""
    achievement = Achievement(
        employee_id=payload.employee_id,
        team_id=payload.team_id,
        title=payload.title,
        description=payload.description,
        month=payload.month,
        year=payload.year,
        submitted_by=payload.submitted_by,
        status=AchievementStatus.pending,
    )
    db.add(achievement)
    db.commit()
    db.refresh(achievement)
    return _to_response(achievement)


@app.get("/achievements", response_model=list[AchievementResponse])
def list_achievements(
    employee_id: str = Query(default="", description="Filter by employee ID"),
    team_id: str = Query(default="", description="Filter by team ID"),
    status_filter: str = Query(default="", alias="status", description="Filter by status"),
    month: int = Query(default=0, description="Filter by month (1-12)"),
    year: int = Query(default=0, description="Filter by year"),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """List achievements with optional filters."""
    query = db.query(Achievement)
    if employee_id:
        query = query.filter(Achievement.employee_id == employee_id)
    if team_id:
        query = query.filter(Achievement.team_id == team_id)
    if status_filter:
        query = query.filter(Achievement.status == status_filter)
    if month:
        query = query.filter(Achievement.month == month)
    if year:
        query = query.filter(Achievement.year == year)
    return [_to_response(a) for a in query.order_by(Achievement.year.desc(), Achievement.month.desc()).all()]


@app.get("/achievements/{achievement_id}", response_model=AchievementResponse)
def get_achievement(achievement_id: str, db: Session = Depends(get_db), _: dict = Depends(get_current_user)):
    """Retrieve a single achievement by ID."""
    achievement = db.query(Achievement).filter(Achievement.id == achievement_id).first()
    if not achievement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Achievement not found")
    return _to_response(achievement)


@app.put("/achievements/{achievement_id}", response_model=AchievementResponse)
def update_achievement(achievement_id: str, payload: AchievementUpdateRequest, db: Session = Depends(get_db), _: dict = Depends(require_roles(REVIEWER_ROLES))):
    """Update a pending achievement record."""
    achievement = db.query(Achievement).filter(Achievement.id == achievement_id).first()
    if not achievement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Achievement not found")
    if achievement.status != AchievementStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending achievements can be edited",
        )
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(achievement, field, value)
    db.commit()
    db.refresh(achievement)
    return _to_response(achievement)


@app.delete("/achievements/{achievement_id}", response_model=MessageResponse)
def delete_achievement(achievement_id: str, db: Session = Depends(get_db), _: dict = Depends(require_roles(WRITER_ROLES))):
    """Delete an achievement record."""
    achievement = db.query(Achievement).filter(Achievement.id == achievement_id).first()
    if not achievement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Achievement not found")
    db.delete(achievement)
    db.commit()
    return {"message": "Achievement deleted successfully"}


@app.patch("/achievements/{achievement_id}/status", response_model=AchievementResponse)
def update_achievement_status(
    achievement_id: str,
    new_status: str,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(REVIEWER_ROLES)),
):
    """Update achievement status. Used internally by Validation Service."""
    achievement = db.query(Achievement).filter(Achievement.id == achievement_id).first()
    if not achievement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Achievement not found")
    try:
        achievement.status = AchievementStatus(new_status)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid status: {new_status}") from exc
    db.commit()
    db.refresh(achievement)
    return _to_response(achievement)


def _to_response(achievement: Achievement) -> AchievementResponse:
    """Convert an Achievement ORM object to an AchievementResponse schema."""
    return AchievementResponse(
        id=str(achievement.id),
        employee_id=achievement.employee_id,
        team_id=achievement.team_id,
        title=achievement.title,
        description=achievement.description,
        month=achievement.month,
        year=achievement.year,
        status=achievement.status,
        submitted_by=achievement.submitted_by,
    )


# Analytics

@app.get("/analytics/team-monthly", response_model=list[TeamMonthlyStatsResponse])
def get_team_monthly_stats(
    year: int = Query(default=0, description="Filter by year (0 = all years)"),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """Return approved achievement counts grouped by team, month, and year."""
    query = (
        db.query(
            Achievement.team_id,
            Achievement.month,
            Achievement.year,
            func.count(Achievement.id).label("approved_count"),
        )
        .filter(Achievement.team_id.isnot(None))
        .filter(Achievement.status == AchievementStatus.approved)
        .group_by(Achievement.team_id, Achievement.month, Achievement.year)
        .order_by(Achievement.year.desc(), Achievement.month.asc())
    )
    if year:
        query = query.filter(Achievement.year == year)
    return [
        TeamMonthlyStatsResponse(
            team_id=str(row.team_id),
            month=row.month,
            year=row.year,
            approved_count=row.approved_count,
        )
        for row in query.all()
    ]


# Team Summaries

TEAM_SUMMARY_WRITER_ROLES = ["admin", "org_leader", "manager", "team_lead"]


@app.post("/achievements/team-summaries", response_model=TeamSummaryResponse, status_code=status.HTTP_201_CREATED)
def create_team_summary(
    payload: TeamSummaryCreateRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(TEAM_SUMMARY_WRITER_ROLES)),
):
    """Create a monthly team summary. Counts approved achievements automatically."""
    existing = (
        db.query(TeamSummary)
        .filter(
            TeamSummary.team_id == payload.team_id,
            TeamSummary.month == payload.month,
            TeamSummary.year == payload.year,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A team summary for this team, month, and year already exists.",
        )

    approved_count = (
        db.query(Achievement)
        .filter(
            Achievement.team_id == payload.team_id,
            Achievement.month == payload.month,
            Achievement.year == payload.year,
            Achievement.status == AchievementStatus.approved,
        )
        .count()
    )

    summary = TeamSummary(
        team_id=payload.team_id,
        month=payload.month,
        year=payload.year,
        title=payload.title,
        summary=payload.summary,
        approved_count=approved_count,
        created_by=current_user.get("sub"),
    )
    db.add(summary)
    db.commit()
    db.refresh(summary)
    return _summary_to_response(summary)


@app.get("/achievements/team-summaries", response_model=list[TeamSummaryResponse])
def list_team_summaries(
    team_id: str = Query(default="", description="Filter by team ID"),
    month: int = Query(default=0, description="Filter by month (1-12)"),
    year: int = Query(default=0, description="Filter by year"),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """List team summaries with optional filters."""
    query = db.query(TeamSummary)
    if team_id:
        query = query.filter(TeamSummary.team_id == team_id)
    if month:
        query = query.filter(TeamSummary.month == month)
    if year:
        query = query.filter(TeamSummary.year == year)
    return [
        _summary_to_response(s)
        for s in query.order_by(TeamSummary.year.desc(), TeamSummary.month.desc()).all()
    ]


@app.get("/achievements/team-summaries/{summary_id}", response_model=TeamSummaryResponse)
def get_team_summary(
    summary_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """Retrieve a single team summary by ID."""
    summary = db.query(TeamSummary).filter(TeamSummary.id == summary_id).first()
    if not summary:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team summary not found")
    return _summary_to_response(summary)


@app.delete("/achievements/team-summaries/{summary_id}", response_model=MessageResponse)
def delete_team_summary(
    summary_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(require_roles(TEAM_SUMMARY_WRITER_ROLES)),
):
    """Delete a team summary record."""
    summary = db.query(TeamSummary).filter(TeamSummary.id == summary_id).first()
    if not summary:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team summary not found")
    db.delete(summary)
    db.commit()
    return {"message": "Team summary deleted successfully"}


def _summary_to_response(summary: TeamSummary) -> TeamSummaryResponse:
    """Convert a TeamSummary ORM object to a TeamSummaryResponse schema."""
    return TeamSummaryResponse(
        id=str(summary.id),
        team_id=summary.team_id,
        month=summary.month,
        year=summary.year,
        title=summary.title,
        summary=summary.summary,
        approved_count=summary.approved_count,
        created_by=summary.created_by,
        created_at=summary.created_at,
    )


handler = Mangum(app, lifespan="off")

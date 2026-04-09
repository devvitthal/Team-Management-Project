"""
Seed script: Populates all database tables with realistic demo data.

Covers: users, employees, branches, departments, teams, achievements,
        team summaries, and validation records.

Run from the backend/ directory:
    python seed_data.py

The script is idempotent — existing rows with the same email / unique keys
are skipped so it is safe to run multiple times.
"""

import os
import sys
import uuid
import random
import logging
from datetime import datetime, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------

try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=Path(__file__).parent / ".env")
except ImportError:
    pass

# ---------------------------------------------------------------------------
# SQLAlchemy setup — single engine shared by all table definitions
# ---------------------------------------------------------------------------

from urllib.parse import quote_plus
from sqlalchemy import (
    create_engine,
    Column, String, Integer, Boolean, Text, DateTime,
    ForeignKey, Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import sessionmaker, DeclarativeBase

import enum
import bcrypt

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger(__name__)

POSTGRES_URL = (
    f"postgresql://{os.getenv('POSTGRES_USER', 'postgres')}"
    f":{quote_plus(os.getenv('POSTGRES_PASS', 'postgres'))}"
    f"@{os.getenv('POSTGRES_HOST', 'localhost')}"
    f":{os.getenv('POSTGRES_PORT', '5432')}"
    f"/{os.getenv('POSTGRES_NAME', 'workshop_db')}"
)

engine = create_engine(POSTGRES_URL, pool_pre_ping=True)
Session = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    """Shared declarative base for all models in this script."""
    pass


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class UserRole(str, enum.Enum):
    admin = "admin"
    org_leader = "org_leader"
    manager = "manager"
    team_lead = "team_lead"
    team_member = "team_member"


class AchievementStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class ValidationAction(str, enum.Enum):
    approved = "approved"
    rejected = "rejected"


# ---------------------------------------------------------------------------
# Models (mirrors each service's models.py)
# ---------------------------------------------------------------------------

def _now() -> datetime:
    """Return current UTC datetime."""
    return datetime.now(timezone.utc)


class User(Base):
    """Auth service users table."""

    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole, name="userrole"), nullable=False, default=UserRole.team_member)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_now)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now)


class Employee(Base):
    """Employee service employees table."""

    __tablename__ = "employees"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(255), nullable=True, index=True)
    employee_code = Column(String(50), unique=True, nullable=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    role = Column(SAEnum(UserRole, name="userrole"), nullable=False, default=UserRole.team_member)
    designation = Column(String(100), nullable=True)
    location = Column(String(255), nullable=True)
    manager_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    team_id = Column(UUID(as_uuid=True), nullable=True)
    department_id = Column(UUID(as_uuid=True), nullable=True)
    branch_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_now)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now)


class Branch(Base):
    """Organization service branches table."""

    __tablename__ = "branches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    org_leader_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_now)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now)


class Department(Base):
    """Organization service departments table."""

    __tablename__ = "departments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    branch_id = Column(UUID(as_uuid=True), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)
    manager_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_now)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now)


class Team(Base):
    """Organization service teams table."""

    __tablename__ = "teams"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    team_lead_id = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_now)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now)


class Achievement(Base):
    """Achievement service achievements table."""

    __tablename__ = "achievements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(String(255), nullable=False, index=True)
    team_id = Column(String(255), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(String(2000), nullable=True)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    status = Column(SAEnum(AchievementStatus, name="achievementstatus"), nullable=False, default=AchievementStatus.pending)
    submitted_by = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_now)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now)


class TeamSummary(Base):
    """Achievement service team_summaries table."""

    __tablename__ = "team_summaries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(String(255), nullable=False, index=True)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    summary = Column(Text, nullable=True)
    approved_count = Column(Integer, nullable=False, default=0)
    created_by = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_now)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now)


class ValidationRecord(Base):
    """Validation service validation_records table."""

    __tablename__ = "validation_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    achievement_id = Column(String(255), nullable=False, index=True)
    reviewer_id = Column(String(255), nullable=False, index=True)
    reviewer_name = Column(String(255), nullable=True)
    action = Column(SAEnum(ValidationAction, name="validationaction"), nullable=False)
    comment = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_now)


# ---------------------------------------------------------------------------
# Reference data
# ---------------------------------------------------------------------------

DEFAULT_PASSWORD = "Workshop@123"

LOCATIONS = ["New York", "London", "Singapore", "Sydney", "Toronto",
             "Berlin", "Dubai", "Tokyo", "Chicago", "Austin"]

BRANCH_DATA = [
    {"name": "Americas HQ",     "location": "New York"},
    {"name": "EMEA HQ",         "location": "London"},
    {"name": "APAC HQ",         "location": "Singapore"},
    {"name": "Pacific Branch",  "location": "Sydney"},
    {"name": "Canada Branch",   "location": "Toronto"},
]

DEPARTMENT_NAMES = [
    "Engineering", "Product", "Data & Analytics", "Finance",
    "Risk & Compliance", "Operations", "Human Resources", "Marketing",
]

TEAM_SUFFIXES = [
    "Alpha", "Beta", "Gamma", "Delta", "Epsilon",
    "Omega", "Phoenix", "Titan", "Nova", "Apex",
]

FIRST_NAMES = [
    "Alice", "Bob", "Carol", "David", "Eva", "Frank", "Grace", "Henry",
    "Iris", "Jack", "Karen", "Leo", "Maya", "Nathan", "Olivia", "Paul",
    "Quinn", "Rachel", "Sam", "Tina", "Uma", "Victor", "Wendy", "Xavier",
    "Yara", "Zach", "Amelia", "Ben", "Charlotte", "Daniel", "Emily",
    "Finn", "Georgia", "Hugo", "Isla", "James", "Kylie", "Liam", "Mia",
    "Noah", "Phoebe", "Ryan", "Sofia", "Tom", "Ursula", "Violet", "Will",
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
    "Davis", "Wilson", "Taylor", "Anderson", "Thomas", "Jackson", "White",
    "Harris", "Martin", "Thompson", "Robinson", "Clark", "Lewis", "Lee",
    "Walker", "Hall", "Allen", "Young", "Hernandez", "King", "Wright",
    "Scott", "Green", "Baker", "Adams", "Nelson", "Carter", "Mitchell",
]

DESIGNATIONS = {
    UserRole.admin:       "System Administrator",
    UserRole.org_leader:  "Chief Executive Officer",
    UserRole.manager:     "Senior Manager",
    UserRole.team_lead:   "Technical Lead",
    UserRole.team_member: "Associate",
}

ACHIEVEMENT_TITLES = [
    "Delivered ahead of schedule",
    "Reduced latency by 40%",
    "Onboarded 3 new clients",
    "Automated manual reporting process",
    "Improved test coverage to 85%",
    "Led cross-team knowledge sharing session",
    "Resolved critical production incident",
    "Mentored two junior engineers",
    "Presented quarterly roadmap to executives",
    "Completed security audit with zero findings",
    "Launched new data pipeline",
    "Negotiated cost savings of $50k",
    "Achieved 99.9% uptime for the quarter",
    "Implemented CI/CD workflow",
    "Documented entire API surface",
    "Completed advanced certification",
    "Established disaster recovery runbook",
    "Rolled out accessibility improvements",
    "Cut deployment time by 60%",
    "Integrated third-party payment provider",
]

ACHIEVEMENT_DESCS = [
    "Delivered the project two weeks ahead of the planned deadline, enabling early go-live.",
    "Optimised database queries and added caching, reducing p99 latency from 800 ms to 480 ms.",
    "Successfully onboarded new enterprise clients and provided full training.",
    "Replaced manual weekly reports with a fully automated dashboard, saving 6 hours per week.",
    "Added comprehensive unit and integration tests, raising coverage from 45% to 85%.",
    "Organised monthly tech talks and documentation sprints across three departments.",
    "Led the incident response, identified root cause, and deployed a fix within SLA.",
    "Ran structured mentoring sessions and pair-programming to upskill junior teammates.",
    "Prepared and delivered the Q-roadmap deep-dive to C-suite and board members.",
    "Completed the annual security audit with no critical or high-severity findings.",
]

VALIDATION_COMMENTS_APPROVE = [
    "Excellent work, clearly impactful.",
    "Well documented and measurable outcome.",
    "Strong contribution to the team goals.",
    "Approved — outstanding effort this month.",
    "Meets all criteria for approval.",
]

VALIDATION_COMMENTS_REJECT = [
    "Insufficient detail provided, please resubmit with metrics.",
    "Duplicate of last month's submission.",
    "Does not meet the achievement criteria.",
    "Needs more supporting evidence.",
]


# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------

def _hash(plain: str) -> str:
    """Hash a plain-text password with bcrypt."""
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def _uid() -> uuid.UUID:
    """Generate a new UUID4."""
    return uuid.uuid4()


def _unique_name(used: set[str], first_names: list[str], last_names: list[str]) -> str:
    """Return a unique full name not present in `used`."""
    for _ in range(1000):
        name = f"{random.choice(first_names)} {random.choice(last_names)}"
        if name not in used:
            used.add(name)
            return name
    raise RuntimeError("Could not generate a unique name after 1000 attempts.")


def _slug(name: str) -> str:
    """Convert a name to a lowercase email-safe slug."""
    return name.lower().replace(" ", ".").replace("'", "")


# ---------------------------------------------------------------------------
# Main seed routine
# ---------------------------------------------------------------------------

def seed() -> None:
    """Seed all tables. Skips rows that already exist (idempotent)."""
    Base.metadata.create_all(bind=engine)
    db = Session()

    try:
        _seed_all(db)
        db.commit()
        log.info("✅  Seeding complete.")
    except Exception:
        db.rollback()
        log.exception("Seeding failed — rolled back.")
        sys.exit(1)
    finally:
        db.close()


def _seed_all(db) -> None:
    """Orchestrate seeding in dependency order."""
    password_hash = _hash(DEFAULT_PASSWORD)
    used_names: set[str] = set()
    used_emails: set[str] = set()

    # ── 1. Admin user ────────────────────────────────────────────────────────
    admin_user = _upsert_user(db, "admin@acme.com", "Admin User",
                               password_hash, UserRole.admin, used_emails)
    log.info("Admin user: admin@acme.com / %s", DEFAULT_PASSWORD)

    # ── 2. Org leaders (one per branch) ─────────────────────────────────────
    org_leader_users = []
    for i, bd in enumerate(BRANCH_DATA):
        name = _unique_name(used_names, FIRST_NAMES, LAST_NAMES)
        email = f"org.leader{i+1}@acme.com"
        u = _upsert_user(db, email, name, password_hash, UserRole.org_leader, used_emails)
        org_leader_users.append(u)

    db.flush()

    # ── 3. Org leader employee records ──────────────────────────────────────
    org_leader_emps = []
    for i, (bd, u) in enumerate(zip(BRANCH_DATA, org_leader_users)):
        emp = _upsert_employee(
            db, u, code=f"OL{i+1:03d}", role=UserRole.org_leader,
            location=bd["location"], designation=DESIGNATIONS[UserRole.org_leader],
        )
        org_leader_emps.append(emp)

    db.flush()

    # ── 4. Branches ──────────────────────────────────────────────────────────
    branches = []
    for bd, leader_emp in zip(BRANCH_DATA, org_leader_emps):
        b = db.query(Branch).filter_by(name=bd["name"]).first()
        if not b:
            b = Branch(id=_uid(), name=bd["name"], location=bd["location"],
                       org_leader_id=str(leader_emp.id))
            db.add(b)
        else:
            b.org_leader_id = str(leader_emp.id)
        branches.append(b)

    db.flush()

    # Update employee branch linkage for org leaders
    for emp, branch in zip(org_leader_emps, branches):
        emp.branch_id = branch.id

    db.flush()

    # ── 5. Managers (2 per branch) + Departments (2 per branch) ─────────────
    manager_users: list = []
    departments: list = []
    dept_branch_map: dict = {}   # dept.id -> branch

    dept_counter = 0
    mgr_counter = 0

    for branch_idx, branch in enumerate(branches):
        branch_depts = []
        for d in range(2):
            dept_counter += 1
            dept_name = DEPARTMENT_NAMES[(branch_idx * 2 + d) % len(DEPARTMENT_NAMES)]

            # Manager for this department
            mgr_counter += 1
            name = _unique_name(used_names, FIRST_NAMES, LAST_NAMES)
            email = f"manager{mgr_counter}@acme.com"
            mu = _upsert_user(db, email, name, password_hash, UserRole.manager, used_emails)
            manager_users.append(mu)
            db.flush()

            mgr_emp = _upsert_employee(
                db, mu, code=f"MG{mgr_counter:03d}", role=UserRole.manager,
                location=branch.location,
                designation=DESIGNATIONS[UserRole.manager],
                branch_id=branch.id,
                manager_id=org_leader_emps[branch_idx].id,
            )
            db.flush()

            dept = db.query(Department).filter_by(name=dept_name, branch_id=branch.id).first()
            if not dept:
                dept = Department(id=_uid(), name=dept_name, branch_id=branch.id,
                                  manager_id=str(mgr_emp.id))
                db.add(dept)
            else:
                dept.manager_id = str(mgr_emp.id)
            db.flush()

            mgr_emp.department_id = dept.id
            branch_depts.append(dept)
            dept_branch_map[dept.id] = branch

        departments.extend(branch_depts)

    db.flush()

    # ── 6. Teams (3 per department) + Team Leads ────────────────────────────
    teams: list = []
    team_lead_emps: list = []
    tl_counter = 0

    # Some team leads will be placed in a DIFFERENT location to satisfy Q4
    cross_location_indices = {0, 3, 6}   # teams at these indices get a cross-location lead

    for dept_idx, dept in enumerate(departments):
        branch = dept_branch_map[dept.id]
        for t in range(3):
            tl_counter += 1
            name = _unique_name(used_names, FIRST_NAMES, LAST_NAMES)
            email = f"tl{tl_counter}@acme.com"
            tu = _upsert_user(db, email, name, password_hash, UserRole.team_lead, used_emails)
            db.flush()

            global_team_idx = dept_idx * 3 + t
            # Cross-location: pick a city different from the branch location
            if global_team_idx in cross_location_indices:
                tl_location = random.choice(
                    [loc for loc in LOCATIONS if loc != branch.location]
                )
            else:
                tl_location = branch.location

            tl_emp = _upsert_employee(
                db, tu, code=f"TL{tl_counter:03d}", role=UserRole.team_lead,
                location=tl_location,
                designation=DESIGNATIONS[UserRole.team_lead],
                branch_id=branch.id,
                department_id=dept.id,
            )
            db.flush()
            team_lead_emps.append(tl_emp)

            team_location = branch.location
            team_name = f"{dept.name} {TEAM_SUFFIXES[t % len(TEAM_SUFFIXES)]}"
            team = db.query(Team).filter_by(name=team_name, department_id=dept.id).first()
            if not team:
                team = Team(id=_uid(), name=team_name, department_id=dept.id,
                            team_lead_id=str(tl_emp.id), location=team_location)
                db.add(team)
            else:
                team.team_lead_id = str(tl_emp.id)
                team.location = team_location
            db.flush()

            tl_emp.team_id = team.id
            teams.append(team)

    db.flush()

    # ── 7. Two managers acting as team leads (satisfies Q5) ─────────────────
    # Replace lead on teams[1] and teams[10] with a manager-role employee
    non_direct_lead_teams = [teams[1], teams[10]] if len(teams) > 10 else [teams[0]]
    non_direct_lead_emps = []
    ndl_counter = 0

    for ndl_team in non_direct_lead_teams:
        ndl_counter += 1
        name = _unique_name(used_names, FIRST_NAMES, LAST_NAMES)
        email = f"mgr.lead{ndl_counter}@acme.com"
        nu = _upsert_user(db, email, name, password_hash, UserRole.manager, used_emails)
        db.flush()
        dept = db.query(Department).filter_by(id=ndl_team.department_id).first()
        branch = dept_branch_map[dept.id] if dept else branches[0]
        ndl_emp = _upsert_employee(
            db, nu, code=f"NDL{ndl_counter:03d}", role=UserRole.manager,
            location=branch.location,
            designation="Manager / Acting Team Lead",
            branch_id=branch.id,
            department_id=dept.id if dept else None,
            team_id=ndl_team.id,
        )
        db.flush()
        ndl_team.team_lead_id = str(ndl_emp.id)
        non_direct_lead_emps.append(ndl_emp)

    db.flush()

    # ── 8. Team members (5–8 per team) ──────────────────────────────────────
    member_emps: list = []
    mem_counter = 0

    for team in teams:
        dept = db.query(Department).filter_by(id=team.department_id).first()
        branch = dept_branch_map[dept.id] if dept else branches[0]
        count = random.randint(5, 8)

        for _ in range(count):
            mem_counter += 1
            name = _unique_name(used_names, FIRST_NAMES, LAST_NAMES)
            email = f"emp{mem_counter:04d}@acme.com"
            mu = _upsert_user(db, email, name, password_hash, UserRole.team_member, used_emails)
            db.flush()

            # A few members in Q6-trigger teams get manager role to push ratio >20%
            role = UserRole.team_member
            if team.id == teams[2].id and mem_counter % 3 == 0:
                role = UserRole.manager
                mu.role = role
                db.flush()

            mem_emp = _upsert_employee(
                db, mu, code=f"EM{mem_counter:04d}", role=role,
                location=branch.location,
                designation=DESIGNATIONS[role],
                branch_id=branch.id,
                department_id=dept.id if dept else None,
                team_id=team.id,
            )
            db.flush()
            member_emps.append(mem_emp)

    db.flush()

    # Collect all employees that can submit achievements
    all_submitters = member_emps + team_lead_emps

    # Collect reviewer pool (team leads + managers)
    all_reviewers = team_lead_emps + [
        db.query(Employee).filter_by(user_id=str(u.id)).first()
        for u in manager_users
        if db.query(Employee).filter_by(user_id=str(u.id)).first()
    ]
    all_reviewers = [r for r in all_reviewers if r]

    # ── 9. Achievements (3–6 per employee, spread across months) ────────────
    current_year = datetime.now().year
    prev_year = current_year - 1
    achievements: list = []

    for emp in all_submitters:
        count = random.randint(3, 6)
        months_used: set = set()
        for _ in range(count):
            year = random.choice([current_year, current_year, prev_year])
            month = random.randint(1, 12)
            while (year, month) in months_used:
                month = random.randint(1, 12)
            months_used.add((year, month))

            title = random.choice(ACHIEVEMENT_TITLES)
            desc = random.choice(ACHIEVEMENT_DESCS)
            status = random.choices(
                [AchievementStatus.approved, AchievementStatus.rejected, AchievementStatus.pending],
                weights=[60, 15, 25],
            )[0]

            ach = Achievement(
                id=_uid(),
                employee_id=str(emp.id),
                team_id=str(emp.team_id) if emp.team_id else None,
                title=title,
                description=desc,
                month=month,
                year=year,
                status=status,
                submitted_by=str(emp.id),
            )
            db.add(ach)
            achievements.append(ach)

    db.flush()

    # ── 10. Validation records for approved / rejected achievements ──────────
    for ach in achievements:
        if ach.status in (AchievementStatus.approved, AchievementStatus.rejected):
            reviewer = random.choice(all_reviewers)
            if reviewer.id == uuid.UUID(ach.employee_id):
                # avoid self-review
                candidates = [r for r in all_reviewers if r.id != reviewer.id]
                if candidates:
                    reviewer = random.choice(candidates)

            action = ValidationAction.approved if ach.status == AchievementStatus.approved \
                else ValidationAction.rejected
            comment = random.choice(
                VALIDATION_COMMENTS_APPROVE if action == ValidationAction.approved
                else VALIDATION_COMMENTS_REJECT
            )
            vr = ValidationRecord(
                id=_uid(),
                achievement_id=str(ach.id),
                reviewer_id=str(reviewer.id),
                reviewer_name=reviewer.full_name,
                action=action,
                comment=comment,
            )
            db.add(vr)

    db.flush()

    # ── 11. Team summaries (for current year, months 1–6 per team) ──────────
    for team in teams:
        months_with_data = list({
            ach.month
            for ach in achievements
            if ach.team_id == str(team.id)
            and ach.status == AchievementStatus.approved
            and ach.year == current_year
        })
        for month in months_with_data[:6]:
            existing = db.query(TeamSummary).filter_by(
                team_id=str(team.id), month=month, year=current_year
            ).first()
            if existing:
                continue
            approved_count = sum(
                1 for a in achievements
                if a.team_id == str(team.id)
                and a.month == month
                and a.year == current_year
                and a.status == AchievementStatus.approved
            )
            tl_id = team.team_lead_id
            ts = TeamSummary(
                id=_uid(),
                team_id=str(team.id),
                month=month,
                year=current_year,
                title=f"{team.name} Monthly Summary — {month}/{current_year}",
                summary=f"Monthly rollup for {team.name}. {approved_count} achievements approved.",
                approved_count=approved_count,
                created_by=tl_id,
            )
            db.add(ts)

    db.flush()

    # ── Summary ──────────────────────────────────────────────────────────────
    log.info("Branches:              %d", db.query(Branch).count())
    log.info("Departments:           %d", db.query(Department).count())
    log.info("Teams:                 %d", db.query(Team).count())
    log.info("Users:                 %d", db.query(User).count())
    log.info("Employees:             %d", db.query(Employee).count())
    log.info("Achievements:          %d", db.query(Achievement).count())
    log.info("Validation records:    %d", db.query(ValidationRecord).count())
    log.info("Team summaries:        %d", db.query(TeamSummary).count())
    log.info("Default password for all accounts: %s", DEFAULT_PASSWORD)


# ---------------------------------------------------------------------------
# Helper: upsert a User row
# ---------------------------------------------------------------------------

def _upsert_user(
    db,
    email: str,
    full_name: str,
    password_hash: str,
    role: UserRole,
    used_emails: set,
) -> User:
    """Return existing user or create a new one."""
    if email in used_emails:
        return db.query(User).filter_by(email=email).first()
    used_emails.add(email)
    u = db.query(User).filter_by(email=email).first()
    if not u:
        u = User(id=_uid(), email=email, full_name=full_name,
                 password_hash=password_hash, role=role, is_active=True)
        db.add(u)
    return u


# ---------------------------------------------------------------------------
# Helper: upsert an Employee row
# ---------------------------------------------------------------------------

def _upsert_employee(
    db,
    user: User,
    code: str,
    role: UserRole,
    location: str,
    designation: str,
    branch_id=None,
    department_id=None,
    team_id=None,
    manager_id=None,
) -> Employee:
    """Return existing employee (by email) or create a new one."""
    emp = db.query(Employee).filter_by(email=user.email).first()
    if emp:
        return emp
    emp = Employee(
        id=_uid(),
        user_id=str(user.id),
        employee_code=code,
        full_name=user.full_name,
        email=user.email,
        phone=f"+1-555-{random.randint(1000, 9999)}",
        role=role,
        designation=designation,
        location=location,
        branch_id=branch_id,
        department_id=department_id,
        team_id=team_id,
        manager_id=manager_id,
    )
    db.add(emp)
    return emp


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    seed()

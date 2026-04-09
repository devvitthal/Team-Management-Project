# 🚀 Citi Workshop Project – Detailed Specification (Enhanced)

## 📌 Project Title
**Centralized Team Management & Achievement Analytics System (Microservices-Based)**

---

# 🧠 1. Core Objective
Build a **scalable enterprise-grade system** that:
- Centralizes organizational data across hierarchy levels
- Enables structured tracking of employee and team performance
- Implements approval workflows aligned with corporate hierarchy
- Provides actionable insights and analytics

---

# 🧩 2. Core Features (Must Have)

## 🔐 2.1 Authentication & Authorization
- Signup/Login restricted to **company domain email (e.g., @company.com)**
- JWT-based authentication
- Secure password hashing (bcrypt)
- Role-Based Access Control (RBAC)

### Roles & Permissions:
| Role | Permissions |
|------|------------|
| Admin | Full access |
| Org Leader | View all, approve managers |
| Manager | Manage teams, approve team leads |
| Team Lead | Manage team, approve members |
| Team Member | Submit achievements |

---

## 🏢 2.2 Organizational Hierarchy

### Structure:
Organization → Branch → Department → Team → Members

### Functional Requirements:
- Create/update/delete branches
- Assign organization leader per branch
- Create departments within branches
- Assign managers to departments
- Create teams within departments
- Assign team leaders
- Map employees to teams
- Support cross-location leadership

---

## 👤 2.3 Employee Management
- Add/update/remove employees
- Assign reporting manager (self-referencing hierarchy)
- Assign role and designation
- Store employee location
- Enable employee search

---

## 🏆 2.4 Achievement System

### Individual Achievements:
- Submit achievement with:
  - Title
  - Description
  - Month
  - Optional attachments (bonus feature)
- Status tracking (Pending / Approved / Rejected)

### Team Achievements:
- Team Lead aggregates approved individual achievements
- Monthly summary generation

---

## ✅ 2.5 Validation Workflow

### Workflow Steps:
1. Submission by employee
2. Automatic routing to reviewer (based on hierarchy)
3. Reviewer actions:
   - Approve
   - Reject
4. Mandatory comment required

### Hierarchy Mapping:
- Team Member → Team Lead
- Team Lead → Manager
- Manager → Org Leader

### Rules:
- Cannot approve own achievement
- Timestamp every action
- Maintain validation history

---

## 🔍 2.6 Search & Filtering
- Global search (employees, teams)
- Filters:
  - Role
  - Department
  - Location
  - Status
  - Date range

---

## 📊 2.7 Analytics & Insights

### Required Insights:
- Teams with leader not co-located
- Non-direct staff ratio > 20%
- Teams under each org leader
- Monthly performance trends

### Suggested Visualizations:
- Bar charts (team performance)
- Pie charts (role distribution)
- Line charts (monthly growth)

---

## 📱 2.8 UI/UX Requirements
- Responsive design
- Dashboard-based navigation
- Role-specific views
- Clean and minimal UI

---

# ⭐ 3. Advanced Features (Competitive Edge)

## 🔔 Notifications
- Email or in-app alerts
- Approval/rejection updates

## 📈 Dashboard Enhancements
- Leaderboard of top employees
- Heatmap of performance

## 🧠 Smart Insights
- Detect underperforming teams
- Suggest improvements (basic logic)

## 🧾 Reports
- Export reports (CSV/PDF)

## 🕒 Audit Logs
- Track all user actions

## 📌 Comments History
- Maintain full validation trail

## 📎 Attachments (Optional)
- Upload proof for achievements

---

# 🧱 4. Microservices Architecture

## Services Breakdown:
1. Auth Service
2. Employee Service
3. Organization Service
4. Achievement Service
5. Validation Service
6. Analytics Service (optional)

## API Gateway Responsibilities:
- Central routing
- Authentication validation
- Request aggregation

## Communication:
- REST APIs between services
- Optional event-based (advanced)

---

# ⚙️ 5. Tech Stack

## Frontend:
- React.js
- Material UI
- Axios

## Backend:
- FastAPI (Python)

## Database:
- PostgreSQL (per microservice)

## DevOps:
- Docker
- GitHub

## Deployment:
- AWS (S3, Lambda, API Gateway)

---

# 🧭 6. Enhanced Development Phases

## 🟢 Phase 1: Requirement Analysis & System Design
- Understand problem statement deeply
- Define entities & relationships (ER Diagram)
- Define microservices boundaries
- Create API contracts (Swagger/Postman)
- Design system architecture diagram

Deliverables:
- ER Diagram
- Architecture Diagram
- API Plan

---

## 🟡 Phase 2: Project Setup & Environment
- Setup GitHub repo structure (multi-service)
- Initialize services (FastAPI apps)
- Setup PostgreSQL databases
- Configure Docker (optional early)

Deliverables:
- Base project structure
- Running services locally

---

## 🔵 Phase 3: Core Services Development

### Auth Service:
- Signup/login
- JWT implementation
- Role management

### Employee Service:
- CRUD APIs
- Manager hierarchy

### Organization Service:
- Branch/Dept/Team APIs
- Mapping employees to teams

Deliverables:
- Working APIs
- Postman tested endpoints

---

## 🟣 Phase 4: Achievement & Validation Workflow

### Achievement Service:
- Submit achievements
- Fetch achievements

### Validation Service:
- Approval/rejection APIs
- Comment system

### Integration:
- Connect hierarchy logic
- Ensure correct reviewer routing

Deliverables:
- Full workflow working

---

## 🟠 Phase 5: Frontend Development

Pages:
- Login/Signup
- Dashboard
- Team Management
- Achievement Submission
- Validation Panel

Deliverables:
- Fully functional UI

---

## 🔴 Phase 6: Analytics & Dashboard
- Build queries for insights
- Integrate charts (Recharts)
- Add filters and reports

Deliverables:
- Interactive dashboard

---

## ⚫ Phase 7: Integration & Testing
- Connect frontend with all services
- Test all flows:
  - Login
  - CRUD
  - Validation
- Fix bugs

Deliverables:
- Stable application

---

## 🟤 Phase 8: Deployment & Finalization
- Dockerize services
- Deploy to AWS
- Setup API Gateway
- Final testing

Deliverables:
- Live deployed app

---

# 🏁 7. Final Deliverables
- Working web application
- Microservices architecture
- Deployment link
- Documentation
- Demo-ready system

---

# 🔥 8. Winning Strategy
- Focus on validation workflow demo
- Show hierarchy clearly
- Add at least 1 dashboard
- Keep UI simple but clean
- Ensure smooth end-to-end flow

---

## 💡 Final Note
This is not just a project — it's a **mini enterprise system**.

If executed well, this can outperform most teams 🚀
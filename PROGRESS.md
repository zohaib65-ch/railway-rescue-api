# 🚂 Railway Rescue API — Project Progress Tracker

> **Last Updated:** 2026-08-18
> **Status Legend:** ✅ Done &nbsp;|&nbsp; 🔄 In Progress &nbsp;|&nbsp; ⬜ Not Started &nbsp;|&nbsp; 🔒 Blocked

---

## 📋 Project Scope

The **Railway Rescue** platform connects train operators who need emergency rescue assistance with the teams and resources available to provide it. Operators publish stranded or broken-down train requests; rescue coordinators manage, assign, and resolve them.

### Core Business Rules
- A train number can only exist **once** as an **active** request at any time
- Train numbers are **numeric only**, max **6 digits** (1–999,999)
- Movement type (e.g., `LZ`) is stored **separately** from the train number
- Duplicate checks are enforced **server-side** (both app-layer + DB-layer partial unique index)
- Once a train is `completed` or `cancelled`, its number is available again

### Tech Stack
| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express 5 |
| Database | **PostgreSQL** |
| ORM | **Prisma** |
| Validation | express-validator |
| Logging | morgan |

---

## 📦 Modules Overview

| # | Module | Status | Progress |
|---|---|---|---|
| 1 | 🏗️ Project Setup & Infrastructure | ✅ Done | 6/6 |
| 2 | 🚂 Train Request Management | ✅ Done | 10/10 |
| 3 | 👤 Authentication & Authorization | ✅ Done | 8/8 |
| 4 | 👥 User Management | ✅ Done | 6/6 |
| 5 | 🛠️ Rescue Team Management | ✅ Done | 7/7 |
| 6 | 📋 Assignment & Dispatch | ⬜ Not Started | 0/5 |
| 7 | 🔔 Notifications | ⬜ Not Started | 0/4 |
| 8 | 📊 Reports & Dashboard | ⬜ Not Started | 0/5 |

---

## 1. 🏗️ Project Setup & Infrastructure

### Components
- [x] Express 5 server with `server.js` entry point
- [x] PostgreSQL + Prisma connection (`src/config/database.js`)
- [x] Prisma schema with `Train` and `TrainHistory` models (`prisma/schema.prisma`)
- [x] Global error handler middleware (`src/middleware/errorHandler.js`)
- [x] Standardised JSON response helpers (`src/utils/response.js`)
- [x] CORS, morgan logging, dotenv configured (`src/app.js`)

### APIs
- [x] `GET /health` — Health check endpoint

---

## 2. 🚂 Train Request Management

> Operators publish train rescue requests. The system enforces uniqueness of active train numbers and tracks the full lifecycle of each request.

### Components
- [x] `Train` Prisma model with schema validation (`prisma/schema.prisma`)
- [x] `TrainHistory` Prisma model — immutable audit log of status changes
- [x] Partial unique DB index on `trainNumber` where `status = 'active' AND deletedAt IS NULL`
- [x] `trainService.js` — business logic + two-layer duplicate check + all CRUD operations
- [x] `trainController.js` — HTTP request handlers (all 10 endpoints)
- [x] `validateTrain.js` — input validation (6-digit numeric rule, pagination, search params)
- [x] Train routes wired with all endpoints (`src/routes/trainRoutes.js`)
- [x] Pagination support for `GET /api/trains` (`?page=&limit=`)
- [x] Search/filter by `location`, `trainNumber`, date range (`dateFrom`, `dateTo`)
- [x] Soft-delete support (`deletedAt` field — record retained for audit)

### APIs
- [x] `POST   /api/trains` — Publish a new rescue request *(server-side duplicate check)*
- [x] `GET    /api/trains` — List all requests *(filters: `?status=&movementType=&page=&limit=&dateFrom=&dateTo=`)*
- [x] `GET    /api/trains/active` — List active requests only
- [x] `GET    /api/trains/stats` — Aggregated counts by status & movement type
- [x] `GET    /api/trains/search?q=` — Full-text search across description, location, contactInfo
- [x] `GET    /api/trains/:id` — Get a single request (includes history)
- [x] `GET    /api/trains/:id/history` — Full status-change audit trail
- [x] `PATCH  /api/trains/:id` — Edit request details (movementType, description, contactInfo, location)
- [x] `PATCH  /api/trains/:id/status` — Mark as `completed` or `cancelled`
- [x] `DELETE /api/trains/:id` — Soft-delete (record retained, hidden from queries)

---

## 3. 👤 Authentication & Authorization

> Secure the API with JWT-based authentication. Role-based access control (RBAC) defines what each user type can do.

### Roles
| Role | Description |
|---|---|
| `customer` | Publishes train rescue requests |
| `coordinator` | Manages and dispatches rescue teams |
| `admin` | Full platform access |

### Components
- [x] `User` Prisma model (email, password hash, role, refreshToken)
- [x] Password hashing with `bcrypt`
- [x] JWT access token generation & verification
- [x] Refresh token support
- [x] Auth middleware (`requireAuth`, `requireRole`)
- [x] Password reset flow
- [x] Rate limiting on auth endpoints
- [x] Prisma migration for User table

### APIs
- [x] `POST /api/auth/register` — Register a new user account
- [x] `POST /api/auth/login` — Login and receive JWT tokens
- [x] `POST /api/auth/logout` — Invalidate refresh token
- [x] `POST /api/auth/refresh` — Exchange refresh token for new access token
- [x] `POST /api/auth/forgot-password` — Request a password reset email
- [x] `POST /api/auth/reset-password` — Reset password using token
- [x] `GET  /api/auth/me` — Get current authenticated user profile
- [x] `PATCH /api/auth/me` — Update own profile / change password

---

## 4. 👥 User Management

> Admin-only module to manage platform users.

### Components
- [x] Admin-only route guard middleware
- [x] User listing with filters and pagination
- [x] User deactivation / reactivation logic
- [x] Role assignment

### APIs
- [x] `GET    /api/users` — List all users *(admin only, filter: `?role=&status=`)*
- [x] `GET    /api/users/:id` — Get user details
- [x] `PATCH  /api/users/:id` — Update user info / role
- [x] `PATCH  /api/users/:id/deactivate` — Deactivate a user account
- [x] `PATCH  /api/users/:id/activate` — Reactivate a user account
- [x] `DELETE /api/users/:id` — Permanently remove a user

---

## 5. 🛠️ Rescue Team Management

> Coordinators manage rescue teams and their availability.

### Components
- [x] `RescueTeam` Prisma model (name, members, availability, location)
- [x] Team availability status tracking
- [x] Team capacity / specialisation fields

### APIs
- [x] `POST   /api/rescue-teams` — Create a rescue team
- [x] `GET    /api/rescue-teams` — List all rescue teams *(filter: `?available=true`)*
- [x] `GET    /api/rescue-teams/:id` — Get team details
- [x] `PATCH  /api/rescue-teams/:id` — Update team info
- [x] `PATCH  /api/rescue-teams/:id/availability` — Toggle team availability
- [x] `DELETE /api/rescue-teams/:id` — Remove a team
- [x] `GET    /api/rescue-teams/:id/assignments` — Get assignments for a team

---

## 6. 📋 Assignment & Dispatch

> Coordinators assign rescue teams to active train requests and track progress.

### Components
- [ ] `Assignment` Prisma model (trainId, rescueTeamId, status, assignedAt, notes)
- [ ] Assignment lifecycle: `assigned` → `en-route` → `on-site` → `resolved`
- [ ] Prevent assigning a team that is already on an active assignment

### APIs
- [ ] `POST  /api/assignments` — Assign a rescue team to a train request
- [ ] `GET   /api/assignments` — List all assignments *(filter: `?status=&teamId=`)*
- [ ] `GET   /api/assignments/:id` — Get assignment details
- [ ] `PATCH /api/assignments/:id/status` — Update assignment status
- [ ] `DELETE /api/assignments/:id` — Cancel an assignment

---

## 7. 🔔 Notifications

> Alert relevant parties when key events occur (new request published, team assigned, request resolved).

### Components
- [ ] Notification service (event-driven, triggered by status changes)
- [ ] Email notification support (e.g., via Nodemailer / SendGrid)
- [ ] In-app notification store (per-user unread notifications)
- [ ] Mark-as-read logic

### APIs
- [ ] `GET   /api/notifications` — Get notifications for current user
- [ ] `PATCH /api/notifications/:id/read` — Mark notification as read
- [ ] `PATCH /api/notifications/read-all` — Mark all as read
- [ ] `DELETE /api/notifications/:id` — Delete a notification

---

## 8. 📊 Reports & Dashboard

> Aggregated statistics for coordinators and admins.

### Components
- [ ] Aggregation queries for summary stats
- [ ] Date-range filtering on all report endpoints
- [ ] Export to CSV (optional)

### APIs
- [ ] `GET /api/reports/summary` — Total active / completed / cancelled counts
- [ ] `GET /api/reports/trains` — Train requests over time (daily / weekly / monthly)
- [ ] `GET /api/reports/teams` — Rescue team performance stats
- [ ] `GET /api/reports/resolution-time` — Average time from publish to resolved
- [ ] `GET /api/reports/export` — Export report data as CSV

---

## 🗓️ Milestones

| Milestone | Target | Status |
|---|---|---|
| ✅ M1 — Project scaffold & Infrastructure | Week 1 | Done |
| ✅ M2 — Train Request Management (full) | Week 1 | Done |
| ✅ M3 — Auth & User Management | Week 2 | Done |
| ✅ M4 — Rescue Teams & Assignment | Week 3 | Done |
| ⬜ M5 — Notifications | Week 4 | Not Started |
| ⬜ M6 — Reports & Dashboard | Week 5 | Not Started |
| ⬜ M7 — QA, Security Hardening & Deployment | Week 6 | Not Started |

---

## 🔧 Technical Debt / Known Issues

- [ ] Add unit tests (Jest + Supertest)
- [ ] Add request ID tracing to logs
- [x] Add rate limiting to public endpoints (`express-rate-limit`)
- [ ] Add Helmet.js for HTTP security headers
- [ ] Document API with Swagger / OpenAPI spec
- [ ] Set up CI/CD pipeline

---

*Update checkboxes as features are completed. Use `[x]` for done, `[ ]` for pending.*

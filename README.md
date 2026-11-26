# TaskFlow Pro

Full-stack Agile Project Management SaaS platform built with React, Vite, Express, MongoDB, Mongoose, JWT, bcrypt, and Socket.IO, styled with a monochromatic frosted-glass design system supporting Light and Dark themes.

## Features

- **Authentication & Security**: JWT authentication, bcrypt password hashing, protected routes, profile management, password updates, notification preferences, Zod request validation, Helmet headers, CORS, and API rate limiting.
- **Workspaces & RBAC**: Multi-workspace support, workspace switcher, member invitations by email, role management (`admin`, `project_manager`, `developer`, `tester`), and backend permission enforcement.
- **Projects**: Full CRUD, project keys, status tracking (`active`, `completed`, `archived`), member lists, and real-time completion stats.
- **Issues & Tasks**: Support for `task`, `bug`, `story`, and `epic` types, auto-generated issue keys, priorities (`low`, `medium`, `high`, `critical`), story points, assignees, due dates, labels, search, filtering, sorting, and pagination.
- **Kanban Board**: Drag-and-drop workflow across `To Do`, `In Progress`, `In Review`, and `Done` columns powered by `@dnd-kit`, optimistic UI updates, immediate MongoDB persistence, and real-time Socket.IO sync.
- **Backlog & Sprints**: Unscheduled backlog management, backlog prioritization/reordering, sprint creation/editing/start/completion workflows, completion summaries, and moving items between backlog and sprints.
- **Collaboration & Notifications**: Issue comments with `@mention` detection, own-comment editing, chronological workspace and issue activity logs, real-time Socket.IO notifications, unread badges, and mark-as-read controls.
- **Analytics & Reports**: Real MongoDB aggregations for sprint burndown, weekly productivity, issues by status/priority, project progress, and team workload rendered with Recharts.
- **Additional Pages**: My Tasks, Monthly Calendar, Documents & Specs knowledge base, Team Members directory, Activity Feed, Notifications Inbox, Settings, and System Foundation diagnostics.

## Tech Stack

- **Frontend**: React 18, Vite 6, React Router DOM 7, CSS Modules & Design Tokens, Axios, Socket.IO Client, `@dnd-kit`, Recharts, Framer Motion, Lucide React
- **Backend**: Node.js, Express 4 (ES Modules), Mongoose 8, Socket.IO 4, JSON Web Tokens (`jsonwebtoken`), `bcrypt`, `zod`, `helmet`, `cors`, `morgan`
- **Database**: MongoDB

## Folder Structure

```text
TASK-FLOW/
├── backend/
│   ├── src/
│   │   ├── config/          # env.js, db.js
│   │   ├── controllers/     # auth, workspace, project, issue, sprint, backlog, comment, notification, activity, analytics, document, goal, health
│   │   ├── middleware/      # auth, validate, rateLimiter, errorHandler, notFound
│   │   ├── models/          # User, Workspace, Project, Issue, Sprint, Comment, ActivityLog, Notification, DocumentItem, Goal
│   │   ├── routes/          # Express routers mounted under /api
│   │   ├── services/        # healthService
│   │   ├── sockets/         # Authenticated Socket.IO rooms & handlers
│   │   ├── utils/           # ApiError, asyncHandler, workspaceAuth, activityLogger, notificationService, socketBus, seed
│   │   └── validators/      # Zod validation schemas
│   ├── tests/               # Integration test suite
│   ├── .env.example
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/      # layout (Sidebar, TopNav), dashboard, common, auth, ui
│   │   ├── context/         # AuthContext, WorkspaceContext, ThemeContext
│   │   ├── hooks/           # useAuth, useWorkspace, useTheme, useDashboardData, useHealthCheck
│   │   ├── layouts/         # AppLayout
│   │   ├── pages/           # Login, Register, Dashboard, Projects, Board, Backlog, Sprints, Reports, MyTasks, Calendar, Documents, TeamMembers, Activity, Notifications, Settings, FoundationShell
│   │   ├── services/        # Axios API client, Socket.IO client, domain API services
│   │   └── styles/          # tokens.css, global.css
│   └── .env.example
└── README.md
```

## Installation & Setup

### Prerequisites
- Node.js >= 20
- npm >= 10
- MongoDB (local Community Server or MongoDB Atlas)

### 1. Environment Configuration

Backend (`backend/.env`):
```bash
cd backend
cp .env.example .env
# Edit backend/.env to set your MONGO_URI and a strong JWT_SECRET
```

Frontend (`frontend/.env`, optional — Vite proxies `/api` to `http://localhost:5000` by default):
```bash
cd frontend
cp .env.example .env
```

### 2. Install Dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. Database Setup & Optional Demo Seed

Ensure MongoDB is running on `MONGO_URI` (for example `mongodb://127.0.0.1:27017/taskflow_pro`).

To populate development demo data (optional):
```bash
cd backend
npm run seed
```

Demo seed credentials (only available after running `npm run seed`):
- **Admin**: `alex@taskflow.pro` / `Password123!`
- **Project Manager**: `sam@taskflow.pro` / `Password123!`
- **Developer**: `mia@taskflow.pro` / `Password123!`
- **Tester / QA**: `elena@taskflow.pro` / `Password123!`

### 4. Running the Application

Start Backend (`http://localhost:5000`):
```bash
cd backend
npm run dev
```

Start Frontend (`http://localhost:5173`):
```bash
cd frontend
npm run dev
```

### 5. Linting, Testing & Build

```bash
# Backend lint & integration test (requires MongoDB running)
cd backend
npm run lint
npm test

# Frontend lint & production build
cd ../frontend
npm run lint
npm run build
```

## API Endpoint Overview

| Module | Base Path | Key Endpoints |
|---|---|---|
| Health | `/api/health` | `GET /` |
| Auth | `/api/auth` | `POST /register`, `POST /login`, `POST /logout`, `GET /profile`, `PUT /profile`, `PUT /change-password` |
| Workspaces | `/api/workspaces` | `GET /`, `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id`, `GET /:id/members`, `POST /:id/members`, `PATCH /:id/members/:userId`, `DELETE /:id/members/:userId` |
| Projects | `/api/projects` | `GET /`, `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id`, `GET /stats/:id`, `POST /:id/members`, `DELETE /:id/members/:userId` |
| Issues | `/api/issues` | `GET /`, `POST /`, `GET /my`, `GET /search`, `GET /project/:projectId`, `GET /:id`, `PUT /:id`, `DELETE /:id`, `POST /:id/assign`, `PATCH /:id/status`, `PATCH /:id/priority` |
| Sprints | `/api/sprints` | `GET /`, `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id`, `POST /:id/start`, `POST /:id/complete`, `POST /:id/issues`, `DELETE /:id/issues/:issueId` |
| Backlog | `/api/backlog` | `GET /workspace/:workspaceId`, `GET /project/:projectId`, `POST /move`, `PATCH /reorder/:projectId` |
| Comments | `/api/comments` | `GET /issue/:issueId`, `POST /issue/:issueId`, `PUT /:id`, `DELETE /:id` |
| Notifications | `/api/notifications` | `GET /`, `GET /unread-count`, `PATCH /:id/read`, `PATCH /mark-all-read`, `DELETE /:id` |
| Activity | `/api/activity` | `GET /?workspaceId=...` |
| Analytics | `/api/analytics` | `GET /workspace/:workspaceId`, `GET /project/:projectId` |
| Documents | `/api/documents` | `GET /`, `POST /`, `PUT /:id`, `DELETE /:id` |
| Goals | `/api/goals` | `GET /`, `POST /`, `PATCH /:id/toggle`, `DELETE /:id` |

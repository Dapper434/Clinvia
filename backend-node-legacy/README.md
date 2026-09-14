# TBTrack Backend REST API

[![API Status](https://img.shields.io/badge/API-Active%20Health-46E3B7?style=flat&logo=render)](https://tbtrack-ad20.onrender.com/health)
[![Repository](https://img.shields.io/badge/GitHub-Repository-181717?style=flat&logo=github)](https://github.com/Dapper434/tbtrack)
[![Database](https://img.shields.io/badge/Database-PostgreSQL-336791?style=flat&logo=postgresql)](https://www.postgresql.org/)

A Node.js/Express REST API service connecting to a PostgreSQL database for Tuberculosis (TB) treatment tracking, patient management, dose adherence monitoring, lab results, and contact tracing.

---

## 🚀 Architecture & Features

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: PostgreSQL (Render Postgres, Supabase, Neon, AWS RDS, or Local) with connection pooling (`pg`)
- **Authentication**: Stateless JSON Web Tokens (JWT) with bcrypt password hashing
- **Role-Based Access**: Granular access control for `hospital`, `nurse`, `admin`, and `patient` roles
- **Hosting Target**: [Render](https://render.com) (Native Web Service via `render.yaml`)

---

## 📁 Directory Structure

```
backend/
├── database/
│   ├── schema.sql         # PostgreSQL schema definition
│   └── seed.sql           # Initial health facilities & test data
├── src/
│   ├── config/
│   │   └── db.js          # PostgreSQL connection pool with SSL handling
│   ├── controllers/       # Business logic for all domain entities
│   │   ├── auth.controller.js
│   │   ├── patients.controller.js
│   │   ├── doseLogs.controller.js
│   │   ├── labs.controller.js
│   │   ├── contacts.controller.js
│   │   ├── facilities.controller.js
│   │   ├── dashboard.controller.js
│   │   ├── reports.controller.js
│   │   └── portal.controller.js
│   ├── middleware/        # JWT auth, role validation & global error handling
│   │   ├── auth.js
│   │   └── errorHandler.js
│   ├── routes/            # Express route definitions
│   ├── scripts/
│   │   └── seed.js        # Schema & seed migration runner
│   ├── app.js             # Express application configuration & CORS
│   └── server.js          # Server entrypoint and graceful shutdown
├── render.yaml            # Render Infrastructure-as-Code blueprint
├── package.json
└── .env.example
```

---

## 🛠️ Getting Started Locally

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env` and fill in your details:
```bash
cp .env.example .env
```

```ini
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/tbtrack
JWT_SECRET=your_super_secret_jwt_key_min_32_characters_long
FRONTEND_URL=http://localhost:5173
```

### 3. Initialize Database Schema & Seed Data
```bash
npm run seed
```

### 4. Start the Server
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The API will be live at `http://localhost:5000` with the health check at `http://localhost:5000/health`.

---

## 🌐 Deploying to Render (From Monorepo)

1. Connect your repository (`Dapper434/tbtrack`) on [Render Dashboard](https://dashboard.render.com).
2. Click **New +** -> **Web Service** (or use **Blueprints** with `backend/render.yaml`).
3. Set **Root Directory** to `backend`.
4. Set the environment variables in Render:
   - `DATABASE_URL`: Your PostgreSQL connection string.
   - `JWT_SECRET`: A secure random 32+ character string.
   - `FRONTEND_URL`: Your Vercel frontend URL (e.g. `https://tbtrack.vercel.app`).
5. Render will automatically install dependencies, verify `/health`, and deploy your backend with free SSL!

---

## 📡 API Endpoints Overview

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/health` | Service health status | No |
| `POST` | `/api/auth/register/hospital` | Register hospital / clinical staff | No |
| `POST` | `/api/auth/register/patient` | Register patient portal account | No |
| `POST` | `/api/auth/login` | Log in and receive JWT token | No |
| `GET` | `/api/auth/me` | Fetch active profile | Yes |
| `GET` | `/api/patients` | List/filter patients | Hospital Staff |
| `POST` | `/api/patients` | Register new patient | Hospital Staff |
| `GET` | `/api/patients/:id` | Patient details, labs & dose history | Hospital Staff |
| `PATCH` | `/api/patients/:id` | Update patient record | Hospital Staff |
| `DELETE`| `/api/patients/:id` | Delete patient | Hospital Staff |
| `GET` | `/api/dose-logs` | Query adherence dose logs | Yes |
| `POST` | `/api/dose-logs` | Upsert single or bulk dose records | Yes |
| `GET` | `/api/labs` | Query lab test results | Yes |
| `POST` | `/api/labs` | Record new lab test | Hospital Staff |
| `GET` | `/api/contacts` | Contact tracing registry | Yes |
| `POST` | `/api/contacts` | Add contact for screening | Hospital Staff |
| `GET` | `/api/facilities` | List health facilities | No (Optional) |
| `POST` | `/api/facilities` | Register new facility | Hospital Staff |
| `GET` | `/api/dashboard/stats` | Aggregated analytics & charts | Hospital Staff |
| `GET` | `/api/reports` | Cohort adherence reports | Hospital Staff |
| `GET` | `/api/patient-portal/my-treatment` | Patient's own treatment overview | Patient |
| `POST` | `/api/patient-portal/log-dose` | Patient logs daily dose | Patient |

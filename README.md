# TBTrack — Tuberculosis Case Management & Treatment Adherence Platform

[![Repository](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)](https://github.com/Dapper434/tbtrack)
[![Frontend Deploy](https://img.shields.io/badge/Frontend-Vercel-000000?style=for-the-badge&logo=vercel)](https://vercel.com)
[![Backend Deploy](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render)](https://render.com)

A full-stack platform connecting hospitals and TB patients for daily DOT adherence logging, contact tracing, lab management, GIS mapping, and clinical reporting.

---

## 📁 Repository Structure

```
tbtrack/
├── backend/          # Node.js + Express REST API (PostgreSQL database & JWT auth)
│   ├── database/     # PostgreSQL schema.sql & seed.sql
│   ├── src/          # Controllers, routes, middleware, and database pool
│   ├── render.yaml   # Render deployment configuration
│   └── README.md     # Backend setup & API documentation
│
├── frontend/         # React + Vite + Tailwind CSS + Leaflet web app
│   ├── src/          # Pages, components, API client, and state management
│   ├── vercel.json   # Vercel deployment configuration
│   ├── README.md     # Dedicated frontend documentation
│   └── index.html    # HTML shell with Leaflet styles
│
├── start.sh          # One-click start script for full-stack app
├── PROPOSAL.md       # Project overview and hackathon presentation proposal
└── package.json      # Monorepo runner scripts & workspaces
```

---

## 🚀 Quick Start (Single Command)

To launch the entire platform (Backend API + Frontend UI) with one command:

```bash
./start.sh
```

Or using npm:

```bash
npm start
```

This will automatically configure environment files if missing, start the Express backend on `http://localhost:5000`, and start the Vite frontend on `http://localhost:5173`. Press `Ctrl+C` to stop all services.

---

### Manual Setup & Individual Services

#### 1. Prerequisites

- **Node.js**: v18+
- **PostgreSQL**: Local instance, Render PostgreSQL, Supabase Postgres, or Neon

#### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Configure PORT, DATABASE_URL, and JWT_SECRET in .env

npm install
npm run seed     # Applies database schema and loads sample data
npm run dev      # Starts API server on http://localhost:5000
```

#### 3. Frontend Setup

```bash
cd frontend
cp .env.example .env
# Set VITE_API_URL=http://localhost:5000

npm install
npm run dev      # Starts Vite dev server on http://localhost:5173
```

#### 4. Workspace Scripts

From the repository root:

```bash
npm run dev:backend     # Start backend in development mode
npm run dev:frontend    # Start frontend in development mode
npm run build:frontend  # Build frontend for production
npm run seed:backend    # Seed the PostgreSQL database
```

---

## 🌐 Deployments (Single Monorepo)

Both services are deployed directly from this unified repository (`Dapper434/tbtrack`):
- **Frontend**: Deployed on [Vercel](https://vercel.com) by setting Root Directory to `frontend` with [`frontend/vercel.json`](./frontend/vercel.json).
- **Backend**: Deployed on [Render](https://render.com) by setting Root Directory to `backend` with [`backend/render.yaml`](./backend/render.yaml).

---

## 📄 License

Hackathon / Educational use.

# TBTrack — Tuberculosis Case Management & Treatment Adherence Platform

[![Live App](https://img.shields.io/badge/Live%20App-tbtrack.vercel.app-0d9488?style=for-the-badge&logo=vercel&logoColor=white)](https://tbtrack.vercel.app)
[![API Status](https://img.shields.io/badge/API-Active%20Health-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://tbtrack-ad20.onrender.com/health)
[![GitHub](https://img.shields.io/badge/GitHub-Dapper434%2Ftbtrack-181717?style=for-the-badge&logo=github)](https://github.com/Dapper434/tbtrack)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

**TBTrack** is a modern, unified digital health platform designed to transform Tuberculosis (TB) case management, Directly Observed Therapy (DOT) adherence tracking, contact tracing, and clinical epidemiological surveillance.

---

## 🌟 Key Capabilities

### 🏥 Hospital & Clinician Portal
- **Patient Registry & Case Management**: Manage patient records, diagnostic details, TB classification (Pulmonary vs. Extra-pulmonary), and regimen lines (HRZE, HRE).
- **Daily DOT Adherence Tracking**: Real-time adherence scores, missing-dose alerts, calendar view of dose logs, and risk stratification.
- **Laboratory Result Monitoring**: Track GeneXpert and sputum smear conversion intervals (Baseline, Month 2, Month 5, End of Treatment).
- **Contact Tracing & Exposure Screening**: Register household contacts, monitor screening statuses, and track preventive therapy.
- **Clinical Analytics & Data Export**: Interactive charts for treatment outcomes, monthly case admissions, and one-click CSV export for national reporting.

### 📱 Patient Self-Care Portal
- **Daily Medication Check-In**: One-tap logging for daily medication intake with exact timestamp capture.
- **Adherence Streaks & Progress**: Motivational visual calendar, adherence percentage, and treatment timeline tracking.
- **Side Effect Reporting & Clinic Contact**: Instant access to assigned healthcare facility contact numbers and medical advice.

### 🗺️ GIS Epidemiological Mapping
- **Interactive Cluster Map**: Visual mapping of patient distributions, regional clusters, and healthcare facility locations using Leaflet and OpenStreetMap.

---

## 🏗️ System Architecture

TBTrack is organized as a full-stack monorepo:

```
tbtrack/
├── backend/                  # Node.js & Express REST API
│   ├── database/             # PostgreSQL schema.sql & seed.sql
│   ├── src/
│   │   ├── config/           # Database connection pool (pg) with SSL
│   │   ├── controllers/      # Auth, Patients, Doses, Labs, Contacts, Reports
│   │   ├── middleware/       # JWT auth & centralized error handler
│   │   ├── routes/           # REST API route definitions
│   │   └── server.js         # Express app entrypoint & health endpoints
│   ├── render.yaml           # Infrastructure configuration for Render
│   └── package.json
│
├── frontend/                 # React & Vite Single Page Application
│   ├── src/
│   │   ├── api/              # Axios client with request/response interceptors
│   │   ├── components/       # UI components (Layout, Dashboard, Map, Forms)
│   │   ├── context/          # AuthContext & role-based route guards
│   │   ├── pages/            # Dashboard, Patients, Portal, Map, Reports, Auth
│   │   └── utils/            # Adherence calculators & export helpers
│   ├── vercel.json           # SPA rewrite configuration for Vercel
│   └── package.json
│
├── start.sh                  # One-click startup script for local development
├── PROPOSAL.md               # Project presentation proposal & problem statement
└── package.json              # Monorepo workspaces & runner scripts
```

---

## 💻 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS, React Router v7, Leaflet, Chart.js, Lucide Icons, Axios |
| **Backend** | Node.js, Express, PostgreSQL (`pg` pool), JWT, Bcrypt |
| **Database** | Managed PostgreSQL with automated schema migrations & seed scripts |
| **Hosting** | Vercel (Frontend SPA) & Render (Backend API + Managed Database) |

---

## 🚀 Getting Started (Local Development)

### Quick Start (Single Command)

Run both the backend API and frontend client concurrently:

```bash
./start.sh
```

Or using npm:

```bash
npm start
```

- **Backend API**: `http://localhost:5000`
- **Frontend App**: `http://localhost:5173`
- **Health Check**: `http://localhost:5000/health`

---

### Manual Setup

#### 1. Backend
```bash
cd backend
cp .env.example .env
npm install
npm run seed      # Initializes PostgreSQL schema & demo data
npm run dev       # Starts server on http://localhost:5000
```

#### 2. Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev       # Starts Vite dev server on http://localhost:5173
```

---

## 🌐 Live Production Deployments

- **Web Application**: [https://tbtrack.vercel.app](https://tbtrack.vercel.app)
- **REST API Base URL**: [https://tbtrack-ad20.onrender.com](https://tbtrack-ad20.onrender.com)
- **API Health Endpoint**: [https://tbtrack-ad20.onrender.com/health](https://tbtrack-ad20.onrender.com/health)

---

## 📄 License

Developed for educational and public health hackathon demonstration.

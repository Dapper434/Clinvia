# Clinvia — Hospital Management & TB Care Platform

> **Naming note:** the product is now called **Clinvia** (renamed from TBTrack) since the scope has grown from a single TB tracker into a broader hospital management platform, with TB case management as one module inside it. The on-disk folder and GitHub repo are still named `tbtrack` — renaming those (and the deployed domain) is a separate, deliberate step not yet done, so the links below still point at the old name.

[![Live App](https://img.shields.io/badge/Live%20App-tbtrack.vercel.app-0d9488?style=for-the-badge&logo=vercel&logoColor=white)](https://tbtrack.vercel.app)
[![API Status](https://img.shields.io/badge/API-Active%20Health-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://tbtrack-ad20.onrender.com/health)
[![GitHub](https://img.shields.io/badge/GitHub-Dapper434%2Ftbtrack-181717?style=for-the-badge&logo=github)](https://github.com/Dapper434/tbtrack)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

**Clinvia** is a hospital management platform: hospital-wide admin oversight, staff/RBAC, and patient care coordination, with Tuberculosis (TB) case management, Directly Observed Therapy (DOT) adherence tracking, contact tracing, and clinical epidemiological surveillance as its flagship module.

---

## 🌟 Key Capabilities

### 🛡️ Admin Console
- **Unified hospital sign-in**: Staff and admin accounts share one login page; what each role can do is enforced server-side after login, not by which login form was used.
- **Staff management**: Admins create and list staff/admin accounts. There is no public staff sign-up — accounts only get created from inside the system by an admin.
- **Hospital-wide dashboard**: Patient counts, staff counts, lab result status, dose-log activity, and case trends, styled after a hospital admin console rather than a single-clinic view.

### 🏥 Hospital & Clinician Portal
- **Patient Registry & Case Management**: Manage patient records, diagnostic details, TB classification (Pulmonary vs. Extra-pulmonary), and a free-text regimen field (defaults to HRZE).
- **Daily DOT Adherence Tracking**: Adherence percentage, a 3-day missed-dose alert window, a dose-log calendar, and a binary high-risk flag (<80% adherence). Data is fetched on page load — the dashboard does not update live; refresh to see new entries.
- **Laboratory Result Monitoring**: Record GeneXpert, sputum smear, X-ray, and culture results with a positive/negative/pending outcome. Results are a flat, dated list — they are not yet tagged to treatment-month milestones (Baseline/Month 2/Month 5/End of Treatment).
- **Contact Tracing & Exposure Screening**: Register household contacts and record screening status (negative/referred/confirmed TB). Preventive therapy is not yet tracked.
- **Clinical Analytics & Data Export**: Charts for treatment outcomes (active/completed/lost/died) and monthly case admissions, plus CSV export. Outcome categories are currently custom, not the WHO six-category standard — see `AUDIT.md`.

### 📱 Patient Self-Care Portal
- **Daily Medication Check-In**: One-tap logging for daily medication intake (per-day, not per-dose-event timestamp).
- **Adherence Progress**: Visual calendar and adherence percentage. (A distinct "streak" counter is not yet implemented.)

### 🗺️ GIS Epidemiological Mapping
- **Interactive Cluster Map**: Visual mapping of patient distributions, regional clusters, and healthcare facility locations using Leaflet and OpenStreetMap. (Map data is fetched on page load, not live.)

---

## ⚠️ Current Limitations

This project began as a hackathon build and is being hardened for real use. Two things anyone working on or evaluating this codebase should know right now:

- **Authorization is partially differentiated.** Admin now has real, distinct capabilities (staff management, admin dashboard) that `nurse`/`viewer`/`hospital` accounts don't get — but those three still have identical permissions among themselves (no differentiation), and there is no facility-level data isolation (any hospital-role account can read/write any patient regardless of facility). The `/api/dose-logs` and `/api/contacts`/`/api/labs` endpoints that previously had no role check at all have since been fixed (patients are now server-side restricted to their own dose logs; contacts and labs are hospital-only). **Do not deploy this with real patient data until facility-level isolation is fixed.**
- **No TB/HIV co-infection fields, SMS reminders, DR-TB treatment pathway, audit logging, or consent capture exist yet.** These are tracked as planned work, not implemented features.

A full, evidence-based audit of what's implemented vs. documented vs. planned lives in [`AUDIT.md`](./AUDIT.md) — read that before making claims about what this system does.

---

## 🏗️ System Architecture

Clinvia is organized as a monorepo (the folder itself is still named `tbtrack/` on disk — see the naming note above):

```
tbtrack/
├── backend/                  # Flask + Flask-SQLAlchemy REST API
│   ├── app/
│   │   ├── config.py         # Env-based config, DB URL normalization (SSL, driver)
│   │   ├── extensions.py     # db (SQLAlchemy), migrate (Flask-Migrate)
│   │   ├── models.py         # User, Profile, Facility, Patient, DoseLog, LabResult, Contact
│   │   ├── auth.py           # JWT issue/verify, bcrypt hashing, role-check decorators
│   │   └── routes/           # One blueprint per resource (auth, admin, patients, dose-logs, ...)
│   ├── migrations/           # Alembic schema migration history
│   ├── wsgi.py                # Entrypoint (`app = create_app()`)
│   ├── seed.py                 # Demo facilities/patients/staff/admin for local dev
│   └── requirements.txt
│
├── backend-node-legacy/      # Retired Node/Express + pg implementation, kept for reference
│
├── frontend/                 # React & Vite Single Page Application
│   ├── src/
│   │   ├── api/              # fetch-based client with Authorization header injection
│   │   ├── components/       # UI components (Layout, Dashboard, Map, Forms)
│   │   ├── context/          # AuthContext & role-based route guards
│   │   ├── pages/            # Dashboard, Patients, Portal, Map, Reports, Auth, Admin
│   │   └── utils/            # Adherence calculators & export helpers
│   ├── vercel.json           # SPA rewrite configuration for Vercel
│   └── package.json
│
├── start.sh                  # One-click startup script for local development
├── AUDIT.md                  # Evidence-based audit of implemented vs. documented behavior
├── PROPOSAL.md               # Project presentation proposal & problem statement
└── package.json              # Frontend workspace & runner scripts
```

---

## 💻 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS, React Router v7, Leaflet, Chart.js, Lucide Icons |
| **Backend** | Python, Flask, Flask-SQLAlchemy, Flask-Migrate (Alembic), PyJWT, bcrypt |
| **Database** | PostgreSQL — designed to run against Supabase-hosted Postgres, or any standard `postgresql://` connection (Render, Neon, local) |
| **Hosting** | Vercel (Frontend SPA). Backend/database hosting is being migrated off Render — see note below. |

---

## 🚀 Getting Started (Local Development)

### Quick Start (Single Command)

Run both the backend API and frontend client concurrently:

```bash
./start.sh
```

- **Backend API**: `http://localhost:5000`
- **Frontend App**: `http://localhost:5173`
- **Health Check**: `http://localhost:5000/health`

---

### Manual Setup

#### 1. Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # set DATABASE_URL, JWT_SECRET, FRONTEND_URL
flask db upgrade            # applies migrations, creates all tables
python seed.py               # optional: demo facilities/patients
python wsgi.py                # starts server on http://localhost:5000
```

See [`backend/README.md`](./backend/README.md) for schema migration instructions.

#### 2. Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev       # Starts Vite dev server on http://localhost:5173
```

---

## 🌐 Deployments

The backend was ported from Node/Express to Flask/Flask-SQLAlchemy, and the database is being moved from Render's managed Postgres to Supabase-hosted Postgres. **Neither change has been deployed yet** — this is local-development-only so far.

- **Web Application**: [https://tbtrack.vercel.app](https://tbtrack.vercel.app) — frontend, unaffected by the backend port
- The previously-listed Render API URL still runs the retired Node/Express backend (`backend-node-legacy/`), not the Flask version in this repo. Redeploying the Flask backend (and pointing it at Supabase) is a separate follow-up step.

---

## 📄 License

Developed for educational and public health hackathon demonstration.

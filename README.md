# Clinvia — Hospital Management & TB Care Platform

[![Live App](https://img.shields.io/badge/Live%20App-clinvia--indol.vercel.app-0d9488?style=for-the-badge&logo=vercel&logoColor=white)](https://clinvia-indol.vercel.app)
[![API Status](https://img.shields.io/badge/API-Active%20Health-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://clinvia.onrender.com/health)
[![GitHub](https://img.shields.io/badge/GitHub-Dapper434%2FClinvia-181717?style=for-the-badge&logo=github)](https://github.com/Dapper434/Clinvia)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

Clinvia helps hospitals and clinics manage patient care from one place, with tuberculosis case management, treatment adherence tracking, and epidemiological mapping as its core specialty today — and room to grow into a broader hospital management platform over time.

---

## What it does

### 🛡️ Admin Console
Admins get a bird's-eye view of the hospital: staff accounts, patient counts, lab activity, and case trends. Staff and admin accounts share one login page — what each person can do is enforced by their role after they sign in, not by which form they used. There's no public sign-up for staff; every account is created by an admin.

### 🏥 Hospital & Clinician Portal
- **Patient registry** — diagnostic details, TB classification (pulmonary vs. extra-pulmonary), and treatment regimen tracking.
- **DOT adherence tracking** — daily dose logging, a calendar view, adherence percentages, and an alert when a patient misses doses for 3 days running.
- **Lab results** — GeneXpert, sputum smear, X-ray, and culture results, each with a clear outcome.
- **Contact tracing** — register household contacts and track their screening status.
- **Analytics & export** — charts for treatment outcomes and case trends, plus one-click CSV export for reporting.

### 📱 Patient Portal
Patients check in on their own treatment: a one-tap daily dose log and a visual calendar of their adherence over time.

### 🗺️ GIS Mapping
An interactive map (Leaflet + OpenStreetMap) shows where patients and facilities cluster — useful for spotting regional hotspots.

---

## ⚠️ Known Limitations

Clinvia is still early. A couple of things worth knowing before you rely on it:

- **Facility-level data isolation isn't built yet.** Any hospital-role account (`hospital`, `nurse`, `admin`, `viewer`) can currently read and write any patient's record, regardless of which facility they belong to — and `nurse`/`viewer`/`hospital` share identical permissions with each other. Don't put real patient data in this system until that's fixed.
- **TB/HIV co-infection fields, SMS reminders, a DR-TB treatment pathway, audit logging, and consent capture** aren't built yet — they're on the roadmap.

---

## 🏗️ Architecture

Clinvia is a monorepo:

```
clinvia/
├── backend/                  # Flask + Flask-SQLAlchemy REST API
│   ├── app/
│   │   ├── config.py         # Env-based config, DB URL normalization (SSL, driver)
│   │   ├── extensions.py     # db (SQLAlchemy), migrate (Flask-Migrate)
│   │   ├── models.py         # User, Profile, Facility, Patient, DoseLog, LabResult, Contact
│   │   ├── auth.py           # JWT issue/verify, bcrypt hashing, role-check decorators
│   │   └── routes/           # One blueprint per resource (auth, admin, patients, dose-logs, ...)
│   ├── migrations/           # Alembic schema migration history
│   ├── wsgi.py               # Entrypoint (`app = create_app()`)
│   ├── seed.py                # Demo facilities/patients/staff/admin for local dev
│   └── requirements.txt
│
├── frontend/                 # React & Vite Single Page Application
│   ├── src/
│   │   ├── api/               # fetch-based client with Authorization header injection
│   │   ├── components/        # UI components (Layout, Dashboard, Map, Forms)
│   │   ├── context/            # AuthContext & role-based route guards
│   │   ├── pages/               # Dashboard, Patients, Portal, Map, Reports, Auth, Admin
│   │   └── utils/                # Adherence calculators & export helpers
│   ├── vercel.json           # SPA rewrite configuration for Vercel
│   └── package.json
│
├── start.sh                  # One-click startup script for local development
└── package.json              # Frontend workspace & runner scripts
```

---

## 💻 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS, React Router v7, Leaflet, Chart.js, Lucide Icons |
| **Backend** | Python, Flask, Flask-SQLAlchemy, Flask-Migrate (Alembic), PyJWT, bcrypt |
| **Database** | PostgreSQL, hosted on Supabase |
| **Hosting** | Vercel (frontend), Render (backend) |

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

## 🌐 Live

- **Web Application**: [https://clinvia-indol.vercel.app](https://clinvia-indol.vercel.app)
- **API**: [https://clinvia.onrender.com](https://clinvia.onrender.com)

---

## 📄 License

All rights reserved.

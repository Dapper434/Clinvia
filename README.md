# Clinvia — Hospital Management & TB Care Platform

[![Live App](https://img.shields.io/badge/Live%20App-clinvia--indol.vercel.app-0d9488?style=for-the-badge&logo=vercel&logoColor=white)](https://clinvia-indol.vercel.app)
[![API Status](https://img.shields.io/badge/API-Active%20Health-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://clinvia.onrender.com/health)
[![GitHub](https://img.shields.io/badge/GitHub-Dapper434%2FClinvia-181717?style=for-the-badge&logo=github)](https://github.com/Dapper434/Clinvia)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

Clinvia helps hospitals and clinics manage patient care from one place, with tuberculosis case management, treatment adherence tracking, and epidemiological mapping as its core specialty today — and room to grow into a broader hospital management platform over time.

---

## What it does

Clinvia is a hospital management system with a TB programme built in. Every hospital on Clinvia is its own space: its staff sign in with the hospital's own email domain and only ever see that hospital's patients, beds and schedule.

### 🏥 Running the hospital
- **Dashboard** — who needs attention today (missed TB doses, sputum that hasn't converted, results still pending), today's schedule, the outpatient queue, beds by ward, admissions per week, and TB doses taken vs missed vs still to log.
- **Patients** — search and filter the registry, open any record (dose calendar, medication, labs, files, appointments, admissions, household contacts), register new patients with the next P-code.
- **Appointments** — week view, a live time-slot picker (08:00–15:20, every 40 minutes, weekdays), mark seen or cancel. Doctors on leave can't be booked.
- **Walk-in queue** — urgent patients first, then by arrival; call patients in to a free doctor.
- **Admissions & beds** — bed map by ward, admit into a free bed, discharge (the bed goes to cleaning), mark cleaned beds ready.

### 🫁 TB programme
- **Dose log** — record directly observed doses; doses a patient checked in themselves are filled in and locked.
- **Adherence** — always over the last 30 days, banded ≥80% / 60–79% / <60%.
- **Case map** — TB patients coloured by adherence, with health facilities (Leaflet + OpenStreetMap).
- **Reports & exports** — treatment success, appointment and ward stats, and CSV exports of the registry, TB cohort, appointments and dose log.

### 👥 Who sees what
Staff accounts are created in-house by the hospital's administrator; there's no public staff sign-up. The email domain decides which hospital someone signs in to.

| Role | Sees |
|---|---|
| Network administrator | Every hospital, one at a time or combined; can search people across the network and suspend a hospital |
| Hospital administrator | Everything in their hospital; manages staff, wards and hospital settings |
| Executive (e.g. CEO) | Their hospital's totals, trends and reports — not individual patient records |
| Doctor / clinician | Full clinical records in their hospital; doctors can switch the dashboard to their own patients and schedule |
| Nurse | Records, the dose log, the queue and discharges |
| Receptionist | Registration, bookings and the queue; personal details only, no clinical data |
| Patient | Their own record in the patient portal |

Any hospital can register itself from the welcome page and starts with empty records.

### 📱 Patient portal
Patients check in their daily dose, see their adherence, results, medication and appointments, book appointments, and upload documents. Anything a patient creates is shown in indigo on staff screens. A clinic gives each patient a link code to connect their portal account to their record.

### 🔔 Dose reminders
Patients get a push notification at their dose time, even when Clinvia isn't open, as long as they haven't logged that day's dose. First-line TB medicine is taken once a day on an empty stomach, so the standard reminder time is 7:00 AM; the doctor can pick a different time.

---

## ⚠️ Known Limitations

- **Audit logging, consent capture, TB/HIV co-infection fields, a DR-TB treatment pathway and SMS** aren't built yet.
- Discharged admissions don't keep their historical bed; the walk-in queue holds today only.
- Drug names, doses and regimens in the seeded data are illustrative, not clinical guidance.

---

## 🏗️ Architecture

Clinvia is a monorepo:

```
clinvia/
├── backend/                  # Flask + Flask-SQLAlchemy REST API
│   ├── app/
│   │   ├── config.py         # Env-based config, DB URL normalization (SSL, driver)
│   │   ├── extensions.py     # db (SQLAlchemy), migrate (Flask-Migrate)
│   │   ├── models.py         # Hospitals, users/staff, patients, TB episodes, doses, labs, wards, beds, admissions, appointments, visits, files
│   │   ├── clinical.py       # Adherence, missed streaks, needs-attention list (one place)
│   │   ├── auth.py           # JWT, bcrypt, the role permission table and per-hospital scoping
│   │   └── routes/           # One blueprint per resource (auth, admin, patients, dose-logs, ...)
│   ├── migrations/           # Alembic schema migration history
│   ├── wsgi.py               # Entrypoint (`app = create_app()`)
│   ├── seed/                 # flask seed-network: five hospitals with their own staff and patients
│   ├── tests/                # pytest: tenancy, roles and workflows on a fresh database
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
| **Frontend** | React 19, Vite, Tailwind CSS, React Router v7, Leaflet, Lucide Icons (charts are hand-drawn SVG) |
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
export FLASK_APP=wsgi.py
flask db upgrade            # applies migrations, creates all tables
flask seed-network          # optional: the five seeded hospitals (see below)
python wsgi.py              # starts server on http://localhost:5000
```

See [`backend/README.md`](./backend/README.md) for schema migration instructions.

#### 2. Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev       # Starts Vite dev server on http://localhost:5173
```

#### 3. Seeded hospitals
`flask seed-network` loads five hospitals (Kenyatta, Kiambu, Nakuru, Machakos, Thika), each with its own staff, wards, patients, appointments and walk-ins. Staff sign in at `<hospital>.clinvia.health` (e.g. `amina.hassan@knh.clinvia.health`); the network administrator at `clinvia.health`. Passwords come from `SEED_PASSWORD_*` in `backend/.env` and are never committed.

Re-running it resets only those five hospitals, so hospitals registered in the app keep their data. Dates are relative to the day it runs; re-run it before a presentation so "today" looks current. Take a `pg_dump` before running it against a shared database.

#### 4. Tests
```bash
cd backend && pip install -r requirements-dev.txt
python -m pytest tests      # creates and wipes a local clinvia_test database (TEST_DATABASE_URL)
```

---

### Dose reminders setup (one-time)
Reminders use browser push notifications (free, no SMS provider needed). A GitHub Actions workflow (`.github/workflows/dose-reminders.yml`) wakes the backend every 30 minutes from 5:00 AM to 11:30 PM Nairobi time and asks it to send whatever is due.

1. **Backend environment** (Render): set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CLAIM_EMAIL`, `REMINDER_CRON_SECRET`, and `APP_TIMEZONE=Africa/Nairobi`. For a fresh key pair, run this in `backend/` with the venv active:
   ```bash
   python -c "import base64,secrets;from cryptography.hazmat.primitives.asymmetric import ec;from cryptography.hazmat.primitives import serialization as s;k=ec.generate_private_key(ec.SECP256R1());e=lambda b:base64.urlsafe_b64encode(b).rstrip(b'=').decode();print('VAPID_PUBLIC_KEY='+e(k.public_key().public_bytes(s.Encoding.X962,s.PublicFormat.UncompressedPoint)));print('VAPID_PRIVATE_KEY='+e(k.private_numbers().private_value.to_bytes(32,'big')));print('REMINDER_CRON_SECRET='+secrets.token_urlsafe(32))"
   ```
2. **GitHub repo secrets** (Settings → Secrets and variables → Actions): `CLINVIA_API_URL` (your backend URL, no trailing slash) and `REMINDER_CRON_SECRET` (the same value as on the backend).
3. **Patients** turn reminders on from the Dose Reminders card on *My treatment*. On iPhone, they need to add Clinvia to their Home Screen first (Share → Add to Home Screen) and open it from there. That's an Apple requirement for web push.

To test without waiting for the schedule, open the repo's **Actions** tab → *Dose reminders* → *Run workflow*, or run `flask send-reminders` locally.

## 🌐 Live

- **Web Application**: [https://clinvia-indol.vercel.app](https://clinvia-indol.vercel.app)
- **API**: [https://clinvia.onrender.com](https://clinvia.onrender.com)

---

## 📄 License

All rights reserved.

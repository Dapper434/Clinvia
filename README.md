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
- **Care team** — assign a doctor to each patient; every staff member gets a profile page listing the patients assigned to them.
- **Analytics & export** — charts for treatment outcomes and case trends, plus one-click CSV export for reporting.

### 📱 Patient Portal
Patients check in on their own treatment: a one-tap daily dose log, adherence stats, their lab results, and a visual calendar of their adherence over time. A separate profile page shows their full personal and clinical details along with their assigned doctor.

### 🔔 Dose Reminders
Patients get a push notification on their phone at their dose time, even when Clinvia isn't open, as long as they haven't logged that day's dose yet. Messages are friendly and rotate daily ("Your pills called. They miss you. 💊"). First-line TB medicine is taken once a day on an empty stomach, so the standard reminder time is 7:00 AM, before breakfast; a patient's doctor can pick a different time from their patient page.

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

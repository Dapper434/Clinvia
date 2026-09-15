# Clinvia Backend (Flask + Flask-SQLAlchemy)

REST API for Clinvia, built with Flask and Flask-SQLAlchemy.

## Stack

- **Flask 3** — app factory pattern (`app/__init__.py`)
- **Flask-SQLAlchemy** — ORM models in `app/models.py`
- **Flask-Migrate** (Alembic) — schema migrations live in `migrations/`
- **PyJWT** + **bcrypt** — bearer JWTs, bcrypt-hashed passwords
- **psycopg3** — PostgreSQL driver (works with Supabase, Render, Neon, or local Postgres — anywhere a standard `postgresql://` connection string points)

## Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# edit .env: set DATABASE_URL, JWT_SECRET, FRONTEND_URL

flask db upgrade      # applies migrations, creates all tables
python seed.py        # optional: inserts demo facilities/patients (skips if data already exists)

python wsgi.py         # starts the dev server on :5000 (or `flask run`)
```

For production, use a WSGI server instead of the Flask dev server:

```bash
gunicorn wsgi:app --bind 0.0.0.0:$PORT
```

## Schema changes

Don't hand-edit the database or rely on `db.create_all()` for changes after the first setup. Change a model in `app/models.py`, then:

```bash
flask db migrate -m "describe the change"
flask db upgrade
```

Review the generated migration in `migrations/versions/` before applying it — autogenerate doesn't always get constraints/renames right.

## Project layout

```
backend/
├── app/
│   ├── __init__.py       # create_app() factory: CORS, blueprints, error handlers
│   ├── config.py         # env-based config, DB URL normalization (SSL, driver)
│   ├── extensions.py     # db, migrate
│   ├── models.py         # User, Profile, Facility, Patient, DoseLog, LabResult, Contact
│   ├── auth.py           # JWT issue/verify, bcrypt hashing, role-check decorators
│   ├── utils.py          # shared helpers (date parsing)
│   └── routes/           # one blueprint per resource
├── migrations/           # Alembic migration history
├── wsgi.py               # entrypoint (`app = create_app()`)
├── seed.py               # demo data for local dev
└── requirements.txt
```

## Auth & authorization model

- **Unified hospital sign-in**: `POST /api/auth/login/hospital` accepts both clinical staff and admin credentials — RBAC is enforced by what each role can access after logging in, not by which login form was used. `POST /api/auth/login/patient` is separate. There is no public staff/admin registration endpoint; accounts are created via `POST /api/admin/staff` (admin-only) or `seed.py`.
- `authenticate_token` — validates the bearer JWT, populates `g.user`
- `require_hospital` — restricts to `hospital`/`nurse`/`admin`/`viewer` roles (`hospital`/`nurse`/`viewer` currently share identical permissions among themselves)
- `require_admin` — restricts to the `admin` role only (staff management, admin dashboard)
- `require_patient` — restricts to the `patient` role
- `optional_auth` — populates `g.user` if a valid token is present, but doesn't require one (used by the public facilities list)

`/api/dose-logs` uses role-aware ownership checks rather than a blanket hospital-only gate, since patients legitimately read/write their own dose logs through it — a patient's `patient_id` is always resolved server-side from their account, never trusted from the request. `/api/contacts` and `/api/labs` are hospital-only.

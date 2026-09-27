# Agent guide

Clinvia is a multi-hospital management app focused on tuberculosis (TB) care. The backend
is Flask + PostgreSQL in `backend/`, and the frontend is React 19 + Vite in `frontend/`.
`backend-node-legacy/` is old and unused, so don't edit it.

## Starting point for v2

All v2 work starts from the git tag `v2-start`, the commit that introduced the three actors
below. Branch from the latest `master`, and don't build on
anything older than `v2-start`.

## The three actors (v2)

From v2 on, Clinvia is built for **three actors**:

1. **Patient**: role `patient`, uses the patient portal.
2. **Doctor**: role `doctor`, belongs to one hospital.
3. **TB representative**: role `network_admin` (the v1 "network admin"), oversees TB across every hospital.

Read `docs/ACTORS.md` before you design or build a feature. Rules:

- Every new feature serves at least one of these actors. Say which one in the plan, the PR and the tests.
- Don't rename `network_admin` in code or data. "TB representative" is only the label people see.
- The other roles (`admin`, `executive`, `clinician`, `nurse`, `receptionist`) stay and keep their
  permissions. Don't remove or break them, and don't design new work around them.
- Prefer refining what exists over large rewrites.

## Where things live

- `backend/app/auth.py`: `ACTORS`, the `PERMISSIONS` table (the checks that count), and hospital scoping (`scope_ids()`).
- `backend/app/clinical.py`: clinical rules (adherence, missed-dose streaks, needs-attention list).
- `backend/app/models.py`, `backend/migrations/`: tables and Alembic migrations.
- `backend/app/routes/`: one file per area. `portal.py` is the patient's API, and `hospitals.py` holds the network/TB representative endpoints.
- `frontend/src/App.jsx`: routes and the capability each one needs.
- `frontend/src/utils/roles.js`: `ACTORS`, role labels and home pages.

## Commands

```bash
./start.sh                                   # backend :5000, frontend :5173
cd backend && python -m pytest tests         # backend tests
cd frontend && npm run lint                  # frontend lint
```

# Clinvia v1 — architecture overview and v2 handoff

Written for: every human collaborator and every Claude Code agent who touches this
repo, before v2 work starts. Read this whole file first. It is a snapshot of what
"v1" actually is, taken by analysing the full codebase (not the old design brief)
on 2026-09-27 at commit `1f88532`, with the backend test suite passing (18/18) and
the frontend lint and build clean.

**Status of v2 at the time of writing:** not yet specified. The user said they
would give the v2 brief after this analysis. If you're reading this and a v2 brief
now exists, it should live at `docs/V2_BRIEF.md` (or be linked from `CLAUDE.md`) —
look there first. Nothing below describes v2; it describes what exists today, so a
v2 plan can build on facts instead of re-deriving them.

---

## 1. What Clinvia is

Clinvia is a multi-tenant hospital management system with a tuberculosis (TB) care
programme as its specialty. Each hospital is its own tenant: staff sign in with an
email at their hospital's own domain and only ever see that hospital's patients,
beds and schedule. A network administrator can see every hospital, one at a time or
combined.

Two front doors:
- **Staff app** — dashboard, patient registry, appointments, walk-in queue,
  admissions & beds, TB dose log, case map, reports/exports, staff management,
  network overview.
- **Patient portal** — patients check in their own daily dose, see adherence,
  results, medication and appointments, book appointments, upload documents, and
  get push notifications reminding them to take today's dose.

## 2. Version history (why the code looks the way it does)

The project has had three names and two backend rewrites. Skimming `git log
--oneline` end to end explains most of what otherwise looks like inconsistency:

1. **TBTrack** (2026-05, `f335680`…) — a class project: React + a Node/Express
   API, TB-only, single hospital, roles `hospital`/`nurse`/`admin`/`patient`.
2. **Rebrand + Flask rewrite** (`a5c1575`, 2026-09-15) — "Rebrand to Clinvia and
   port backend from Node/Express to Flask". The Node/Express backend was kept
   in the repo as `backend-node-legacy/` rather than deleted.
3. **Hospital-management redesign** (2026-09-24, ~60 commits, `2365401` through
   `79972d8`) — the big one. Turned a single-tenant TB app into the multi-hospital
   system described above: hospitals as tenants, 8 roles, TB moved into its own
   episode table, wards/beds/admissions/appointments/visits/medications/files
   added, one permission table, one clinical-rules module, readable P-codes and
   S-codes everywhere instead of UUIDs. This redesign was driven by a brief and a
   clickable HTML/JS prototype that live at `docs/redesign/` (see §11 — that
   folder is **not** the v2 brief).
4. **Polish since** (2026-09-24 → 2026-09-27) — start script hardening, favicon,
   password visibility toggle, reminder error messages.

So "v1" = the state after step 4. It is a complete, working implementation of the
2026-09-24 redesign brief, not a half-finished migration.

## 3. Stack

| Layer | Technology |
|---|---|
| Backend | Python, Flask 3, Flask-SQLAlchemy, Flask-Migrate (Alembic), PyJWT, bcrypt, psycopg3, pywebpush |
| Frontend | React 19, Vite 8, React Router 7, Tailwind CSS 3, Leaflet, lucide-react. Charts are hand-drawn SVG, no chart library |
| Database | PostgreSQL — Supabase in production, a local Postgres 18 cluster on port 5433 for dev/tests |
| Hosting | Vercel (frontend), Render free tier (backend) |
| Scheduling | GitHub Actions cron (`.github/workflows/dose-reminders.yml`) wakes the backend every 30 min to send due push reminders, because Render's free tier sleeps |
| Dead weight still in the repo | `backend-node-legacy/` — the pre-Flask Express API, unused, not wired to anything, not deleted |

## 4. Repo layout

```
backend/
  app/
    __init__.py     create_app(): CORS, blueprints, error handlers, CLI commands
    config.py       env-based config, DB URL normalization (SSL, driver upgrade)
    extensions.py   db (SQLAlchemy), migrate
    models.py       every table (~600 lines, see §5)
    auth.py         JWT issue/verify, bcrypt, the ONE permission table, tenancy scoping
    clinical.py     adherence / streaks / needs-attention / dose-day / weekly-admissions — ONE place
    lookups.py      code -> record resolution scoped to the caller's hospital; shared row shapers
    pdf.py          hand-written one-page PDF generator (no PDF library)
    reminders.py    web-push dose reminders, deterministic daily message per patient
    utils.py        date/time string parsing
    routes/         one blueprint per resource (see §9 for the endpoint list)
  migrations/versions/   4 Alembic migrations, oldest first:
    db43627a923c   initial schema (single-tenant TBTrack-era tables)
    a53bf50c312d   assigned_doctor_id on patients
    891c4f1ee866   push_subscriptions, dose_time, last_reminder_sent_on
    c1a2b3d4e5f6   the big one: hospitals-as-tenants, new roles, TB episodes split
                   out of patients, wards/beds/admissions/appointments/visits/
                   medications/patient_files, P-code/S-code sequences
  seed/
    network.py     the 5 seeded hospitals, their wards and staff (hand-edit this)
    people.json     240 seeded patient identities
    generate.py     flask seed-network: idempotent, resets only the 5 seeded hospitals
  tests/
    conftest.py     recreates a throwaway `clinvia_test` DB, migrates + seeds it once per session
    test_tenancy.py     hospital isolation, role-based dashboard shaping
    test_workflows.py   booking, queue, admissions, dose log locking, new hospital registration

frontend/
  src/
    api/            one thin file per resource; all requests go through client.js
    api/client.js   base URL from VITE_API_URL, Bearer token, X-Hospital header for network admin
    context/        AuthContext — session, permissions, scope (which hospital a network admin is viewing)
    components/shell/   AppShell, Sidebar, per-page toast, drawer host, "version" bump to force reload
    components/drawers/ every side-panel form (book, admit, walk-in, staff, ward, prescribe, lab, contact, upload, TB, edit patient)
    components/ui/      Page (title+actions+body), bits.jsx (Stat/Strip/Pill/Empty/ErrorNote), useApi hook
    pages/staff/    16 staff pages
    pages/, pages/patient/   Welcome, Login, SignUpPatient, RegisterHospital, ChangePassword, PatientPortal, MyProfile
    styles/clinvia.css   the staff design system, scoped under `.cv` (see §10)
    index.css       plain Tailwind for the patient portal (a different visual style — see §12.2)
  public/sw.js      service worker for push notifications
```

## 5. Data model

Every table is in `backend/app/models.py`. Summary:

| Table | Purpose | Notable columns / constraints |
|---|---|---|
| `facilities` | A hospital (tenant) | `slug`, `email_domain` (unique — decides sign-in), `active` (network admin can suspend), `is_seeded` (re-seeding only touches these) |
| `users` | Every login: staff and patients | `role` (check constraint, see §6), `facility_id` (null only for `network_admin`), `staff_code`, `duty_status`, `must_change_password` |
| `profiles` | Legacy 1:1 shadow of `users.role`/`full_name` | Left over from the pre-tenancy schema; nothing reads it, only writes keep it in sync |
| `patients` | One row per patient | `patient_code` (P####, from a sequence, grows past 9999), `user_id` (portal link, nullable+unique), `assigned_doctor_id`, `dose_time` (nullable — falls back to the hospital-wide default), `portal_link_code` (one-time code staff hand out) |
| `tb_episodes` | One TB treatment course | A patient can have several over time but **at most one `active`** (partial unique index) |
| `dose_logs` | One row per patient per day | `source`: `clinic_dot` (staff observed) or `patient_portal` (patient self-reported) — **this flag is what locks a row in the staff UI** |
| `lab_results` | Lab tests | `test_type`/`result` are both check-constrained enums; `mdr_detected` is a separate boolean from a "Not converted" *text* flag (see §13.3) |
| `contacts` | Household contact tracing | Screening result/date |
| `medications` | Prescriptions | `active` flag; closing a TB episode auto-deactivates meds started since treatment start |
| `patient_files` | Uploaded documents | Content stored as `bytea` in the DB (no object storage); `uploaded_by` is `'staff'`/`'patient'` |
| `wards`, `beds` | Physical layout per hospital | Bed labels are `<ward prefix>-<number>` |
| `admissions` | One row per stay | `discharged_at` null while occupied; discharge sets the bed to `cleaning` |
| `appointments` | Bookings | `booked_via`: `reception` or `patient_portal` |
| `visits` | Today's walk-in queue | `priority` (urgent/moderate/low), `status` (waiting/in_consultation/completed) |
| `push_subscriptions` | Web-push endpoints | One user can have several devices |

Everything hospital-scoped carries a `facility_id` (directly, or via `patient_id` →
`patients.facility_id`). There is no row-level security in Postgres — scoping is
enforced entirely in `auth.py`'s `scope_ids()`/`single_scope()`, called from every
route. **This is the thing to get right first in any v2 work that touches data
access** — it's the whole security model.

## 6. Auth & tenancy model

- 8 roles: `network_admin`, `admin`, `executive`, `doctor`, `clinician`, `nurse`,
  `receptionist`, `patient`. `network_admin` has no hospital; every other staff
  role belongs to exactly one.
- **Sign-in is by email domain.** `POST /api/auth/login/hospital` requires the
  email's domain to match the account's own hospital (or the network domain for
  `network_admin`). Patients use a separate endpoint, `login/patient`.
- Every request re-reads the user from the database (`authenticate_token` in
  `auth.py`) — a role change, deactivation, or hospital suspension takes effect
  immediately, not just on next login. The JWT only carries identity, never
  permissions.
- **One permission table**, `PERMISSIONS` in `auth.py`, maps ~25 capability
  strings (`patients.view`, `doses.log`, `staff.manage`, …) to the set of roles
  allowed. `can(role, capability)` and the `@require(capability)` decorator are
  the only things that matter for authorization; the frontend's `Can` guard and
  sidebar filtering are UX only; the API is what actually enforces this.
- **Tenancy**: `scope_ids()` returns the hospital id(s) a request may read.
  Staff → their own hospital, always. Network admin → the hospital named in the
  `X-Hospital` header (a slug), or every hospital if absent/`all`. `single_scope()`
  is used for writes and raises if the caller hasn't picked exactly one hospital.
- A hospital registers itself (`POST /api/hospitals/register`) and starts with
  zero records; there is no public staff sign-up — a hospital admin creates staff
  accounts (`POST /api/staff`).

## 7. Clinical rules (all server-side, `backend/app/clinical.py`)

These were deliberately centralized in one file so pages only display what it
returns — do not reimplement any of this in the frontend or duplicate it in a
route file.

- **Adherence** = doses taken ÷ doses logged over the **last 30 days**, rounded.
  Not since treatment start (that was a bug in the pre-redesign version — see
  §11).
- **Missed streak** = consecutive missed logs counting back from today (or from
  yesterday if today isn't logged yet), stopping at the first taken dose.
- **Needs attention**, most urgent first:
  1. Active TB, missed streak ≥ 2 (ranked by streak length)
  2. Active TB whose month-2 sputum smear "did not convert" (see §13.3 — this is
     a text-matching heuristic, not a structured field)
  3. Pending GeneXpert results
- **Doses expected** on a day = active TB episodes whose `treatment_start` ≤ that
  day. Always distinguishes taken / missed / not-yet-logged.
- **Weekly admissions**: Monday-start weeks; the current week is partial.
- **Appointment slots**: 08:00–15:20 every 40 minutes, Monday–Friday only, fixed
  for every hospital regardless of timezone or actual opening hours (see §13.4).
  A slot is taken if that doctor has a non-cancelled booking then, or if it's
  already past today. Doctors `on_leave` can't be booked and don't appear in
  doctor lists.
- **Queue order**: urgent, then moderate, then low; within a tier, by arrival.
  "Call in" assigns a doctor who is on duty and not already in a consultation.
- **Dose logging**: a patient can only self-report a dose as *taken*; a missed
  dose is always recorded by staff. A dose the patient logged is **locked** in
  the staff dose log (staff can't silently overwrite what a patient reported).
- **Discharge** sets `discharged_at` and marks the bed `cleaning`; a separate
  action later marks it `available`.

## 8. Key end-to-end workflows

- **New hospital**: `POST /api/hospitals/register` validates the domain isn't
  reserved, creates the `Facility` + its first `admin` user in one transaction,
  returns a session — the admin is immediately signed in with zero records.
- **New patient**: `POST /api/patients` optionally opens a portal account and/or
  starts a TB episode in the same call; the response is the new `P####` code.
- **Patient linking**: staff hand out a one-time `portal_link_code`; the patient
  redeems it via `POST /api/patient-portal/link`, which sets `patients.user_id`
  and clears the code.
- **Booking**: staff (`POST /api/appointments`) or patients themselves
  (`POST /api/patient-portal/appointments`) book a free slot; both paths reuse
  `free_slots()` in `appointments.py` so availability logic never diverges.
- **Admission**: `POST /api/admissions` row-locks the bed (`with_for_update()`)
  before flipping it to `occupied`, to survive two concurrent admits.
- **Dose reminders**: `POST /api/reminders/run` (shared-secret header, called by
  the GitHub Actions cron) reminds every active-TB patient past their dose time
  who hasn't logged today and hasn't already been reminded today — idempotent
  under retries. Messages are picked deterministically per patient per day from
  a fixed list of ten (`reminders.py::WITTY_MESSAGES`), so the same patient sees
  a stable message all day but a different one tomorrow.
- **Exports**: `GET /api/exports/<kind>.csv` for `patients`, `tb`, `appointments`,
  `doses` — hand-built CSV, scoped like everything else.

## 9. API surface (blueprints, all under `/api`, auth as noted)

| Blueprint (file) | Prefix | Notes |
|---|---|---|
| `auth_routes.py` | `/api/auth` | `/domain` (public, tells the sign-in page which hospital an email belongs to), `/login/hospital`, `/login/patient`, `/register/patient`, `/me`, `/password` |
| `hospitals.py` | `/api/hospitals` | `/register` (public), `/levels` (public), `` (list), `/overview` (network admin only), `/<slug>` (PATCH), `/scope` |
| `dashboard.py` | `/api` | `/dashboard` (role-shaped payload), `/attention`, `/badges` (sidebar counts) |
| `patients.py` | `/api` | Registry, record, TB episode start/update, labs, medications, files, household contacts |
| `appointments.py` | `/api` | Day/week schedule, slots, booking, status, plus the walk-in queue (`/visits`) |
| `admissions.py` | `/api` | Wards/beds overview, admit, discharge, bed status, ward setup |
| `doses.py` | `/api` | `/doses` GET (day log) and PUT (bulk upsert, portal rows locked) |
| `staff.py` | `/api` | Staff list/profile/create/update, `/directory` (network-wide people search) |
| `facilities.py` | `/api/facilities` | Public list of active hospitals (for sign-up pages) |
| `portal.py` | `/api/patient-portal` | Everything a signed-in patient can do |
| `push.py` | `/api/push` | VAPID key, subscribe/unsubscribe, test notification |
| `reminders.py` | `/api/reminders` | `/run` — cron-secret authenticated, not user-authenticated |
| `reports.py` | `/api` | `/map/tb`, `/reports`, `/exports/<kind>.csv` |

Two CLI commands registered in `app/__init__.py`: `flask seed-network`,
`flask send-reminders`.

## 10. Frontend architecture

- Routing mirrors the sidebar 1:1 (`App.jsx`); most pages are lazy-loaded.
  `Can`/`StaffRoute`/`PatientRoute` in `Guards.jsx` redirect based on the
  session's permission list — a UX nicety, not the security boundary (the API
  is).
- `AuthContext` holds the session, the role, the permission list, and — for a
  network admin only — which hospital they're currently scoped to (persisted in
  `localStorage`, sent as `X-Hospital`).
- `useApi(loader, deps)` is the one data-loading hook every page uses: loading /
  error / data state, a `reload()` you can call, and a shared `version` counter
  (bumped by `DrawerHost` after any drawer action) so every open page re-fetches
  after a mutation without prop-drilling a refresh callback everywhere.
- Every write action goes through a **drawer** (`components/drawers/`), not a
  separate page — booking, admitting, adding a walk-in, adding staff, adding a
  ward, prescribing, adding a lab, adding a contact, uploading a file, starting
  TB treatment, editing a patient.
- Charts (`AdmissionsChart.jsx`, `DoseChart.jsx`) are hand-drawn SVG — there is
  no chart library dependency to keep in sync with a design.

## 11. The old design brief (`docs/redesign/`) — history, not a v2 spec

`docs/redesign/CONTEXT.md`, `prototype/` (a clickable HTML/JS mockup) and
`seed/` are the brief that produced the 2026-09-24 redesign described above. Two
things to know:

1. **v1 already fully implements it.** Every route, drawer, and clinical rule it
   asks for exists. Its "Done when" checklist is satisfied.
2. **It is stale in one specific way**: it was written assuming the Node/Express
   + raw-`pg` backend that existed at the time, and describes migrating that
   backend. The backend was rewritten in Flask/SQLAlchemy instead, so the
   specific SQL/migration instructions in that brief no longer apply — the
   *behaviour* it describes is what got built, on a different backend than the
   one it names.
3. It is excluded from this local clone's git tracking via `.git/info/exclude`
   (a local, unshared setting — not `.gitignore`), so a fresh clone by another
   collaborator will **not** have this folder at all unless it's fetched some
   other way. Don't assume other collaborators can see it.

**Do not treat this folder as the v2 brief.** If v2 turns out to reuse or extend
it, say so explicitly in `docs/V2_BRIEF.md` rather than assuming every reader has
access to `docs/redesign/`.

## 12. Known technical debt / leftovers (things a v2 plan should explicitly decide about, not silently inherit)

1. `backend-node-legacy/` — the pre-Flask Express API. Not imported by anything,
   not deployed, not tested. Candidate for deletion once v2 direction is set.
2. `Profile` model (`backend/app/models.py`) duplicates `users.full_name`/`role`.
   Nothing reads it; every write path updates it defensively "just in case."
3. `g.user` dict, `require_hospital` (= `require_staff`), and `optional_auth` in
   `auth.py` are compatibility shims for older handlers ("Kept for..." /
   "Kept so existing imports keep working" comments). Worth auditing whether
   anything still needs them before v2 adds more routes on top.
4. `backend/README.md` still documents the pre-tenancy model list (`User,
   Profile, Facility, Patient, DoseLog, LabResult, Contact`) and pre-tenancy role
   names — it was not updated in the 2026-09-24 redesign.
5. `GET /` advertises `"docs": "/api/docs"`, which doesn't exist.
6. **Two visual design systems coexist**: the staff app uses the bespoke `.cv`
   system (`styles/clinvia.css`, teal/ink palette, Instrument Sans, tokens
   documented in the old brief's §5) but the **patient portal still uses plain
   Tailwind grays** (`rounded-3xl`, `lucide-react` icons) — a different look and
   a different icon set from the rest of the app. If v2 touches the portal,
   deciding whether to bring it into `.cv` or keep it separate is a real design
   decision, not a bug fix.
7. `.env.example` files still reference the old `tbtrack` name in places
   (e.g. `postgresql://postgres:password@localhost:5432/tbtrack`).

## 13. Things to look at before scaling or hardening for v2

1. **CORS** (`app/__init__.py`) reflects any origin (`origins="*"` with
   `supports_credentials=True`); `Config.FRONTEND_URL` is read from the
   environment but never actually passed into the CORS setup.
2. **`JWT_SECRET`** falls back to a hard-coded development default if unset in
   the environment (`config.py`). Fine for local dev, a real risk if it ever
   reaches a deployed environment without the env var set.
3. **"Not converted" sputum detection is a text match**: `not_converted()` in
   `clinical.py` looks for `LabResult.notes LIKE 'Not converted%'`. There's no
   structured field for it. Similarly, `mdr_detected` on a lab result is a
   separate boolean from the TB episode's own `mdr_flag` — nothing keeps them in
   sync automatically.
4. **One timezone for the whole platform** (`APP_TIMEZONE`, currently
   `Africa/Nairobi`) and one fixed appointment-slot template (08:00–15:20, every
   40 min) for every hospital — not per-hospital configurable.
5. **The walk-in queue only ever covers "today."** There's no history view.
6. **Discharged admissions don't keep their historical bed** reference once the
   bed is reused (per the README's own "Known Limitations" section).
7. **Network overview** (`GET /api/hospitals/overview`) recomputes the full
   needs-attention list once per hospital, per request — fine at 5 hospitals /
   240 patients, would need caching or a materialized view at real scale.
8. Auth tokens live in `localStorage` (not an httpOnly cookie) and last 7 days
   by default (`JWT_EXPIRES_IN`).

## 14. Explicitly not built yet (from the README's own "Known Limitations")

Audit logging, consent capture, TB/HIV co-infection fields, a drug-resistant TB
(DR-TB) treatment pathway, and SMS. Also: drug names/doses/regimens in the
seeded data are illustrative, not clinical guidance — don't treat them as a
source of truth for a real regimen.

## 15. Dev environment quick reference

```bash
./start.sh                    # backend :5000, frontend :5173, starts the local dev Postgres on :5433 if configured
cd backend && flask seed-network      # 5 hospitals, 240 patients; resets only the seeded 5
cd backend && python -m pytest tests  # 18 tests; needs TEST_DATABASE_URL (default: localhost:5433/clinvia_test), destroys and recreates it every run
cd frontend && npx eslint . && npx vite build   # lint + build check
```

Login pattern for the seed: `<firstname>.<lastname>@<hospital-slug>.clinvia.health`
(e.g. `amina.hassan@knh.clinvia.health`); network admin at `admin@clinvia.health`.
Passwords come from `SEED_PASSWORD_*` in `backend/.env`, never committed.

---

*This file is a snapshot, not a living spec — if the code changes in ways that
contradict it, trust the code and update this file, not the other way round.*

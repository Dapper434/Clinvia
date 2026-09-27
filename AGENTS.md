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

## Every screen works on phones and desktops

Patients check in from their phones, and doctors and TB representatives use Clinvia on the
ward and in the field. Every page, drawer and component you add or change must work from a
360px phone up to a wide desktop. It isn't done until it does. Rules:

- **Build on what's there.** Staff pages use the `.cv` classes in `frontend/src/styles/clinvia.css`.
  They already collapse at 1180px and 860px (off-canvas sidebar, one-column grids, single-column
  forms, scrolling tables). Patient pages use Tailwind, mobile-first: unprefixed classes are the
  phone layout, and `sm:`/`lg:` add the wider one. Read the Layout section of `frontend/DESIGN.md`.
- **Nothing gets cut off.** `html`/`body` clip sideways overflow, so anything too wide is silently
  hidden, not scrollable. Give flex/grid children `min-width: 0`, let long text wrap
  (`overflow-wrap: anywhere` for emails and codes), and put wide content in a scroller
  (`.tbl-wrap` for tables, `.seg` for segmented controls).
- **Don't hide features on small screens.** Rearrange instead. The staff top bar turns its
  actions into a scrolling row under the title. Don't add `display: none` for anything a user
  needs to do their job.
- **Fixed sizes need a mobile answer.** Avoid fixed widths and heights over about 320px. Use
  `min(…, 100%)`, `max-width`, or a value inside a media query (see the map's `min(560px, 65vh)`).
  Use `100dvh` next to any `100vh`.
- **Touch targets:** at least 32px tall on phones, 40px for buttons (`.btn` already does this).
  Standalone text links and icon buttons need padding to get there.
- **Form fields are 16px on phones**, or iOS zooms the page. `src/index.css` enforces this globally;
  don't override it.
- **Check it before you push.** With the app running on a seeded database, run
  `cd frontend && npm run check:responsive` (seeded passwords come from the same
  `SEED_PASSWORD_*` variables as `flask seed-network`). It opens every page as each actor at
  360, 390, 768 and 1280px and fails on clipped content, sideways scrolling, small tap targets
  and zooming fields. Add new routes to its `ACTORS` list. For drawers and dialogs, also look at
  them at 390px (`SHOTS=1` saves phone screenshots to `frontend/.responsive/`).
- Say in the PR that you checked phone and desktop.

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
cd frontend && npm run check:responsive      # every page at phone/tablet/desktop widths (app must be running)
```

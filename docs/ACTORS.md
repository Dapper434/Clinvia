# Clinvia v2 actors

v2 starts at the git tag `v2-start`.

From v2 on, Clinvia is built for **three actors**. Every new feature should serve at least
one of them, and when a feature is designed, name the actor it's for.

| Actor | Role in the code | Who they are |
|---|---|---|
| **Patient** | `patient` | A person on TB treatment, using the patient portal. |
| **Doctor** | `doctor` | A doctor in one hospital, responsible for their patients' TB care. |
| **TB representative** | `network_admin` | Oversees the TB programme across every hospital. This was the v1 "network admin". |

The maps are `ACTORS` in `backend/app/auth.py` and `frontend/src/utils/roles.js`.

## The role names stay the same

v2 doesn't rename any roles. The TB representative is still stored as `network_admin` in the
database, the tokens, `PERMISSIONS` and the frontend. Only the label people see changed, to
"TB representative". This keeps v1 accounts, the seed, migrations and tests working.
Don't rename the role in code unless you're also writing the migration for it.

## What each actor can do today (v1)

### Patient
- Signs up at `/signup/patient` and links to their clinic record with a link code.
- Checks in the daily dose. Those doses are locked, so staff can't overwrite them.
- Sees their adherence, results, medication and appointments. Books appointments and uploads documents.
- Gets push dose reminders at the dose time.
- Code: `backend/app/routes/portal.py`, `backend/app/reminders.py`, `frontend/src/pages/PatientPortal.jsx`,
  `frontend/src/pages/patient/`, `frontend/src/components/layout/Patient*.jsx`, `frontend/src/api/portal.js`.

### Doctor
- Belongs to one hospital and sees full clinical records there.
- Manages the TB episode, labs, medications, admissions and appointments. Sets a patient's dose reminder time.
- Is a patient's **assigned doctor** (`Patient.assigned_doctor_id`), and can switch the dashboard
  and schedule to show only their own patients (`?mine=1`, `_mine()` in `routes/dashboard.py`).
- Code: `frontend/src/pages/staff/` (Dashboard, PatientRecord, Appointments, DoseLog…),
  `frontend/src/components/drawers/`, `backend/app/routes/patients.py`, `backend/app/clinical.py`.

### TB representative (`network_admin`)
- Works for the Ministry of Health, a county health department or an NGO. Each account has an
  `organisation` and, optionally, a `county`.
- **Numbers and percentages only.** They never see a patient's or a staff member's name, P-code or
  S-code. They get: the overview (`/network`) with counts and percentages per hospital, the
  dashboard in its counts-only form, the case map as unnamed dots, reports, and the summary CSV
  (`/api/exports/summary.csv`).
- **Scope:** with no county, every hospital; with a county, only that county's hospitals
  (`representative_hospitals()` in `backend/app/auth.py`). Within that, one hospital at a time
  (`X-Hospital` header) or combined (`all`).
- **Can't** open patient records, staff lists, the dose log, appointments, the queue or admissions,
  export named CSVs, manage staff, or change or suspend hospitals. Hospitals run themselves.
- New accounts: `flask add-tb-representative` (there is no sign-up for this role).
- Code: `frontend/src/pages/staff/Network.jsx`, `backend/app/routes/hospitals.py`,
  `backend/app/metrics.py`, and the `isNetwork` / `scope` values in `frontend/src/context/AuthContext.jsx`.

## Supporting roles

`admin`, `executive`, `clinician`, `nurse` and `receptionist` still exist and keep their v1
permissions. Don't remove them or break them. But v2 work isn't designed around them:

- Build for the three actors first. Give a supporting role access only when a feature can't work
  without it. For example, a hospital `admin` still has to create doctor accounts.
- `clinician` has the same clinical permissions as `doctor`. When you add a doctor capability to
  `PERMISSIONS`, add `clinician` too unless there's a reason not to. Features tied to "my
  patients" (`assigned_doctor_id`, `?mine=1`) are for `doctor` only.

## Checklist for a new feature

1. Name the actor (or actors) it's for.
2. Add the capability to `PERMISSIONS` in `backend/app/auth.py`, granted to that actor's role.
3. Mirror it on the frontend: `guarded('cap', ...)` in `App.jsx` or `can('cap')` in the component.
4. For the TB representative, decide how it behaves across all hospitals (`scope_ids()`) and in
   single-hospital scope (`single_scope()` for writes).
5. Add a pytest case that checks the actor can use it and a role that shouldn't can't
   (see `backend/tests/test_tenancy.py`).

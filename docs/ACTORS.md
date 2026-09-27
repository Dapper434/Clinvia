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
- Talks to **Rafiki**, the AI companion ("Talk to Rafiki" on `/my-treatment`). Rafiki keeps them company
  and is not a medic. It can tell them their next medicine pickup, dose time and appointment, and it
  escalates anything a doctor should know (danger signs always, by rule, before the model is asked).
  Runs on NVIDIA NIM by default (`AI_API_KEY`); without a key it falls back to safe rules.
  Code: `backend/app/assistant.py`, `backend/app/escalations.py`.
- Code: `backend/app/routes/portal.py`, `backend/app/reminders.py`, `frontend/src/pages/PatientPortal.jsx`,
  `frontend/src/pages/patient/`, `frontend/src/components/layout/Patient*.jsx`, `frontend/src/api/portal.js`.

### Doctor
- Belongs to one hospital and sees full clinical records there.
- Manages the TB episode, labs, medications, admissions and appointments. Sets a patient's dose reminder time.
- Records medication pickups (`POST /api/patients/<code>/pickups`); the next pickup date comes from `next_pickup()` in `clinical.py`.
- Sees what patients reported to Rafiki ("Reported to Rafiki" on the dashboard and the patient record),
  gets a push notification when one is raised, and marks it handled (`escalations.handle`).
- Is a patient's **assigned doctor** (`Patient.assigned_doctor_id`), and can switch the dashboard
  and schedule to show only their own patients (`?mine=1`, `_mine()` in `routes/dashboard.py`).
- Code: `frontend/src/pages/staff/` (Dashboard, PatientRecord, Appointments, DoseLog…),
  `frontend/src/components/drawers/`, `backend/app/routes/patients.py`, `backend/app/clinical.py`.

### TB representative (`network_admin`)
- Has no hospital. Sees every hospital, one at a time (`X-Hospital` header) or combined (`all`).
  See `scope_ids()` in `backend/app/auth.py`.
- Network overview (`/network`), cross-network people directory (`/directory`), and can suspend a hospital.
- Reads clinical records, dose logs and reports, and exports them. Manages staff and hospital settings.
- Reads Rafiki escalations across hospitals (`escalations.view`) but doesn't handle them.
- **Can't** register patients or log doses. Those need one hospital, and they belong to its staff.
- Code: `frontend/src/pages/staff/Network.jsx`, `Directory.jsx`, `backend/app/routes/hospitals.py`,
  `backend/app/lookups.py`, and the `isNetwork` / `scope` values in `frontend/src/context/AuthContext.jsx`.

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

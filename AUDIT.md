# TBTrack Documentation Audit

**Date:** 2026-09-12
**Method:** Direct code inspection of `backend/` and `frontend/` — every claim below was checked against an actual file, not inferred. File paths are given so findings can be re-verified.

> **Addendum (2026-09-12, later same day):** The backend has since been ported from Node/Express + `pg` to Python/Flask + Flask-SQLAlchemy (the retired Node implementation is kept at `backend-node-legacy/` for reference). It was a faithful 1:1 port — same routes, same JSON shapes, same auth model, same business logic — so every functional finding below (terminology bugs, missing HIV fields, coarse roles, no facility scoping, etc.) is equally true of the new backend; only §1's stack description is now out of date (see `backend/README.md` for the current stack). One thing the original audit missed and the port caught: **`GET /api/labs` had no role check at all** (the same class of bug as the `/api/dose-logs` and `/api/contacts` findings in §4), letting any authenticated patient read any patient's lab results including GeneXpert/MDR status. This has been fixed in the Flask version (hospital-only, matching `/api/contacts`) — the equivalent fix was not backported to the retired Node code since it's no longer in service.

---

## 1. Stack: which system is actually in the repo?

**Verdict: Source A (README) is correct. Source B (pitch deck) describes a system that no longer exists in this repo.**

- Backend is plain **Express + `pg`** (raw PostgreSQL driver), not Supabase. Confirmed via `backend/package.json` dependencies (`express`, `pg`, `bcryptjs`, `jsonwebtoken` — no `@supabase/*` package anywhere) and `backend/src/config/db.js`.
- The only mention of "supabase" in the entire codebase is a comment in `db.js` noting the SSL auto-detection also happens to work if `DATABASE_URL` points at a `supabase.co` host. There is no Supabase client, no Supabase Auth, and critically **no Row Level Security** — RLS is a Postgres/Supabase-specific feature and doesn't exist when you connect with raw `pg`.
- Frontend: **Chart.js** (`react-chartjs-2`), not Recharts — confirmed in `frontend/package.json` and actual usage in `frontend/src/components/dashboard/charts/*.jsx`.
- Frontend: **React Router v7** (`react-router-dom@^7.6.1`), not v6 — confirmed in `frontend/package.json`.

**Conclusion: the pitch deck is describing an earlier, abandoned architecture (Supabase + RLS + real-time subscriptions + Recharts + Router v6). At some point the project was rebuilt on Express/pg/Chart.js/Router v7, and the deck was never updated. Treat the deck as historical, not aspirational — do not try to "restore" Supabase behavior; the README's architecture is the one to build on.**

---

## 2. Claimed features — verified feature by feature

| README/deck claim | Status | Evidence |
|---|---|---|
| Patient registry (records, diagnostics, TB classification, regimen) | **Implemented** | `patients` table (`backend/database/schema.sql:38-56`); `patients.controller.js` full CRUD; `PatientForm.jsx` UI. `tb_type` is constrained to `pulmonary`/`extra-pulmonary`; `regimen` is a free-text field (not constrained), currently only ever set to `HRZE` by default. |
| Regimen lines (HRZE, HRE) | **Partially true** | `regimen` is free text, so HRE *can* be typed in, but nothing in the schema or code enumerates or validates regimens, and nothing branches logic on regimen type. |
| Daily DOT adherence tracking / adherence scores | **Implemented** | `frontend/src/utils/adherence.js` (`calcAdherence`), duplicated server-side in `dashboard.controller.js`. |
| Missing-dose alerts | **Implemented, 3-day window confirmed** | `missedDosesInWindow(logs, 3)` in `frontend/src/utils/adherence.js:36` and duplicated in `backend/src/controllers/dashboard.controller.js:58` (`missedInWindow(logs, days = 3)`). The deck's "3-day window" claim is accurate. |
| Calendar view of dose logs | **Implemented** | `frontend/src/components/patients/AdherenceCalendar.jsx`. |
| Risk stratification | **Partially true** | Only a binary "high risk" flag at <80% adherence (`Dashboard.jsx:75`, `PatientMarker`/`CaseMap.jsx` color coding). No named risk levels beyond `getRiskLevel()` (good/warning/critical) in `adherence.js`, which isn't used anywhere in the UI I could find wired to a display label. |
| Lab result monitoring (GeneXpert, sputum smear) | **Implemented** | `lab_results` table constrains `test_type` to `sputum_smear, genexpert, xray, culture`; `labs.controller.js`; `LabResultForm.jsx`. |
| Sputum smear conversion intervals (Baseline/Month 2/Month 5/EOT) | **Not found** | No field, enum, or logic anywhere tags a lab result with a treatment-month milestone. Labs are just a flat list with a free date. This claimed feature does not exist. |
| Contact tracing & exposure screening | **Implemented** | `contacts` table with `relationship`, `screened`, `screen_result`; `contacts.controller.js`; `ContactTracingTable.jsx`. |
| Preventive therapy tracking | **Not found** | `contacts` table has no field for preventive therapy (e.g. TPT/IPT status). Only screening result. |
| Clinical analytics & CSV export | **Implemented, but only 4 outcome categories** | `Reports.jsx`, `exportCsv.js`. See §4 below — categories don't match WHO standard. |
| Patient portal: one-tap dose check-in with timestamp | **Implemented** | `portal.controller.js:logMyDose`; row has `created_at` timestamp, but the *dose date* is a plain `DATE`, not a precise intake timestamp — "exact timestamp capture" (README's wording) overstates it slightly: you get a timestamp for when the checkbox was toggled, not for when medication was taken. |
| Adherence streaks & progress | **Partially true** | Percentage and calendar exist (`DoseToggle.jsx`, `AdherenceCalendar.jsx`); I did not find a dedicated "streak" (consecutive-days) counter anywhere. |
| Side-effect reporting | **Not found** | No field, table, endpoint, or form for reporting side effects anywhere in the codebase. |
| Clinic contact access | **Not found in patient portal specifically** | Facilities have a `phone` field (`facilities` table) but I found no UI surfacing "your clinic's number" to a logged-in patient. |
| GIS cluster map (Leaflet + OSM) | **Implemented** | `CaseMap.jsx`, `react-leaflet`, OpenStreetMap tile layer. |
| "Real-time" dashboard / "real-time" GIS mapping | **False** | See §3. |
| Deck: Nurse · Admin · Viewer roles | **Roles exist, but not differentiated** | `nurse`, `admin`, `viewer` are all valid values in the `users.role` CHECK constraint (`schema.sql:11`), but `requireHospital` middleware (`backend/src/middleware/auth.js:28-38`) treats all of `hospital`/`nurse`/`admin`/`viewer` identically — same permissions, no distinct capability per role anywhere in the backend. |
| Deck: missed-dose alert at 3-day window | **True** | See above. |
| Deck: lost-to-follow-up at 14 days | **Code exists, but the term is wrong** | See §4 — this is a real, working computation, but calling it "lost to follow-up" is a clinical terminology error per WHO definitions. |

---

## 3. Is the dashboard real-time?

**No. This claim is false in both source documents, and it's also false in the shipped UI copy.**

- `Dashboard.jsx` fetches patients and dose logs **once**, in a `useEffect` with an empty dependency array (`frontend/src/pages/Dashboard.jsx:28-52`). There is no polling interval, no WebSocket, no Supabase subscription, nothing. The only way to see new data is a full page reload.
- Same pattern in `CaseMap.jsx:51-77`.
- Despite this, the UI text literally says **"Real-time patient monitoring and treatment adherence metrics"** (`Dashboard.jsx:166`) and **"Real-time GIS mapping of tuberculosis hot-spots..."** (`CaseMap.jsx:125`). These are user-visible false claims, not just documentation drift — worth fixing in the same pass as the README.
- Whatever real-time behavior existed came from Supabase's realtime subscriptions in the old architecture (§1) and was never replaced with polling or WebSockets after the migration to Express/pg.

---

## 4. Authorisation — is it enforced server-side?

**Confirmed: this is the critical gap the brief predicted, and it is worse than "frontend-only."** Findings, worst first:

1. **`/api/dose-logs` has no role check at all.** `backend/src/routes/doseLogs.routes.js` only applies `authenticateToken` — no `requireHospital`. Any authenticated user, including a `patient`-role account, can:
   - `GET /api/dose-logs?patient_id=<any-uuid>` — read any patient's entire dose history.
   - `POST /api/dose-logs` with an arbitrary `patient_id` — write dose records for a patient that isn't them. (`doseLogs.controller.js:39-77`, no ownership check on `patient_id`.)

2. **`/api/contacts` GET has no role check either** (`contacts.routes.js` — only `authenticateToken` on the read route). Any authenticated patient can list household contacts for any `source_patient_id`.

3. **Where `requireHospital` *is* applied, it does not differentiate roles.** `requireHospital` (`middleware/auth.js:28-38`) accepts `hospital`, `nurse`, `admin`, and `viewer` identically. A `viewer` account can create, update, and delete patients — same as `admin`. There is no capability difference anywhere between the four hospital-side roles.

4. **There is no facility/tenant scoping anywhere, at any layer.** `patients.facility` is a free-text column (`schema.sql:47`), not a foreign key to the `facilities` table, and it is never used to filter `WHERE` clauses based on the requesting user's own facility (there's no `facility_id` on the `users` table at all — a hospital user isn't associated with a facility in the data model). `getPatientById` (`patients.controller.js:35-61`) fetches by `id` with no ownership or facility check whatsoever — any authenticated hospital-role user, from any "facility," can read any patient's full record, dose logs, labs, and contacts by guessing/incrementing a UUID (in practice, or more realistically via the patient list endpoint, which is also unscoped).

5. **Patients cannot be restricted to their own record either**, beyond `portal.controller.js`'s own endpoints (`getMyTreatment`/`logMyDose`), which do correctly scope by `req.user.id`. But because `/api/dose-logs` and `/api/contacts` GET have no patient-role restriction, a patient can bypass the portal entirely and query other patients' data directly.

**Net finding: role checks exist only in the frontend `AuthContext`/route guards (`isHospitalRole`, `isPatientRole` in `frontend/src/utils/roles.js`, used by `ProtectedRoute.jsx`/`HospitalRoute.jsx`/`PatientRoute.jsx`) for two of nine route groups, and even where server-side checks exist, they don't distinguish roles or scope by facility/ownership. This confirms Gap 1 as written in the brief, plus two additional IDOR-class holes (`dose-logs`, `contacts`) that are more severe than "frontend guards only" — they're API endpoints with effectively no authorization at all beyond "logged in as someone."**

Also worth noting for the fix: JWT is stored in `localStorage` (`frontend/src/api/client.js:9`), not an httpOnly cookie — not in scope of the brief's Gap 1, but worth flagging since the auth rework will touch this code anyway.

---

## 5. Roles in database and code

Confirmed via `schema.sql:11` (`users.role CHECK`) and `schema.sql:21` (`profiles.role CHECK`):

```
role IN ('hospital', 'nurse', 'admin', 'viewer', 'patient')
```

- **The deck's Nurse/Admin/Viewer claim is accurate as far as which strings exist**, plus a fifth generic `hospital` role not mentioned in the deck (used for the plain hospital signup flow, `auth.controller.js:registerHospital`).
- **No Lab technician or CHW/field worker role exists anywhere** — confirms Gap 4 is a real, currently-absent feature, not a stub.
- As covered in §4, none of the five roles carry distinct permissions server-side today.

---

## 6. The 14-day and 3-day thresholds

Both are implemented, in **two separate, duplicated places** that could drift out of sync:

- `frontend/src/utils/adherence.js`: `isLostToFollowUp()` (14-day) and `missedDosesInWindow()` (3-day, default).
- `backend/src/controllers/dashboard.controller.js`: `checkLTFU()` (14-day) and `missedInWindow()` (3-day) — near-identical reimplementations.

**Important additional finding not in the original brief:** there are **two unrelated concepts both surfaced as "lost"**, and they can disagree with each other:

1. `patients.status = 'lost'` — a manually-set enum value hospital staff pick from a dropdown (`PatientForm.jsx:303`, `status IN ('active','completed','lost','died')` in `schema.sql:51`). This is a case-outcome field, set by a human, whenever.
2. `isLostToFollowUp(doseLogs)` — an automatically computed boolean based on the 14-day gap, shown as the "Lost to Follow-up" stat card on the dashboard (`Dashboard.jsx:198-203`) and as a map filter option (`CaseMap.jsx:138`).

A patient can have `status = 'active'` while simultaneously being flagged `ltfu = true` by the 14-day check, or have `status = 'lost'` set by staff while having recent dose logs that would make `isLostToFollowUp()` return `false`. These two numbers are never reconciled and the UI doesn't distinguish them — the outcome doughnut chart uses #1, the stat card and map use #2. This should be resolved as part of the Gap 2 terminology fix, not just the naming.

---

## 7. Actual database schema (as of `backend/database/schema.sql`)

| Table | Key columns | Notes |
|---|---|---|
| `users` | `id` (UUID PK), `email` (unique), `password_hash`, `role` (enum, see §5), `full_name`, timestamps | No `facility_id`. |
| `profiles` | `id` (PK, FK→`users.id`), `full_name`, `role` | Appears to duplicate `users.role`; every write path writes both tables together. Possible leftover from the Supabase-era pattern (Supabase Auth commonly pairs `auth.users` with a `profiles` table) — worth confirming whether `profiles` still serves a purpose or can be merged into `users`. |
| `facilities` | `id` (UUID PK), `name`, `county`, `sub_county`, `lat`, `lng`, `phone` | Not referenced by FK from anywhere. Pure lookup list today. |
| `patients` | `id` (UUID PK), `user_id` (unique FK→`users`, nullable), `name`, `age`, `gender` (enum), `phone`, `address`, `facility` (free text, **not FK**), `tb_type` (enum: pulmonary/extra-pulmonary), `regimen` (free text), `treatment_start` (date, required), `status` (enum: active/completed/lost/died), `mdr_flag` (bool), `lat`/`lng`, `registered_by` (FK→`users`) | No HIV/ART/CPT fields. No weight field. No DR-TB regimen structure — `mdr_flag` is the only DR-TB-related data point. |
| `dose_logs` | `id`, `patient_id` (FK, cascade delete), `date`, `taken` (bool), `notes`, `logged_by` (FK→`users`), unique on `(patient_id, date)` | One row per patient per day, matches PROPOSAL.md's stated design ("one row per patient per day"). |
| `lab_results` | `id`, `patient_id` (FK, cascade), `test_type` (enum: sputum_smear/genexpert/xray/culture), `result` (enum: positive/negative/pending), `result_date`, `lab_ref`, `notes`, `mdr_detected` (bool) | No treatment-month milestone tagging (Baseline/M2/M5/EOT) — flat list only. `mdr_detected=true` on insert triggers `UPDATE patients SET mdr_flag=TRUE` (`labs.controller.js:38-41`) — the only place GeneXpert resistance data actually does anything. |
| `contacts` | `id`, `source_patient_id` (FK, cascade), `name`, `age`, `relationship` (enum), `phone`, `screened` (bool), `screen_result` (enum: negative/referred/confirmed_tb), `screened_date` | No preventive therapy (TPT/IPT) field. |

No tables exist for: audit logging, consent records, facility transfers, drug stock, SMS/notification queue, or HIV/ART/CPT data.

---

## 8. Exists in code but documented nowhere

- **`GET /api/dashboard/stats`** (`backend/src/routes/dashboard.routes.js`, `dashboard.controller.js`) is a fully-built endpoint that duplicates all the client-side stat computation — and appears to be **completely unused**. I searched every frontend page/component for a call to `getDashboardStatsApi()` (`frontend/src/api/dashboard.js`) and found none; `Dashboard.jsx` recomputes everything client-side from raw `getPatientsApi()`/`getDoseLogsApi()` calls instead. This is dead code today, and a duplication risk if someone fixes the LTFU/threshold logic in one place and not the other (see §6).
- **`profiles` table** — written to on every registration path alongside `users`, but I found no read path anywhere that queries `profiles` for anything `users.role`/`users.full_name` doesn't already provide. Likely a Supabase-era leftover (see §7).
- **`mdr_flag`/`mdr_detected`** exist and are wired end-to-end (lab result → patient flag → map marker color/filter), which is more DR-TB scaffolding than the brief's Gap 6 description implies — it's not just "GeneXpert captures resistance and nothing else happens," there's already a real signal propagating to the UI. What's genuinely missing is a distinct regimen/timeline for MDR patients, exactly as Gap 6 says.
- **`optionalAuth` middleware** (`middleware/auth.js:50-65`) exists and is used only by `GET /api/facilities` — allows anonymous access to the facilities list. Not documented anywhere, not necessarily wrong, just worth knowing it's an intentional public endpoint.

## 9. Documented but doesn't exist

- Supabase, Supabase Auth, Row Level Security, Supabase real-time subscriptions — none of this exists (§1).
- Real-time dashboard/map updates of any kind — polling, WebSocket, or subscription (§3).
- Sputum smear conversion interval tagging (Baseline/M2/M5/EOT) (§2).
- Preventive therapy tracking for contacts (§2).
- Side-effect reporting in the patient portal (§2).
- Patient-facing clinic contact info surfaced in the portal UI (§2).
- Adherence "streaks" as a distinct tracked metric (§2).
- Lab technician and CHW/field-worker roles (§5).
- Facility transfer of any kind.
- HIV status, ART status/start date, CPT status — no schema, no UI, no mention in code at all.
- SMS reminders / Africa's Talking integration — no dependency, no code, nothing.
- DR-TB/MDR-TB distinct regimen structure or monitoring schedule (the flag exists; the pathway doesn't).
- Audit logging, consent capture, offline support, drug stock tracking, weight-based dosing, DHIS2/national-register alignment — all absent, matching the brief's Gap 7 list (correctly identified there as not-yet-built roadmap items).

---

## Summary for the project owner

The README is the accurate document; the pitch deck describes an earlier Supabase-based architecture that was fully replaced. Two things need attention beyond what the brief anticipated:

1. **The authorization gap is more severe than "frontend-only."** Two API routes (`/api/dose-logs`, `/api/contacts` GET) have no server-side role check at all, meaning any authenticated patient can read or write other patients' dose logs and contacts today, over the live API, without any facility-scoping work being a prerequisite — this is exploitable right now, not just a future multi-tenancy gap.
2. **There are two independently-computed, disagreeing definitions of "lost"** (`patients.status`, a manual field, vs. the 14-day `isLostToFollowUp` computation) surfaced in different parts of the UI. The Gap 2 terminology fix should reconcile these, not just rename the 14-day one.

Everything else in the brief's Part 2/Part 4 checked out as described. Recommend proceeding with the brief's stated order of work, with the dose-logs/contacts authorization hole treated as the most urgent single item inside Gap 1 given it's a live, unauthenticated-by-role data leak.

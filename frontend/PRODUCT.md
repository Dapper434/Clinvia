# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary audience for public surfaces: decision makers at Kenyan hospitals and clinics — medical superintendents, hospital administrators and TB programme coordinators — deciding whether to register their facility on Clinvia. Hackathon judges evaluate the product as if they were these buyers.

Inside the product: hospital administrators, executives, doctors/clinicians, nurses and receptionists (each role-scoped), plus TB patients using the patient portal on their phones.

## Product Purpose

Clinvia is a hospital management system with a tuberculosis programme built in. Hospitals run appointments, the walk-in queue, admissions and beds, and patient records in one place, while TB patients' six-month daily treatment is tracked dose by dose. Success means clinics see missed doses the same day and follow up before a patient drops out of treatment.

## Positioning

Three things together, which a generic hospital system does not do:

1. **TB adherence built into the hospital system** — directly observed doses and patient check-ins land on one dose calendar; 30-day adherence bands (≥80 / 60–79 / <60%) and missed-dose streaks drive a "needs attention" list.
2. **Patient-linked care** — the clinic gives each patient a link code; patients check in their daily dose from the portal, get push reminders at their dose time (default 07:00), and the clinic sees it immediately.
3. **AI triage on top (planned)** — an AI-drafted patient brief for patients on the needs-attention list, de-identified before it reaches the model, always a clinician-reviewed draft. **Not built yet: public surfaces may only present it once it ships.**

## Operating Context

Kenyan public and private facilities; staff sign in with their hospital's email domain and only see their hospital's data (per-hospital tenancy). A network administrator can see all hospitals. Patients use phones; the app is a PWA with web push. Time zone Africa/Nairobi.

## Capabilities and Constraints

- Built: dashboard with needs-attention list, patient registry and records, appointments (40-minute slots, weekdays 08:00–15:20), walk-in queue, admissions and bed map, TB dose log, adherence, case map (Leaflet/OpenStreetMap), reports and CSV exports, patient portal, dose reminders, hospital self-registration, role-based access.
- Not built: audit logging, consent capture, TB/HIV co-infection fields, DR-TB pathway, SMS.
- Public routes: `/welcome` (landing), `/login/hospital`, `/login/patient`, `/signup/patient`, `/register-hospital`.
- Stack: React 19 + Vite + React Router, existing CSS in `src/styles/clinvia.css` (`.cv` scope), Instrument Sans.

## Brand Commitments

Name "Clinvia", tagline in use: "Hospital management and TB care". Existing mark: pulse-line icon (`Mark` in `src/components/ui/icons.jsx`). Plain, factual voice — the README's tone.

## Evidence on Hand

None cleared for public claims. Do not add statistics, customers, pilots, partner clinics, testimonials or metrics. The seeded demo hospitals use real Kenyan hospital names but are illustrative data only; never imply those hospitals use Clinvia. Real product UI may be shown as product illustration.

## Product Principles

1. The clinic sees a missed dose the same day it happens.
2. One record, shared by staff and patient — no double entry.
3. Each hospital owns its data; people see only what their role needs.
4. AI drafts, clinicians decide.
5. Never claim what isn't built or proven.

# TBTrack — Project Proposal

**Tuberculosis case management with hospital–patient linkage**  
*Presentation draft — Friday*

---

## Problem

Tuberculosis (TB) treatment requires **months of daily medication** (DOT). When adherence is poor, patients risk relapse, drug resistance, and spread. Clinics struggle to:

- Track many patients across facilities
- Know quickly who missed doses
- Rely only on in-person visits for dose confirmation

Patients often lack a simple way to **report their own doses** while staying connected to their clinic.

---

## Solution: TBTrack

A web app that connects **hospitals** and **patients** on one platform:

| Role | What they do |
|------|----------------|
| **Hospital / clinic** | Register patients, view adherence calendars, bulk dose logging, labs, contacts, maps, reports |
| **Patient** | Sign in, log today’s dose (taken/missed), see personal adherence calendar |

**Key idea:** Patient self-logs write to the **same database** the hospital uses — updates appear instantly on the clinic’s adherence calendar.

---

## Core Features

1. **Dual sign-up** — Separate flows for hospital staff and patients (`/login/hospital`, `/login/patient`).
2. **Patient ID link-up** — Clinic registers a patient → shares ID → patient links portal account to that record.
3. **Shared dose logs** — One row per patient per day; hospital and patient both update the same calendar.
4. **Adherence tracking** — 180-day visual calendar, adherence %, risk flags, dashboard alerts.
5. **Case management** — Patient registry, lab results, contact tracing, Kenya case map, CSV reports.

---

## Technology

| Layer | Choice |
|-------|--------|
| Frontend | React, Vite, Tailwind CSS, React Router |
| Backend | Supabase (PostgreSQL, Auth, Row Level Security) |
| Charts / maps | Chart.js, Leaflet |

Security: role-based access — patients only see their own record; hospital staff manage all patients.

---

## How It Works (Demo Flow)

1. **Hospital** signs up → registers “James M.” → copies **Patient ID**.
2. **Patient** signs up → pastes ID → links to clinic record.
3. **Patient** logs “Taken” for today on **My Treatment**.
4. **Hospital** opens James’s profile → calendar shows green for today.

---

## Impact

- **For clinics:** Faster visibility of missed doses, less manual follow-up, one dashboard for cohorts.
- **For patients:** Simple daily logging, ownership of treatment progress.
- **For programs:** Better data for reporting and lost-to-follow-up (LTFU) detection.

---

## Status & Next Steps

| Done | Possible later |
|------|----------------|
| Hospital + patient portals | SMS reminders for missed doses |
| ID link-up between clinic and patient | Facility-scoped access (each hospital sees only its patients) |
| Shared adherence calendar | Offline / mobile-first PWA |
| Dashboard, map, reports | Integration with national TB registers |

---

## Summary (30-second pitch)

> **TBTrack** helps clinics and TB patients stay aligned on daily treatment. Hospitals manage cases and see real-time adherence; patients log doses from their phones. One shared calendar, one patient ID to link accounts — built for Kenya’s clinic context with maps, reporting, and secure role-based access.

---

*TBTrack — TB case management, connected.*

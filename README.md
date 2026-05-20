# TBTrack

Web app for tuberculosis case management: patient registry, DOT dose logging, adherence, labs, contacts, dashboard charts, and a Kenya case map (Leaflet + OpenStreetMap).

This project lives in `/home/pipsy/TB-TRACK` and is separate from the Personal Finance Tracker app.

## Stack

- React (Vite) + React Router
- Tailwind CSS
- Supabase (Postgres + Auth)
- Chart.js + react-chartjs-2
- Leaflet + react-leaflet + date-fns + Lucide

## Quick start

```bash
cd tbtrack
cp .env.example .env
# Edit .env with your Supabase URL + anon key

npm install
npm run dev
```

Open `http://localhost:5173`.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run `supabase/schema.sql` (tables, RLS, optional seed data, auth → `profiles` trigger).
3. If you already ran an older schema, also run `supabase/migration_patient_portal.sql`.
4. In **Authentication → Providers**, enable Email (password sign-in). For hackathon demos you can disable “Confirm email” or use the link from the signup email.
5. Sign up at `/login` — choose **Hospital** or **Patient**.

### Dose log upserts

The `dose_logs` table defines `unique (patient_id, date)` so the app can `upsert` with `onConflict: 'patient_id,date'`.

### Auth trigger note

If creating a trigger on `auth.users` fails in your environment, create the `profiles` row manually for each user (`id` = `auth.users.id`) and keep the `profiles` RLS policies from the schema file.

## Scripts

| Command        | Description        |
| -------------- | ------------------ |
| `npm run dev`  | Vite dev server      |
| `npm run build`| Production build     |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint               |

## Routes

- `/` → role-based home (`/dashboard` or `/my-treatment`) or `/login`
- `/login` — choose hospital vs patient
- `/login/hospital`, `/login/patient`
- **Hospital:** `/dashboard`, `/patients`, `/patients/new`, `/patients/:id`, `/dose-log`, `/case-map`, `/reports`
- **Patient:** `/my-treatment` — log daily doses; same data appears on the hospital adherence calendar

## License

Hackathon / educational use — adapt as needed for your team.

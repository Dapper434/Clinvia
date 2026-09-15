# Clinvia Frontend Application

[![Repository](https://img.shields.io/badge/GitHub-Repository-181717?style=flat&logo=github)](https://github.com/Dapper434/Clinvia)
[![Live App](https://img.shields.io/badge/Live%20App-clinvia--indol.vercel.app-0d9488?style=flat&logo=vercel)](https://clinvia-indol.vercel.app)

The frontend client application for **Clinvia** — Hospital Management & TB Care Platform.

The core codebase is available at:  
🔗 **[https://github.com/Dapper434/Clinvia](https://github.com/Dapper434/Clinvia)**.

---

## 💻 Tech Stack & Architecture

- **Core**: React 19, Vite, React Router v7
- **Styling**: Tailwind CSS, PostCSS, Lucide Icons
- **Mapping (GIS)**: Leaflet, React-Leaflet, OpenStreetMap
- **Data Visualization**: Chart.js, React-ChartJS-2
- **Date Utilities**: `date-fns`
- **API Client**: `fetch`-based wrapper with centralized Authorization header injection & token management

---

## 🌟 Key Features

1. **Role-Aware Authentication**: Unified Hospital Portal login for clinical staff and admins (RBAC decides what each role can do after logging in), plus a separate Patient Portal login.
2. **Admin Console**: Hospital-wide dashboard and staff account management, admin-only.
3. **Clinical Dashboard**: Real-time KPI summaries, adherence breakdown charts, case trend analysis, and active clinical alerts.
4. **Patient Registry & Management**: Search, filter, register new patients, update treatment regimens, and track patient status.
5. **Treatment Adherence & Dose Logging**: Interactive 180-day adherence calendar, one-click daily dose toggles (Taken / Missed / Supervised), and adherence rate calculation.
6. **GIS Case Mapping**: Interactive Leaflet map displaying patient distribution density and health facility locations across Kenya.
7. **Lab Results & Contact Tracing**: GeneXpert, sputum smear, culture test tracking, and contact screening management.
8. **Patient Portal**: Mobile-responsive interface allowing patients to self-report daily doses and view personal adherence history.

---

## 🛠️ Local Development

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and configure your API URL:
```bash
cp .env.example .env
```

```ini
# Backend API Base URL
VITE_API_URL=http://localhost:5000
```

### 3. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

### 4. Production Build
```bash
npm run build
npm run preview
```

---

## 🌐 Deployment (Vercel)

The frontend is configured for deployment on Vercel using [`vercel.json`](./vercel.json):
1. Import repository on [Vercel](https://vercel.com).
2. Set Root Directory to `frontend` (or project root with workspace build).
3. Add Environment Variable:
   - `VITE_API_URL`: Your deployed backend API URL (e.g. `https://clinvia.onrender.com`).

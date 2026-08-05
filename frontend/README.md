# PulmoTrack Frontend Application

[![Repository](https://img.shields.io/badge/GitHub-Repository-181717?style=flat&logo=github)](https://github.com/Dapper434/PulmoTrack)
[![Deployment](https://img.shields.io/badge/Deploy-Vercel-black?style=flat&logo=vercel)](https://vercel.com)

The frontend client application for **PulmoTrack** — Tuberculosis Case Management & Adherence Platform.

The core codebase is available at:  
🔗 **[https://github.com/Dapper434/PulmoTrack](https://github.com/Dapper434/PulmoTrack)**.

---

## 💻 Tech Stack & Architecture

- **Core**: React 19, Vite, React Router v7
- **Styling**: Tailwind CSS, PostCSS, Lucide Icons
- **Mapping (GIS)**: Leaflet, React-Leaflet, OpenStreetMap
- **Data Visualization**: Chart.js, React-ChartJS-2
- **Date Utilities**: `date-fns`
- **API Client**: Axios with centralized request/response interceptors & token management

---

## 🌟 Key Features

1. **Role-Aware Authentication**: Dual portal login for Hospital clinical staff and Patients.
2. **Clinical Dashboard**: Real-time KPI summaries, adherence breakdown charts, case trend analysis, and active clinical alerts.
3. **Patient Registry & Management**: Search, filter, register new patients, update treatment regimens, and track patient status.
4. **Treatment Adherence & Dose Logging**: Interactive 180-day adherence calendar, one-click daily dose toggles (Taken / Missed / Supervised), and adherence rate calculation.
5. **GIS Case Mapping**: Interactive Leaflet map displaying patient distribution density and health facility locations across Kenya.
6. **Lab Results & Contact Tracing**: GeneXpert, sputum smear, culture test tracking, and contact screening management.
7. **Patient Portal**: Mobile-responsive interface allowing patients to self-report daily doses and view personal adherence history.

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
   - `VITE_API_URL`: Your deployed backend API URL (e.g. `https://tbtrack-backend.onrender.com`).

import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/useAuth.js'
import HospitalRoute from './components/layout/HospitalRoute.jsx'
import PatientRoute from './components/layout/PatientRoute.jsx'
import AppLayout from './components/layout/AppLayout.jsx'
import PatientLayout from './components/layout/PatientLayout.jsx'
import Welcome from './pages/Welcome.jsx'
import Login from './pages/Login.jsx'
import SignUpHospital from './pages/SignUpHospital.jsx'
import SignUpPatient from './pages/SignUpPatient.jsx'
import { homePathForRole } from './utils/roles.js'
import { Activity } from 'lucide-react'

// Route-level code splitting keeps the initial bundle small; heavy pages
// (charts, maps, tables) are fetched on demand.
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const Patients = lazy(() => import('./pages/Patients.jsx'))
const PatientForm = lazy(() => import('./components/patients/PatientForm.jsx'))
const PatientProfile = lazy(() => import('./pages/PatientProfile.jsx'))
const DoseLog = lazy(() => import('./pages/DoseLog.jsx'))
const CaseMap = lazy(() => import('./pages/CaseMap.jsx'))
const Reports = lazy(() => import('./pages/Reports.jsx'))
const PatientPortal = lazy(() => import('./pages/PatientPortal.jsx'))

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900">
      <div className="flex flex-col items-center gap-3">
        <Activity className="h-8 w-8 animate-pulse text-teal-400" />
        <p className="text-sm font-medium text-slate-400">Loading TBTrack…</p>
      </div>
    </div>
  )
}

function RootRedirect() {
  const { user, role, loading } = useAuth()
  if (loading) {
    return <PageLoader />
  }
  return <Navigate to={user ? homePathForRole(role) : '/welcome'} replace />
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/login" element={<Navigate to="/welcome" replace />} />
        <Route path="/login/hospital" element={<Login portal="hospital" />} />
        <Route path="/login/patient" element={<Login portal="patient" />} />
        <Route path="/signup" element={<Navigate to="/welcome" replace />} />
        <Route path="/signup/hospital" element={<SignUpHospital />} />
        <Route path="/signup/patient" element={<SignUpPatient />} />

        {/* Patient Portal Routes */}
        <Route element={<PatientRoute />}>
          <Route element={<PatientLayout />}>
            <Route path="/my-treatment" element={<PatientPortal />} />
          </Route>
        </Route>

        {/* Hospital Staff Routes */}
        <Route element={<HospitalRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/patients" element={<Patients />} />
            <Route path="/patients/new" element={<PatientForm />} />
            <Route path="/patients/:id" element={<PatientProfile />} />
            <Route path="/dose-log" element={<DoseLog />} />
            <Route path="/case-map" element={<CaseMap />} />
            <Route path="/reports" element={<Reports />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

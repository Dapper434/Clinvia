import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/useAuth.js'
import HospitalRoute from './components/layout/HospitalRoute.jsx'
import PatientRoute from './components/layout/PatientRoute.jsx'
import AppLayout from './components/layout/AppLayout.jsx'
import PatientLayout from './components/layout/PatientLayout.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Patients from './pages/Patients.jsx'
import PatientForm from './components/patients/PatientForm.jsx'
import PatientProfile from './pages/PatientProfile.jsx'
import DoseLog from './pages/DoseLog.jsx'
import CaseMap from './pages/CaseMap.jsx'
import Reports from './pages/Reports.jsx'
import PatientPortal from './pages/PatientPortal.jsx'
import { homePathForRole } from './utils/roles.js'

function RootRedirect() {
  const { user, role, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    )
  }
  return <Navigate to={user ? homePathForRole(role) : '/login'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />


      <Route element={<PatientRoute />}>
        <Route element={<PatientLayout />}>
          <Route path="/my-treatment" element={<PatientPortal />} />
        </Route>
      </Route>

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

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

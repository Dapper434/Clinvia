import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Loader } from './components/auth/AuthLayout.jsx'
import { Can, PatientRoute, StaffRoute } from './components/layout/Guards.jsx'
import PatientLayout from './components/layout/PatientLayout.jsx'
import AppShell from './components/shell/AppShell.jsx'
import { useAuth } from './context/useAuth.js'
import ChangePassword from './pages/ChangePassword.jsx'
import Login from './pages/Login.jsx'
import RegisterHospital from './pages/RegisterHospital.jsx'
import SignUpPatient from './pages/SignUpPatient.jsx'
import Welcome from './pages/Welcome.jsx'
import { homePathForRole } from './utils/roles.js'

// Pages load on demand so the sign-in screens stay small.
const Dashboard = lazy(() => import('./pages/staff/Dashboard.jsx'))
const Patients = lazy(() => import('./pages/staff/Patients.jsx'))
const RegisterPatient = lazy(() => import('./pages/staff/RegisterPatient.jsx'))
const PatientRecord = lazy(() => import('./pages/staff/PatientRecord.jsx'))
const Appointments = lazy(() => import('./pages/staff/Appointments.jsx'))
const Queue = lazy(() => import('./pages/staff/Queue.jsx'))
const Admissions = lazy(() => import('./pages/staff/Admissions.jsx'))
const DoseLog = lazy(() => import('./pages/staff/DoseLog.jsx'))
const CaseMap = lazy(() => import('./pages/staff/CaseMap.jsx'))
const Reports = lazy(() => import('./pages/staff/Reports.jsx'))
const Staff = lazy(() => import('./pages/staff/Staff.jsx'))
const StaffProfile = lazy(() => import('./pages/staff/StaffProfile.jsx'))
const Network = lazy(() => import('./pages/staff/Network.jsx'))
const Directory = lazy(() => import('./pages/staff/Directory.jsx'))
const HospitalSettings = lazy(() => import('./pages/staff/HospitalSettings.jsx'))
const PatientPortal = lazy(() => import('./pages/PatientPortal.jsx'))
const MyProfilePatient = lazy(() => import('./pages/patient/MyProfile.jsx'))

function RootRedirect() {
  const { user, role, loading } = useAuth()
  if (loading) return <Loader />
  return <Navigate to={user ? homePathForRole(role) : '/welcome'} replace />
}

const guarded = (cap, element) => <Can cap={cap}>{element}</Can>

export default function App() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/login" element={<Navigate to="/welcome" replace />} />
        <Route path="/login/hospital" element={<Login portal="hospital" />} />
        <Route path="/login/admin" element={<Navigate to="/login/hospital" replace />} />
        <Route path="/login/patient" element={<Login portal="patient" />} />
        <Route path="/signup" element={<Navigate to="/welcome" replace />} />
        <Route path="/signup/patient" element={<SignUpPatient />} />
        <Route path="/register-hospital" element={<RegisterHospital />} />
        <Route path="/password" element={<ChangePassword />} />

        <Route element={<PatientRoute />}>
          <Route element={<PatientLayout />}>
            <Route path="/my-treatment" element={<PatientPortal />} />
            <Route path="/my-profile" element={<MyProfilePatient />} />
          </Route>
        </Route>

        <Route element={<StaffRoute />}>
          <Route element={<AppShell />}>
            <Route path="/network" element={guarded('network.view', <Network />)} />
            <Route path="/directory" element={guarded('network.view', <Directory />)} />
            <Route path="/dashboard" element={guarded('dashboard.view', <Dashboard />)} />
            <Route path="/patients" element={guarded('patients.view', <Patients />)} />
            <Route path="/patients/new" element={guarded('patients.register', <RegisterPatient />)} />
            <Route path="/patients/:code" element={guarded('patients.view', <PatientRecord />)} />
            <Route path="/appointments" element={guarded('appointments.view', <Appointments />)} />
            <Route path="/appointments/:date" element={guarded('appointments.view', <Appointments />)} />
            <Route path="/queue" element={guarded('queue.view', <Queue />)} />
            <Route path="/admissions" element={guarded('admissions.view', <Admissions />)} />
            <Route path="/doses" element={guarded('doses.view', <DoseLog />)} />
            <Route path="/map" element={guarded('map.view', <CaseMap />)} />
            <Route path="/reports" element={guarded('reports.view', <Reports />)} />
            <Route path="/staff" element={guarded('staff.view', <Staff />)} />
            <Route path="/staff/:code" element={guarded('staff.view', <StaffProfile />)} />
            <Route path="/profile" element={<StaffProfile />} />
            <Route path="/settings" element={guarded('hospital.settings', <HospitalSettings />)} />
            <Route path="/dose-log" element={<Navigate to="/doses" replace />} />
            <Route path="/case-map" element={<Navigate to="/map" replace />} />
            <Route path="/admin/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/admin/staff" element={<Navigate to="/staff" replace />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

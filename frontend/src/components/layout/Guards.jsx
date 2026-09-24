import { Navigate, Outlet } from 'react-router-dom'
import { Loader } from '../auth/AuthLayout.jsx'
import { useAuth } from '../../context/useAuth.js'
import { homePathForRole } from '../../utils/roles.js'

export function StaffRoute() {
  const { user, loading, isHospital, role } = useAuth()
  if (loading) return <Loader />
  if (!user) return <Navigate to="/welcome" replace />
  if (!isHospital) return <Navigate to={homePathForRole(role)} replace />
  return <Outlet />
}

export function PatientRoute() {
  const { user, loading, isPatient, role } = useAuth()
  if (loading) return <Loader />
  if (!user) return <Navigate to="/welcome" replace />
  if (!isPatient) return <Navigate to={homePathForRole(role)} replace />
  if (user.mustChangePassword) return <Navigate to="/password" replace />
  return <Outlet />
}

/** Sends people away from pages their role can't use (the API refuses them anyway). */
export function Can({ cap, children }) {
  const { can, role } = useAuth()
  return can(cap) ? children : <Navigate to={homePathForRole(role)} replace />
}

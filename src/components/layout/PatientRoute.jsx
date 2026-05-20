import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { homePathForRole } from '../../utils/roles.js'

export default function PatientRoute() {
  const { user, loading, isPatient } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (!isPatient) return <Navigate to={homePathForRole('hospital')} replace />

  return <Outlet />
}

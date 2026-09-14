import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/useAuth.js'
import { homePathForRole } from '../../utils/roles.js'

export default function AdminRoute() {
  const { user, role, loading, isAdmin } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/welcome" replace />
  if (!isAdmin) return <Navigate to={homePathForRole(role)} replace />

  return <Outlet />
}

import { useAuth } from '../../context/useAuth.js'
import { roleLabel } from '../../utils/roles.js'

export default function Topbar({ title }) {
  const { user, profile, role } = useAuth()
  const label = profile?.full_name || user?.email || 'User'

  return (
    <header className="no-print flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-3 text-right">
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-xs text-gray-500">{roleLabel(role)}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-800">
          {label.slice(0, 2).toUpperCase()}
        </div>
      </div>
    </header>
  )
}

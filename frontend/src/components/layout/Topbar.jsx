import { Menu } from 'lucide-react'
import { useAuth } from '../../context/useAuth.js'
import { roleLabel } from '../../utils/roles.js'

export default function Topbar({ title, onMenuClick = null }) {
  const { user, profile, role } = useAuth()
  const label = profile?.full_name || user?.email || 'User'

  return (
    <header className="no-print flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {onMenuClick ? (
          <button
            type="button"
            onClick={onMenuClick}
            className="-ml-1 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        ) : null}
        <h1 className="truncate text-lg font-semibold text-gray-900">{title}</h1>
      </div>
      <div className="flex flex-shrink-0 items-center gap-3 text-right">
        <div className="hidden sm:block">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-xs text-gray-500">{roleLabel(role)}</p>
        </div>
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-800">
          {label.slice(0, 2).toUpperCase()}
        </div>
      </div>
    </header>
  )
}

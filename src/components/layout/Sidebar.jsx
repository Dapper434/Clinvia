import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Pill,
  Map,
  FileSpreadsheet,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-100'
  }`

export default function Sidebar() {
  const { signOut } = useAuth()

  return (
    <aside className="no-print flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">TBTrack</p>
        <p className="text-sm text-gray-500">TB case management</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        <NavLink to="/dashboard" className={linkClass} end>
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          Dashboard
        </NavLink>
        <NavLink to="/patients" className={linkClass}>
          <Users className="h-4 w-4 shrink-0" />
          Patients
        </NavLink>
        <NavLink to="/dose-log" className={linkClass}>
          <Pill className="h-4 w-4 shrink-0" />
          Dose log
        </NavLink>
        <NavLink to="/case-map" className={linkClass}>
          <Map className="h-4 w-4 shrink-0" />
          Case map
        </NavLink>
        <NavLink to="/reports" className={linkClass}>
          <FileSpreadsheet className="h-4 w-4 shrink-0" />
          Reports
        </NavLink>
      </nav>
      <div className="border-t border-gray-100 p-3">
        <button
          type="button"
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}

import { NavLink } from 'react-router-dom'
import { Pill, LogOut, X } from 'lucide-react'
import { useAuth } from '../../context/useAuth.js'

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-100'
  }`

export default function PatientSidebar({ open = false, onClose = () => {} }) {
  const { signOut } = useAuth()

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={onClose} aria-hidden="true" />
      ) : null}
      <aside
        className={`no-print fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Clinvia</p>
            <p className="text-sm text-gray-500">Patient portal</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          <NavLink to="/my-treatment" className={linkClass} end onClick={onClose}>
            <Pill className="h-4 w-4 shrink-0" />
            My treatment
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
    </>
  )
}

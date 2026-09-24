import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'

const titles = {
  '/dashboard': 'Dashboard',
  '/profile': 'My profile',
  '/patients': 'Patient registry',
  '/patients/new': 'Register patient',
  '/dose-log': 'Daily dose log',
  '/case-map': 'Case map',
  '/reports': 'Reports',
  '/admin/dashboard': 'Admin dashboard',
  '/admin/staff': 'Staff management',
}

function titleForPath(pathname) {
  if (pathname.startsWith('/patients/') && pathname !== '/patients/new') {
    return 'Patient profile'
  }
  return titles[pathname] ?? 'Clinvia'
}

export default function AppLayout() {
  const { pathname } = useLocation()
  const title = titleForPath(pathname)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      <Sidebar open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar title={title} onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

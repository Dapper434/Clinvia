import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import PatientSidebar from './PatientSidebar.jsx'
import Topbar from './Topbar.jsx'

const titles = {
  '/my-treatment': 'My treatment',
  '/my-profile': 'My profile',
}

export default function PatientLayout() {
  const { pathname } = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      <PatientSidebar open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar title={titles[pathname] ?? 'Clinvia'} onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

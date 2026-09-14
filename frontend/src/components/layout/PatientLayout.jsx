import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import PatientSidebar from './PatientSidebar.jsx'
import Topbar from './Topbar.jsx'

export default function PatientLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      <PatientSidebar open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar title="My treatment" onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

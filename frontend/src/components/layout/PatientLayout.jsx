import { Outlet } from 'react-router-dom'
import PatientSidebar from './PatientSidebar.jsx'
import Topbar from './Topbar.jsx'

export default function PatientLayout() {
  return (
    <div className="flex min-h-screen">
      <PatientSidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar title="My treatment" />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-4xl px-6 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

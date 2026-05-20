import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'

const titles = {
  '/dashboard': 'Dashboard',
  '/patients': 'Patient registry',
  '/patients/new': 'Register patient',
  '/dose-log': 'Daily dose log',
  '/case-map': 'Case map',
  '/reports': 'Reports',
}

function titleForPath(pathname) {
  if (pathname.startsWith('/patients/') && pathname !== '/patients/new') {
    return 'Patient profile'
  }
  return titles[pathname] ?? 'TBTrack'
}

export default function AppLayout() {
  const { pathname } = useLocation()
  const title = titleForPath(pathname)

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar title={title} />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl px-6 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

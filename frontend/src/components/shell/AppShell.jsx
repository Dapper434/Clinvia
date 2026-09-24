import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/useAuth.js'
import DrawerHost from '../drawers/DrawerHost.jsx'
import Sidebar from './Sidebar.jsx'
import { ShellContext } from './shellContext.js'

/** The staff app frame: sidebar, one toast at a time, the drawer host and a shared data version. */
export default function AppShell() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [message, setMessage] = useState(null)
  const [drawer, setDrawer] = useState(null)
  const [version, setVersion] = useState(0)
  const timer = useRef(null)

  const toast = useCallback((msg) => {
    clearTimeout(timer.current)
    setMessage({ msg, key: Date.now() })
    timer.current = setTimeout(() => setMessage(null), 2800)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  const value = useMemo(
    () => ({
      toast,
      menuOpen,
      setMenuOpen,
      version,
      bump: () => setVersion((v) => v + 1),
      openDrawer: (kind, props = {}) => setDrawer({ kind, props }),
      closeDrawer: () => setDrawer(null),
    }),
    [toast, menuOpen, version],
  )

  if (user?.mustChangePassword && pathname !== '/password') {
    return <Navigate to="/password" replace />
  }

  return (
    <ShellContext.Provider value={value}>
      <div className="cv">
        <div className="app">
          <Sidebar />
          <div className="main">
            <Outlet />
          </div>
        </div>
        {message ? (
          <div className="toast" role="status" key={message.key}>
            {message.msg}
          </div>
        ) : null}
      </div>
      {drawer ? <DrawerHost drawer={drawer} /> : null}
    </ShellContext.Provider>
  )
}

import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { badgesApi, hospitalsApi } from '../../api/hospital.js'
import { useAuth } from '../../context/useAuth.js'
import { roleLabel } from '../../utils/roles.js'
import {
  Mark,
  NavAdmissions,
  NavAppointments,
  NavDashboard,
  NavDirectory,
  NavDoses,
  NavMap,
  NavNetwork,
  NavPatients,
  NavReports,
  NavSettings,
  NavStaff,
} from '../ui/icons.jsx'
import { useShell } from './shellContext.js'

const GROUPS = [
  {
    items: [
      { to: '/network', label: 'Network', icon: NavNetwork, cap: 'network.view' },
      { to: '/dashboard', label: 'Dashboard', icon: NavDashboard, cap: 'dashboard.view', badge: 'attention' },
      { to: '/patients', label: 'Patients', icon: NavPatients, cap: 'patients.view' },
      { to: '/appointments', label: 'Appointments', icon: NavAppointments, cap: 'appointments.view', also: ['/queue'] },
      { to: '/admissions', label: 'Admissions & beds', icon: NavAdmissions, cap: 'admissions.view' },
    ],
  },
  {
    title: 'TB programme',
    items: [
      { to: '/doses', label: 'Dose log', icon: NavDoses, cap: 'doses.view', badge: 'dosesLeft' },
      { to: '/map', label: 'Case map', icon: NavMap, cap: 'map.view' },
      { to: '/reports', label: 'Reports', icon: NavReports, cap: 'reports.view' },
    ],
  },
  {
    title: 'Management',
    items: [
      { to: '/staff', label: 'Staff', icon: NavStaff, cap: 'staff.view' },
      { to: '/directory', label: 'People', icon: NavDirectory, cap: 'network.view' },
      { to: '/settings', label: 'Hospital settings', icon: NavSettings, cap: 'hospital.settings', notNetwork: true },
    ],
  },
]

export default function Sidebar() {
  const { user, can, isNetwork, scope, setScope, signOut } = useAuth()
  const { menuOpen, setMenuOpen, version } = useShell()
  const { pathname } = useLocation()
  const [badges, setBadges] = useState({})
  const [hospitals, setHospitals] = useState([])

  useEffect(() => {
    let alive = true
    badgesApi()
      .then((b) => alive && setBadges(b))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [pathname, version, scope])

  useEffect(() => {
    if (!isNetwork) return
    let alive = true
    hospitalsApi()
      .then((h) => alive && setHospitals(h))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [isNetwork, version])

  const current = isNetwork ? hospitals.find((h) => h.slug === scope)?.name ?? 'All hospitals' : user?.hospital?.name

  return (
    <aside className={`side${menuOpen ? ' open' : ''}`} aria-label="Main navigation">
      <Link className="brand" to={isNetwork ? '/network' : '/dashboard'} onClick={() => setMenuOpen(false)}>
        <span className="brand-mark" aria-hidden="true">
          <Mark />
        </span>
        <span>
          <b>Clinvia</b>
          <small>{current}</small>
        </span>
      </Link>

      {isNetwork ? (
        <div className="field" style={{ padding: '0 8px' }}>
          <label htmlFor="scope">Viewing</label>
          <select id="scope" value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="all">All hospitals</option>
            {hospitals.map((h) => (
              <option key={h.slug} value={h.slug}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {GROUPS.map((g, i) => {
        const items = g.items.filter((it) => can(it.cap) && !(it.notNetwork && isNetwork))
        if (!items.length) return null
        return (
          <div className="nav-group" key={i}>
            {g.title ? <p>{g.title}</p> : null}
            <nav className="nav">
              {items.map((it) => {
                const Icon = it.icon
                const count = it.badge ? badges[it.badge] : null
                const on = pathname === it.to || pathname.startsWith(`${it.to}/`) || it.also?.some((p) => pathname.startsWith(p))
                return (
                  <NavLink key={it.to} to={it.to} className={on ? 'on' : ''} onClick={() => setMenuOpen(false)}>
                    <Icon />
                    {it.label}
                    {count ? <em>{count}</em> : null}
                  </NavLink>
                )
              })}
            </nav>
          </div>
        )
      })}

      <div className="side-foot">
        <Link to="/profile" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none' }}>
          {user?.fullName}
          <span>
            {roleLabel(user?.role)}
            {user?.code ? `, ${user.code}` : ''}
          </span>
        </Link>
        <button type="button" className="link" style={{ marginTop: 8, fontSize: 12.5 }} onClick={signOut}>
          Sign out
        </button>
      </div>
    </aside>
  )
}

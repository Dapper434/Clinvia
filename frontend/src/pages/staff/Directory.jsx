import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { directoryApi } from '../../api/hospital.js'
import { ErrorNote } from '../../components/ui/bits.jsx'
import { Search } from '../../components/ui/icons.jsx'
import Page from '../../components/ui/Page.jsx'
import { useApi } from '../../components/ui/useApi.js'
import { useAuth } from '../../context/useAuth.js'
import { roleLabel } from '../../utils/roles.js'

const TYPES = [['all', 'Everyone'], ['staff', 'Staff'], ['patients', 'Patients']]
const ROLES = ['', 'admin', 'executive', 'doctor', 'clinician', 'nurse', 'receptionist', 'network_admin']
const DUTY = { on_duty: 'On duty', off_duty: 'Off duty', on_leave: 'On leave' }

export default function Directory() {
  const { scope, setScope } = useAuth()
  const navigate = useNavigate()
  const [term, setTerm] = useState('')
  const [q, setQ] = useState('')
  const [type, setType] = useState('all')
  const [role, setRole] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setQ(term.trim()), 200)
    return () => clearTimeout(t)
  }, [term])
  const { data, error, reload } = useApi(() => directoryApi({ q, type, role: type === 'patients' ? '' : role }), [q, type, role, scope])

  const openPatient = (p) => {
    setScope(p.hospitalSlug)
    navigate(`/patients/${p.code}`)
  }
  const openStaff = (s) => {
    if (s.hospitalSlug) setScope(s.hospitalSlug)
    navigate(`/staff/${s.code}`)
  }

  return (
    <Page title="People" sub={scope === 'all' ? 'All hospitals' : undefined}>
      <div className="toolbar">
        <label className="search">
          <span className="sr">Search people</span>
          <Search />
          <input type="search" placeholder="Search by name, code, email, phone or specialty" value={term} onChange={(e) => setTerm(e.target.value)} />
        </label>
        <div className="seg" role="group" aria-label="Who">
          {TYPES.map(([k, l]) => <button type="button" key={k} className={type === k ? 'on' : ''} onClick={() => setType(k)}>{l}</button>)}
        </div>
        {type !== 'patients' ? (
          <select className="sel" aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => <option key={r} value={r}>{r ? roleLabel(r) : 'Any role'}</option>)}
          </select>
        ) : null}
      </div>
      {error ? <ErrorNote error={error} onRetry={reload} /> : null}
      {type !== 'patients' ? (
        <section className="panel">
          <div className="panel-h"><h3>Staff</h3><span>{data ? `${data.staff.length}${data.staff.length === 50 ? '+' : ''} found` : ''}</span></div>
          {data?.staff.length ? (
            <div className="tbl-wrap"><table>
              <thead><tr><th>Name</th><th>Role</th><th>Specialty</th><th>Hospital</th><th>Phone</th><th>Duty</th></tr></thead>
              <tbody>
                {data.staff.map((s) => (
                  <tr key={s.code} className="click" onClick={() => openStaff(s)}>
                    <td>{s.name}<span className="sub">{s.code}, {s.email}</span></td>
                    <td>{roleLabel(s.role)}</td><td>{s.specialty || '—'}</td><td>{s.hospital || 'Network'}</td><td>{s.phone || '—'}</td>
                    <td>{s.active ? DUTY[s.duty] : <span className="pill p-done">Deactivated</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          ) : <div className="empty">{data ? 'No staff match.' : 'Searching…'}</div>}
        </section>
      ) : null}
      {type !== 'staff' && !role ? (
        <section className="panel">
          <div className="panel-h"><h3>Patients</h3><span>{data ? `${data.patients.length}${data.patients.length === 50 ? '+' : ''} found` : ''}</span></div>
          {data?.patients.length ? (
            <div className="tbl-wrap"><table>
              <thead><tr><th>Patient</th><th>Age</th><th>Hospital</th><th>Doctor</th><th>TB</th></tr></thead>
              <tbody>
                {data.patients.map((p) => (
                  <tr key={p.code} className="click" onClick={() => openPatient(p)}>
                    <td>{p.name}<span className="sub">{p.code}{p.phone ? `, ${p.phone}` : ''}</span></td>
                    <td>{p.age}, {p.gender?.[0]?.toUpperCase()}</td><td>{p.hospital}</td><td>{p.doctor || <span className="muted">Unassigned</span>}</td>
                    <td>{p.tb ? <span className={`pill ${p.tb === 'active' ? 'p-next' : 'p-done'}`}>{p.tb.replace(/_/g, ' ')}</span> : <span className="muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          ) : <div className="empty">{data ? 'No patients match.' : 'Searching…'}</div>}
        </section>
      ) : null}
    </Page>
  )
}

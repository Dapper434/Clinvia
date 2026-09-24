import { Link, useNavigate } from 'react-router-dom'
import { admissionsApi, dischargeApi, setBedStatusApi } from '../../api/wards.js'
import { useShell } from '../../components/shell/shellContext.js'
import { ErrorNote, Loading, Stat, Stats } from '../../components/ui/bits.jsx'
import { Plus } from '../../components/ui/icons.jsx'
import Page from '../../components/ui/Page.jsx'
import { useApi } from '../../components/ui/useApi.js'
import { useAuth } from '../../context/useAuth.js'
import { fmt, plural } from '../../utils/format.js'

export default function Admissions() {
  const { can, scope } = useAuth()
  const { openDrawer, version, toast, bump } = useShell()
  const navigate = useNavigate()
  const { data: a, error, reload } = useApi(admissionsApi, [scope, version])
  const admit = can('admissions.admit')
  const actions = admit ? <button type="button" className="btn primary" onClick={() => openDrawer('admit')}><Plus />Admit patient</button> : null

  if (!a) {
    return <Page title="Admissions & beds" actions={actions}>{error ? <ErrorNote error={error} onRetry={reload} /> : <Loading />}</Page>
  }

  const s = a.stats
  const act = async (fn, msg) => {
    try {
      await fn()
      toast(msg)
      bump()
    } catch (e) {
      toast(e.message)
    }
  }
  const discharge = (row) => {
    if (!window.confirm(`Discharge ${row.patient.name} from ${row.ward}? The bed will be marked for cleaning.`)) return
    act(() => dischargeApi(row.id), `${row.patient.name} discharged`)
  }

  return (
    <Page title="Admissions & beds" sub={a.hospital || 'All hospitals'} actions={actions}>
      <Stats four>
        <Stat label="Beds occupied" value={s.occupied} unit={` / ${s.beds}`} note={s.beds ? `${Math.round((100 * s.occupied) / s.beds)}% occupancy` : 'No beds yet'} />
        <Stat label="Free now" value={s.free} note={`${s.cleaning} being cleaned, ${s.reserved} reserved`} />
        <Stat label="Admitted this week" value={s.thisWeek} note="Since Monday" />
        <Stat label="Average stay" value={s.averageStay ?? '—'} unit={s.averageStay != null ? ' days' : ''} note="Discharges, last 30 days" />
      </Stats>

      <section className="panel">
        <div className="panel-h"><h3>Bed map</h3><span>{admit ? 'Select a free bed to admit, or an occupied bed to open the patient' : 'Select an occupied bed to open the patient'}</span></div>
        {a.wards.length ? (
          a.wards.map((w, i) => (
            <div className="ward" key={w.id} style={i ? { marginTop: 14 } : undefined}>
              <div className="ward-h">
                <h4>{w.name}</h4>
                <span className="muted" style={{ fontSize: 12.5 }}>{w.beds.filter((b) => b.status === 'occupied').length} of {w.capacity} occupied</span>
              </div>
              <div className="bedmap">
                {w.beds.map((b) => {
                  if (b.status === 'occupied') {
                    return (
                      <Link key={b.id} className="bed occupied" to={b.occupant ? `/patients/${b.occupant.code}` : '#'} style={{ textDecoration: 'none' }}>
                        <b>{b.label}</b><span>{b.occupant ? b.occupant.name : 'Occupied'}</span><small>{b.occupant ? `Day ${b.occupant.day}` : ''}</small>
                      </Link>
                    )
                  }
                  if (b.status === 'cleaning') {
                    return can('beds.ready') ? (
                      <button type="button" key={b.id} className="bed cleaning" onClick={() => act(() => setBedStatusApi(b.id, 'available'), `Bed ${b.label} is ready`)}>
                        <b>{b.label}</b><span>Being cleaned</span><small>Mark ready</small>
                      </button>
                    ) : (
                      <div key={b.id} className="bed cleaning"><b>{b.label}</b><span>Being cleaned</span><small /></div>
                    )
                  }
                  if (b.status === 'reserved') {
                    return <div key={b.id} className="bed reserved"><b>{b.label}</b><span>Reserved</span><small>Incoming patient</small></div>
                  }
                  return admit ? (
                    <button type="button" key={b.id} className="bed available" onClick={() => openDrawer('admit', { bedId: b.id })}>
                      <b>{b.label}</b><span className="muted">Free</span><small>Admit here</small>
                    </button>
                  ) : (
                    <div key={b.id} className="bed available"><b>{b.label}</b><span className="muted">Free</span><small /></div>
                  )
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="empty">
            <span>No wards set up yet. Add the hospital&apos;s wards and beds to start admitting patients.</span>
            {can('wards.manage') ? <Link className="btn primary" to="/settings"><Plus />Add wards</Link> : null}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-h"><h3>In the wards now</h3><span>{plural(a.open.length, 'patient')}, longest stay first</span></div>
        {a.open.length ? (
          <div className="tbl-wrap"><table>
            <thead><tr><th>Patient</th><th>Ward and bed</th><th>Reason</th><th>Doctor</th><th>Admitted</th><th className="num">Day</th><th /></tr></thead>
            <tbody>
              {a.open.map((row) => (
                <tr key={row.id}>
                  <td><Link className="link" to={`/patients/${row.patient.code}`}>{row.patient.name}</Link><span className="sub">{row.patient.code}, {row.patient.age}, {row.patient.gender}</span></td>
                  <td>{row.ward}<span className="sub">{row.bed || ''}</span></td>
                  <td>{row.reason}</td>
                  <td>{row.doctor}</td>
                  <td>{fmt(row.admitted)}</td>
                  <td className="num">{row.day}</td>
                  <td className="num">{can('admissions.discharge') ? <button type="button" className="btn sm" onClick={() => discharge(row)}>Discharge</button> : null}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        ) : <div className="empty">Nobody is admitted right now.</div>}
      </section>

      <section className="panel">
        <div className="panel-h"><h3>Discharged in the last 7 days</h3><span>{a.recentDischargeCount > 10 ? `Latest 10 of ${a.recentDischargeCount}` : a.recentDischargeCount}</span></div>
        {a.recentDischarges.length ? (
          <div className="tbl-wrap"><table>
            <thead><tr><th>Patient</th><th>Ward</th><th>Reason</th><th>Stay</th><th>Discharged</th></tr></thead>
            <tbody>
              {a.recentDischarges.map((row) => (
                <tr key={row.id} className="click" onClick={() => navigate(`/patients/${row.patient.code}`)}>
                  <td>{row.patient.name}<span className="sub">{row.patient.code}</span></td>
                  <td>{row.ward}</td><td>{row.reason}</td><td>{plural(row.stay, 'day')}</td><td>{fmt(row.discharged)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        ) : <div className="empty">No discharges this week.</div>}
      </section>
    </Page>
  )
}

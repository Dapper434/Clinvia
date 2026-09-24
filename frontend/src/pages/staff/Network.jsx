import { useNavigate } from 'react-router-dom'
import { hospitalOverviewApi, updateHospitalApi } from '../../api/hospital.js'
import { useShell } from '../../components/shell/shellContext.js'
import { ErrorNote, Loading, Stat, Stats } from '../../components/ui/bits.jsx'
import Page from '../../components/ui/Page.jsx'
import { useApi } from '../../components/ui/useApi.js'
import { useAuth } from '../../context/useAuth.js'
import { plural } from '../../utils/format.js'

export default function Network() {
  const { setScope } = useAuth()
  const { version, toast, bump } = useShell()
  const navigate = useNavigate()
  const { data: rows, error, reload } = useApi(hospitalOverviewApi, [version])

  if (!rows) return <Page title="Network">{error ? <ErrorNote error={error} onRetry={reload} /> : <Loading />}</Page>

  const sum = (k) => rows.reduce((s, r) => s + (r[k] || 0), 0)
  const beds = sum('beds')
  const open = (slug, to = '/dashboard') => {
    setScope(slug)
    navigate(to)
  }
  async function toggle(h) {
    if (h.active && !window.confirm(`Suspend ${h.name}? Its staff won't be able to sign in until you restore it.`)) return
    try {
      await updateHospitalApi(h.slug, { active: !h.active })
      toast(`${h.name} ${h.active ? 'suspended' : 'restored'}`)
      bump()
    } catch (e) {
      toast(e.message)
    }
  }

  return (
    <Page title="Network" sub={plural(rows.length, 'hospital')}>
      <p className="lead">Every hospital in the Clinvia network. Open one to see its dashboard, patients and staff exactly as its own team does, or choose “All hospitals” in the sidebar for the combined view.</p>
      <Stats label="Across the network">
        <Stat label="Patients" value={sum('patients')} note={`across ${plural(rows.length, 'hospital')}`} />
        <Stat label="On TB treatment" value={sum('activeTb')} note={`${sum('mdr')} drug-resistant (MDR)`} />
        <Stat label="Need attention" value={sum('attention')} note="Missed doses and results waiting" />
        <Stat label="Beds occupied" value={sum('bedsOccupied')} unit={` / ${beds}`} note={beds ? `${Math.round((100 * sum('bedsOccupied')) / beds)}% occupancy` : 'No wards yet'} />
        <Stat label="Staff" value={sum('staff')} note={`${sum('doctorsOnDuty')} doctors on duty`} />
      </Stats>
      <section className="panel">
        <div className="panel-h"><h3>Hospitals</h3><span>Today</span></div>
        <div className="tbl-wrap"><table>
          <thead>
            <tr>
              <th>Hospital</th><th>Staff sign-in</th><th className="num">Patients</th><th className="num">On TB</th><th className="num">Need attention</th>
              <th className="num">Beds</th><th className="num">Appointments</th><th className="num">Waiting</th><th>Status</th><th />
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => (
              <tr key={h.slug} className={h.active ? '' : 'done'}>
                <td>
                  <button type="button" className="link" onClick={() => open(h.slug)}>{h.name}</button>
                  <span className="sub">{[h.county, h.level].filter(Boolean).join(', ')}</span>
                </td>
                <td><span className="code">@{h.emailDomain}</span></td>
                <td className="num">{h.patients}</td>
                <td className="num">{h.activeTb}{h.mdr ? <span className="muted"> ({h.mdr} MDR)</span> : null}</td>
                <td className="num">{h.attention ? <b className="warn">{h.attention}</b> : <span className="muted">0</span>}</td>
                <td className="num">{h.beds ? `${h.bedsOccupied} / ${h.beds}` : <span className="muted">—</span>}</td>
                <td className="num">{h.appointmentsToday}</td>
                <td className="num">{h.waiting}</td>
                <td><span className={`pill ${h.active ? 'p-next' : 'p-red'}`}>{h.active ? 'Active' : 'Suspended'}</span></td>
                <td className="num">
                  <span className="actions" style={{ justifyContent: 'flex-end' }}>
                    <button type="button" className="btn sm" onClick={() => open(h.slug)}>Open</button>
                    <button type="button" className={`btn sm${h.active ? ' danger' : ''}`} onClick={() => toggle(h)}>{h.active ? 'Suspend' : 'Restore'}</button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </section>
    </Page>
  )
}

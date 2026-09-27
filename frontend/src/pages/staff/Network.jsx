import { useNavigate } from 'react-router-dom'
import { apiDownload } from '../../api/client.js'
import { hospitalOverviewApi } from '../../api/hospital.js'
import { useShell } from '../../components/shell/shellContext.js'
import { ErrorNote, Loading, Stat, Stats } from '../../components/ui/bits.jsx'
import Page from '../../components/ui/Page.jsx'
import { useApi } from '../../components/ui/useApi.js'
import { useAuth } from '../../context/useAuth.js'
import { band, plural } from '../../utils/format.js'

const pctText = (v) => (v == null ? '—' : `${v}%`)

/** Weighted percentage across hospitals: sum of parts over sum of wholes. */
function overall(rows, pctKey, wholeKey) {
  const whole = rows.reduce((s, r) => s + (r[pctKey] == null ? 0 : r[wholeKey]), 0)
  if (!whole) return null
  const part = rows.reduce((s, r) => s + (r[pctKey] == null ? 0 : (r[pctKey] / 100) * r[wholeKey]), 0)
  return Math.round((100 * part) / whole)
}

export default function Network() {
  const { user, setScope } = useAuth()
  const { version, toast } = useShell()
  const navigate = useNavigate()
  const { data: rows, error, reload } = useApi(hospitalOverviewApi, [version])
  const area = user?.county ? `${user.county} County` : 'every hospital on Clinvia'

  if (!rows) return <Page title="Overview">{error ? <ErrorNote error={error} onRetry={reload} /> : <Loading />}</Page>

  const sum = (k) => rows.reduce((s, r) => s + (r[k] || 0), 0)
  const beds = sum('beds')
  const open = (slug) => {
    setScope(slug)
    navigate('/dashboard')
  }
  const download = () => {
    const name = `clinvia-summary.csv`
    apiDownload('/api/exports/summary.csv', name)
      .then(() => toast(`Downloaded ${name}`))
      .catch((e) => toast(e.message))
  }

  return (
    <Page
      title="Overview"
      sub={user?.organisation || plural(rows.length, 'hospital')}
      actions={<button type="button" className="btn" onClick={download}>Download summary (CSV)</button>}
    >
      <p className="lead">
        TB programme figures for {area}, as counts and percentages. No patient or staff names are shared here. Open a
        hospital to see its dashboard, or choose one in the sidebar.
      </p>
      <Stats label="Across your hospitals">
        <Stat label="On TB treatment" value={sum('activeTb')} note={`${sum('mdr')} drug-resistant (MDR), ${sum('patients')} patients in total`} />
        <Stat label="Average adherence" value={pctText(overall(rows, 'adherenceAvg', 'activeTb'))} note={`${sum('adherenceBelow80')} patients below 80%`} />
        <Stat label="Treatment success" value={pctText(overall(rows, 'treatmentSuccessPct', 'closedEpisodes'))} note={`of ${sum('closedEpisodes')} closed episodes`} />
        <Stat label="Need attention today" value={sum('attention')} note="Missed doses and results waiting" />
        <Stat label="Bed occupancy" value={pctText(beds ? Math.round((100 * sum('bedsOccupied')) / beds) : null)} note={`${sum('bedsOccupied')} of ${beds} beds`} />
      </Stats>
      <section className="panel">
        <div className="panel-h"><h3>By hospital</h3><span>Adherence, appointments kept and no-shows over the last 30 days; success = cured or completed; doctors on duty of total</span></div>
        <div className="tbl-wrap"><table>
          <thead>
            <tr>
              <th>Hospital</th><th className="num">On TB</th><th className="num">Adherence</th><th className="num">Below 80%</th>
              <th className="num">Attention</th><th className="num">Success</th><th className="num">Beds</th>
              <th className="num">Kept</th><th className="num">No-shows</th><th className="num">Doctors</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => (
              <tr key={h.slug} className="click" onClick={() => open(h.slug)}>
                <td>{h.name}<span className="sub">{[h.county, h.level].filter(Boolean).join(', ')}</span></td>
                <td className="num">{h.activeTb}{h.mdr ? <span className="muted"> ({h.mdr} MDR)</span> : null}</td>
                <td className="num"><b style={{ color: band(h.adherenceAvg) }}>{pctText(h.adherenceAvg)}</b></td>
                <td className="num">{h.adherenceBelow80 || <span className="muted">0</span>}</td>
                <td className="num">{h.attention ? <b className="warn">{h.attention}</b> : <span className="muted">0</span>}</td>
                <td className="num">{pctText(h.treatmentSuccessPct)}</td>
                <td className="num">{pctText(h.occupancyPct)}<span className="sub">{h.beds ? `${h.bedsOccupied} of ${h.beds}` : 'No wards'}</span></td>
                <td className="num">{pctText(h.keptPct)}</td>
                <td className="num">{pctText(h.noShowPct)}</td>
                <td className="num">{h.doctorsOnDuty} <span className="muted">of {h.doctors}</span></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </section>
    </Page>
  )
}

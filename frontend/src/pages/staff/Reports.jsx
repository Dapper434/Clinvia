import { apiDownload } from '../../api/client.js'
import { reportsApi } from '../../api/tb.js'
import { useShell } from '../../components/shell/shellContext.js'
import { ErrorNote, Loading, Stat, Stats } from '../../components/ui/bits.jsx'
import Page from '../../components/ui/Page.jsx'
import { useApi } from '../../components/ui/useApi.js'
import { useAuth } from '../../context/useAuth.js'
import { MON, fmtY } from '../../utils/format.js'

const EXPORTS = [
  ['patients', 'Patient registry', (r) => `${r.totals.patients} patients with codes, facility, doctor and TB status`],
  ['tb', 'TB treatment cohort', () => 'Every episode with regimen, dates, outcome and 30-day adherence — for Ministry reporting'],
  ['appointments', 'Appointments', (r) => `${r.totals.appointments} bookings, including who booked them`],
  ['doses', 'Dose log', () => 'Every recorded dose, and whether the patient or staff logged it'],
]

export default function Reports() {
  const { scope } = useAuth()
  const { version, toast } = useShell()
  const { data: r, error, reload } = useApi(reportsApi, [scope, version])
  if (!r) return <Page title="Reports">{error ? <ErrorNote error={error} onRetry={reload} /> : <Loading />}</Page>

  const a = r.appointments
  const pct = (n) => (a.due ? `${Math.round((100 * n) / a.due)}%` : '—')
  const download = (kind) => {
    const name = `clinvia-${kind === 'tb' ? 'tb-cohort' : kind === 'doses' ? 'dose-log' : kind}-${r.today}.csv`
    apiDownload(`/api/exports/${kind}.csv`, name)
      .then(() => toast(`Downloaded ${name}`))
      .catch((e) => toast(e.message))
  }

  return (
    <Page title="Reports" sub={`As of ${fmtY(r.today)}`}>
      <Stats four>
        <Stat label="TB treatment success" value={r.success.pct != null ? `${r.success.pct}%` : '—'} note={`${r.success.ok} of ${r.success.closed} closed episodes`} />
        <Stat label="Appointments kept" value={pct(a.kept)} note={`Last 30 days, ${a.due} due`} />
        <Stat label="No-show rate" value={pct(a.noShow)} note={`${a.noShow} patients did not come`} />
        <Stat label="Booked online" value={pct(a.online)} note="By patients through the portal" />
      </Stats>
      <div className="grid g-1-1">
        <section className="panel">
          <div className="panel-h"><h3>TB enrolment by month</h3><span>By treatment start</span></div>
          {r.tbByMonth.length ? (
            <div className="tbl-wrap"><table>
              <thead><tr><th>Month</th><th className="num">Started</th><th className="num">On treatment</th><th className="num">Cured</th><th className="num">Completed</th><th className="num">Lost</th><th className="num">Died</th></tr></thead>
              <tbody>
                {r.tbByMonth.map((m) => (
                  <tr key={m.month}>
                    <td>{MON[+m.month.slice(5) - 1]} {m.month.slice(0, 4)}</td>
                    {[m.started, m.active, m.cured, m.completed, m.lost, m.died].map((v, i) => (
                      <td key={i} className={`num${v && i >= 4 ? ' warn' : ''}`}>{v || <span className="muted">0</span>}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table></div>
          ) : <div className="empty">No TB treatment started in the last 12 months.</div>}
        </section>
        <section className="panel">
          <div className="panel-h"><h3>Wards, last 30 days</h3></div>
          {r.wards.length ? (
            <div className="tbl-wrap"><table>
              <thead><tr><th>Ward</th><th className="num">Admissions</th><th className="num">Average stay</th><th className="num">Occupied now</th></tr></thead>
              <tbody>
                {r.wards.map((w) => (
                  <tr key={w.ward}>
                    <td>{w.ward}</td><td className="num">{w.admissions}</td>
                    <td className="num">{w.averageStay != null ? `${w.averageStay} days` : '—'}</td>
                    <td className="num">{w.occupied} / {w.capacity}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          ) : <div className="empty">No wards set up yet.</div>}
        </section>
      </div>
      {r.canExport ? (
        <section className="panel">
          <div className="panel-h"><h3>Exports</h3><span>CSV files open in Excel or Google Sheets</span></div>
          <div className="rows">
            {EXPORTS.map(([k, title, note]) => (
              <div className="row" key={k}>
                <div className="ficon">CSV</div>
                <div><p>{title}</p><small>{note(r)}</small></div>
                <button type="button" className="btn" onClick={() => download(k)}>Download</button>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </Page>
  )
}

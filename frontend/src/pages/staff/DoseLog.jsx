import { useState } from 'react'
import { Link } from 'react-router-dom'
import { dosesApi, saveDosesApi } from '../../api/tb.js'
import { useShell } from '../../components/shell/shellContext.js'
import { ErrorNote, Loading, PatientPill, Stat, Stats, Strip } from '../../components/ui/bits.jsx'
import { Check } from '../../components/ui/icons.jsx'
import Page from '../../components/ui/Page.jsx'
import { useApi } from '../../components/ui/useApi.js'
import { useAuth } from '../../context/useAuth.js'
import { DOSE_TIME_LABEL, dow, fmt, plural } from '../../utils/format.js'

export default function DoseLog() {
  const { can, scope } = useAuth()
  const { version, toast, bump } = useShell()
  const [day, setDay] = useState(null)
  const [pending, setPending] = useState({})
  const [busy, setBusy] = useState(false)
  const { data, error, reload } = useApi(() => dosesApi(day), [day, scope, version])
  const canLog = can('doses.log')
  const changes = Object.keys(pending).length

  async function save() {
    setBusy(true)
    try {
      const r = await saveDosesApi(data.date, Object.entries(pending).map(([code, st]) => ({ code, status: st === 't' ? 'taken' : 'missed' })))
      toast(r.locked.length ? `Saved ${plural(r.saved, 'dose')}; ${r.locked.join(', ')} already checked in` : `Saved ${plural(r.saved, 'dose')}`)
      setPending({})
      bump()
    } catch (e) {
      toast(e.message)
    } finally {
      setBusy(false)
    }
  }

  const actions = canLog ? (
    <button type="button" className="btn primary" id="save-doses" disabled={!changes || busy} onClick={save}>
      <Check />Save {changes ? plural(changes, 'dose') : 'doses'}
    </button>
  ) : null

  if (!data) {
    return <Page title="Dose log" actions={actions}>{error ? <ErrorNote error={error} onRetry={reload} /> : <Loading />}</Page>
  }

  const rows = data.rows
  const status = (r) => pending[r.code] || r.logged?.st
  const left = rows.filter((r) => !r.logged && !pending[r.code]).length
  const t = rows.filter((r) => status(r) === 't').length
  const m = rows.filter((r) => status(r) === 'm').length

  return (
    <Page title="Dose log" sub={data.date === data.today ? 'Today' : `${dow(data.date)} ${fmt(data.date)}`} actions={actions}>
      <div className="toolbar">
        <label className="sr" htmlFor="dl-day">Day</label>
        <select className="sel" id="dl-day" value={data.date} onChange={(e) => { setDay(e.target.value); setPending({}) }}>
          {data.days.map((d) => <option key={d} value={d}>{d === data.today ? 'Today' : dow(d)}, {fmt(d)}</option>)}
        </select>
        <p className="lead" style={{ flex: 1 }}>Record each directly observed dose. Doses a patient checked in themselves through the portal are already filled in.</p>
        {canLog ? (
          <button type="button" className="btn" disabled={!left}
            onClick={() => setPending((p) => ({ ...p, ...Object.fromEntries(rows.filter((r) => !r.logged && !p[r.code]).map((r) => [r.code, 't'])) }))}>
            Mark the rest as taken
          </button>
        ) : null}
      </div>
      <Stats four>
        <Stat label="Expected" value={rows.length} note="patients on treatment" />
        <Stat label="Taken" value={t} valueClass="up" note={`${rows.filter((r) => r.logged?.src === 'p' && r.logged.st === 't').length} checked in by patients`} />
        <Stat label="Missed" value={m} valueClass={m ? 'warn' : ''} note={m ? 'Follow up today' : 'None so far'} />
        <Stat label="Still to log" value={left} note={changes ? plural(changes, 'unsaved change') : 'All changes saved'} />
      </Stats>
      <section className="panel">
        {rows.length ? (
          <div className="tbl-wrap"><table>
            <thead><tr><th>Patient</th><th>Regimen</th><th>Dose time</th><th>Last 7 days</th><th>Recorded by</th><th className="num">Dose</th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const st = status(r)
                const locked = r.logged?.src === 'p' && !pending[r.code]
                const rec = locked ? <PatientPill>Checked in by patient</PatientPill>
                  : r.logged ? <span className="pill p-staff">Staff, observed</span>
                  : pending[r.code] ? <span className="pill p-amber">Not saved</span>
                  : <span className="muted">—</span>
                const disabled = locked || !canLog
                return (
                  <tr key={r.code}>
                    <td><Link className="link" to={`/patients/${r.code}`}>{r.name}</Link><span className="sub">{r.code}{r.portal ? '' : ', clinic DOT'}</span></td>
                    <td>{r.regimen}{r.mdr ? <> <span className="pill p-red">MDR</span></> : null}</td>
                    <td>{DOSE_TIME_LABEL(r.doseTime)}</td>
                    <td><Strip days={r.last7} light /></td>
                    <td>{rec}</td>
                    <td className="num">
                      <span className={`toggle${locked ? ' locked' : ''}`} role="group" aria-label={`Dose for ${r.name}`}>
                        <button type="button" className={`t${st === 't' ? ' on' : ''}`} disabled={disabled} aria-pressed={st === 't'} onClick={() => setPending({ ...pending, [r.code]: 't' })}>Taken</button>
                        <button type="button" className={`m${st === 'm' ? ' on' : ''}`} disabled={disabled} aria-pressed={st === 'm'} onClick={() => setPending({ ...pending, [r.code]: 'm' })}>Missed</button>
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table></div>
        ) : <div className="empty">Nobody was on TB treatment on this day.</div>}
      </section>
    </Page>
  )
}

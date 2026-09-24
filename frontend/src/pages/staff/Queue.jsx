import { Link } from 'react-router-dom'
import { callInApi, finishVisitApi, queueApi } from '../../api/schedule.js'
import { useShell } from '../../components/shell/shellContext.js'
import { ErrorNote, Loading, Stat, Stats } from '../../components/ui/bits.jsx'
import { Plus } from '../../components/ui/icons.jsx'
import Page from '../../components/ui/Page.jsx'
import { useApi } from '../../components/ui/useApi.js'
import { useAuth } from '../../context/useAuth.js'
import { cap, plural } from '../../utils/format.js'
import { QueueTabs } from './Appointments.jsx'

const Priority = ({ v }) => <span className={`pill ${v === 'urgent' ? 'p-red' : v === 'moderate' ? 'p-amber' : 'p-done'}`}>{cap(v)}</span>

export default function Queue() {
  const { can, scope, role } = useAuth()
  const { openDrawer, version, toast, bump } = useShell()
  const { data: q, error, reload } = useApi(queueApi, [scope, version])
  const actions = can('queue.add') ? <button type="button" className="btn primary" onClick={() => openDrawer('walkin')}><Plus />Add walk-in</button> : null

  if (!q) {
    return <Page title="Appointments" sub="Walk-in queue" actions={actions}>{error ? <ErrorNote error={error} onRetry={reload} /> : <Loading />}</Page>
  }

  const network = role === 'network_admin' && scope === 'all'
  const act = async (fn, msg) => {
    try {
      const r = await fn()
      toast(msg(r))
      bump()
    } catch (e) {
      toast(e.message)
    }
  }
  const row = (v, action) => (
    <tr key={v.id}>
      <td>{v.arrived}</td>
      <td><Link className="link" to={`/patients/${v.patient.code}`}>{v.patient.name}</Link><span className="sub">{v.patient.code}, {v.patient.age}, {v.patient.gender}{network ? `, ${v.hospital}` : ''}</span></td>
      <td><Priority v={v.priority} /></td>
      <td>{v.doctor || <span className="muted">Not yet</span>}</td>
      <td className="num">{v.waitMin} min</td>
      <td className="num">{action}</td>
    </tr>
  )
  const free = q.freeDoctors.length
  const call = can('queue.call')

  return (
    <Page title="Appointments" sub="Walk-in queue" actions={actions}>
      <div className="toolbar"><QueueTabs active="queue" /></div>
      <Stats four>
        <Stat label="Waiting" value={q.waiting.length} note={`${q.waiting.filter((v) => v.priority === 'urgent').length} urgent`} />
        <Stat label="With a doctor" value={q.inConsultation.length} note={`${plural(free, 'doctor')} free now`} />
        <Stat label="Seen today" value={q.completed.length} note={`of ${q.total} walk-ins`} />
        <Stat label="Longest wait" value={Math.max(0, ...q.waiting.map((v) => v.waitMin))} unit=" min" note="Urgent patients go first" />
      </Stats>
      <section className="panel">
        <div className="panel-h"><h3>Waiting</h3><span>Urgent first, then by arrival</span></div>
        {q.waiting.length ? (
          <div className="tbl-wrap"><table>
            <thead><tr><th>Arrived</th><th>Patient</th><th>Priority</th><th>Doctor</th><th className="num">Waiting</th><th /></tr></thead>
            <tbody>
              {q.waiting.map((v) => row(v, call ? (
                <button type="button" className="btn sm primary" disabled={!free} title={free ? undefined : 'No doctor is free'}
                  onClick={() => act(() => callInApi(v.id), (r) => `${r.patient} called in to ${r.doctor}`)}>Call in</button>
              ) : null))}
            </tbody>
          </table></div>
        ) : <div className="empty">Nobody is waiting.</div>}
      </section>
      <div className="grid g-1-1">
        <section className="panel">
          <div className="panel-h"><h3>With a doctor</h3></div>
          {q.inConsultation.length ? (
            <div className="tbl-wrap"><table><tbody>
              {q.inConsultation.map((v) => row(v, call ? (
                <button type="button" className="btn sm" onClick={() => act(() => finishVisitApi(v.id), (r) => `${r.patient} seen`)}>Finish</button>
              ) : null))}
            </tbody></table></div>
          ) : <div className="empty">No consultations in progress.</div>}
        </section>
        <section className="panel">
          <div className="panel-h"><h3>Seen today</h3><span>{q.completed.length}</span></div>
          {q.completed.length ? (
            <div className="tbl-wrap"><table><tbody>{q.completed.map((v) => row(v, <span className="pill p-done">Seen</span>))}</tbody></table></div>
          ) : <div className="empty">Nobody seen yet today.</div>}
        </section>
      </div>
    </Page>
  )
}

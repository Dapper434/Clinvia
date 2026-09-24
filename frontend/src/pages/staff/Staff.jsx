import { Link } from 'react-router-dom'
import { staffApi, updateStaffApi } from '../../api/hospital.js'
import { useShell } from '../../components/shell/shellContext.js'
import { ErrorNote, Loading, Stat, Stats } from '../../components/ui/bits.jsx'
import { Plus } from '../../components/ui/icons.jsx'
import Page from '../../components/ui/Page.jsx'
import { useApi } from '../../components/ui/useApi.js'
import { useAuth } from '../../context/useAuth.js'
import { roleLabel } from '../../utils/roles.js'

const DUTY = { on_duty: 'On duty', off_duty: 'Off duty', on_leave: 'On leave' }

export default function Staff() {
  const { scope, isNetwork, user } = useAuth()
  const { openDrawer, version, toast, bump } = useShell()
  const { data: s, error, reload } = useApi(staffApi, [scope, version])
  const pickHospitalFirst = isNetwork && scope === 'all'
  const manage = s?.canManage

  const actions = manage ? (
    <button type="button" className="btn primary" disabled={pickHospitalFirst} title={pickHospitalFirst ? 'Choose a hospital in the sidebar first' : undefined}
      onClick={() => openDrawer('staff', { domain: s.domain })}>
      <Plus />Add staff account
    </button>
  ) : null

  if (!s) return <Page title="Staff" actions={actions}>{error ? <ErrorNote error={error} onRetry={reload} /> : <Loading />}</Page>

  async function setDuty(member, duty, label) {
    try {
      await updateStaffApi(member.code, { duty })
      toast(`${member.name} is now ${label.toLowerCase()}`)
      bump()
    } catch (e) {
      toast(e.message)
    }
  }

  const st = s.stats
  return (
    <Page title="Staff" sub={`${s.rows.length} accounts`} actions={actions}>
      <p className="lead">
        {manage ? 'Staff accounts are created here — there is no public sign-up. ' : ''}Duty status controls who can be booked and who appears in the queue.
        {pickHospitalFirst && manage ? ' Choose a hospital in the sidebar to add someone.' : ''}
      </p>
      <Stats four>
        <Stat label="Doctors on duty" value={st.doctorsOnDuty} note={`of ${st.doctors} doctors`} />
        <Stat label="On leave" value={st.onLeave} note="No bookings from today" />
        <Stat label="Nurses and clinicians" value={st.nursesClinicians} note={`${st.nursesCliniciansOnDuty} on duty`} />
        <Stat label="Patients per doctor" value={st.patientsPerDoctor} note="with an assigned doctor" />
      </Stats>
      <section className="panel">
        <div className="tbl-wrap"><table>
          <thead><tr><th>Staff member</th><th>Role</th><th>Specialty</th><th>Facility</th><th className="num">Patients</th><th>Duty status</th>{manage ? <th /> : null}</tr></thead>
          <tbody>
            {s.rows.map((m) => (
              <tr key={m.code} className={m.active ? '' : 'done'}>
                <td><Link className="link" to={`/staff/${m.code}`}>{m.name}</Link><span className="sub">{m.code}, {m.email}</span></td>
                <td>{roleLabel(m.role)}{m.active ? null : <> <span className="pill p-done">Deactivated</span></>}</td>
                <td>{m.specialty || '—'}</td>
                <td>{m.hospital}</td>
                <td className="num">{m.patients || <span className="muted">—</span>}</td>
                <td>
                  {manage && m.active ? (
                    <>
                      <label className="sr" htmlFor={`duty-${m.code}`}>Duty status for {m.name}</label>
                      <select className="sel" id={`duty-${m.code}`} value={m.duty} onChange={(e) => setDuty(m, e.target.value, DUTY[e.target.value])}>
                        {Object.entries(DUTY).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                      </select>
                    </>
                  ) : (
                    <span className={`pill ${m.duty === 'on_duty' ? 'p-next' : m.duty === 'on_leave' ? 'p-amber' : 'p-done'}`}>{DUTY[m.duty]}</span>
                  )}
                </td>
                {manage ? (
                  <td className="num">
                    <button type="button" className="btn sm" onClick={() => openDrawer('staff', { staff: m, isMe: m.code === user.code })}>Edit</button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table></div>
      </section>
    </Page>
  )
}

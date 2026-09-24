import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { staffProfileApi } from '../../api/hospital.js'
import { useShell } from '../../components/shell/shellContext.js'
import { ApptStatus, Empty, ErrorNote, Loading } from '../../components/ui/bits.jsx'
import { Back } from '../../components/ui/icons.jsx'
import Page from '../../components/ui/Page.jsx'
import { useApi } from '../../components/ui/useApi.js'
import { useAuth } from '../../context/useAuth.js'
import { initials, plural } from '../../utils/format.js'
import { roleLabel } from '../../utils/roles.js'

const DUTY = { on_duty: ['p-next', 'On duty'], off_duty: ['p-done', 'Off duty'], on_leave: ['p-amber', 'On leave'] }
const TB = { active: 'On TB treatment', cured: 'TB cured', completed: 'TB completed', lost_to_follow_up: 'TB lost to follow-up', died: 'TB died', failed: 'TB failed' }

export default function StaffProfile() {
  const { code } = useParams()
  const { can, refreshProfile } = useAuth()
  const { openDrawer, version } = useShell()
  const navigate = useNavigate()
  const key = code ? code.toUpperCase() : 'me'
  const { data: s, error, reload } = useApi(() => staffProfileApi(key), [key, version])

  // After a saved edit, refresh the signed-in user so the sidebar shows the new name.
  useEffect(() => {
    if (version) refreshProfile()
  }, [version, refreshProfile])

  if (!s) {
    return <Page title={code ? 'Staff member' : 'My profile'}>{error ? <ErrorNote error={error} onRetry={reload} /> : <Loading />}</Page>
  }

  const manage = can('staff.manage') && !s.isMe
  const edit = () =>
    openDrawer('staff', {
      staff: s,
      isMe: s.isMe,
      canManage: manage || (s.isMe && can('staff.manage')),
      domain: s.email_domain,
    })

  return (
    <Page
      title={s.isMe ? 'My profile' : 'Staff member'}
      sub={s.code}
      actions={
        <>
          {s.canEdit ? <button type="button" className="btn" onClick={edit}>Edit details</button> : null}
          {s.isMe ? <Link className="btn" to="/password">Change password</Link> : null}
        </>
      }
    >
      {!s.isMe ? <Link className="back" to="/staff"><Back />All staff</Link> : null}
      <section className="ph">
        <div className="ph-id">
          <div className="avatar" aria-hidden="true">{initials(s.name)}</div>
          <div>
            <h2>{s.name}</h2>
            <p className="ph-meta">{s.code}, {roleLabel(s.role)}{s.hospital ? `, ${s.hospital}` : ''}</p>
            <div className="pills">
              <span className={`pill ${DUTY[s.duty][0]}`}>{DUTY[s.duty][1]}</span>
              {s.active ? null : <span className="pill p-red">Deactivated</span>}
            </div>
          </div>
        </div>
        <dl className="facts">
          <div><dt>Email</dt><dd>{s.email}</dd></div>
          <div><dt>Phone</dt><dd>{s.phone || '—'}</dd></div>
          <div><dt>Specialty</dt><dd>{s.specialty || '—'}</dd></div>
          {s.lastLogin !== undefined ? <div><dt>Last signed in</dt><dd>{s.lastLogin ? new Date(s.lastLogin).toLocaleString() : 'Not yet'}</dd></div> : null}
        </dl>
      </section>

      <div className="grid g-1-1">
        <section className="panel">
          <div className="panel-h"><h3>{s.isMe ? 'My patients' : 'Assigned patients'}</h3><span>{plural(s.patientCount, 'patient')}</span></div>
          {s.patients.length ? (
            <div className="tbl-wrap"><table><tbody>
              {s.patients.map((p) => (
                <tr key={p.code} className="click" onClick={() => navigate(`/patients/${p.code}`)}>
                  <td><span className="code">{p.code}</span></td>
                  <td>{p.name}</td>
                  <td>{p.age}, {p.gender}</td>
                  <td>{p.tb ? <span className={`pill ${p.tb === 'active' ? 'p-next' : 'p-done'}`}>{TB[p.tb]}</span> : null}</td>
                </tr>
              ))}
            </tbody></table></div>
          ) : <Empty>{s.patientCount ? `${plural(s.patientCount, 'patient')} assigned.` : 'No patients assigned yet.'}</Empty>}
        </section>
        <section className="panel">
          <div className="panel-h"><h3>Today&apos;s appointments</h3><span>{plural(s.today.length, 'appointment')}</span></div>
          {s.today.length ? (
            <div className="tbl-wrap"><table><tbody>
              {s.today.map((a, i) => (
                <tr key={i}>
                  <td>{a.time}</td>
                  <td>{a.patient ? <Link className="link" to={`/patients/${a.patient.code}`}>{a.patient.name}</Link> : null}</td>
                  <td>{a.reason}</td>
                  <td><ApptStatus status={a.status} /></td>
                </tr>
              ))}
            </tbody></table></div>
          ) : <Empty>No appointments today.</Empty>}
        </section>
      </div>
    </Page>
  )
}

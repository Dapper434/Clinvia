import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { doctorsApi } from '../../api/hospital.js'
import { dayScheduleApi, setAppointmentStatusApi, weekApi } from '../../api/schedule.js'
import { useShell } from '../../components/shell/shellContext.js'
import { ApptStatus, BookedBy, ErrorNote, Loading, Stat, Stats } from '../../components/ui/bits.jsx'
import { Left, Plus, Right } from '../../components/ui/icons.jsx'
import Page from '../../components/ui/Page.jsx'
import { useApi } from '../../components/ui/useApi.js'
import { useAuth } from '../../context/useAuth.js'
import { addDays, dow, dt, fmt, fmtY, isWeekend, monday, plural, shortHospital } from '../../utils/format.js'

export function QueueTabs({ active, waiting }) {
  const on = { border: 0, borderRadius: 0, background: 'var(--ink)', color: '#fff' }
  const off = { border: 0, borderRadius: 0 }
  return (
    <div className="seg" role="tablist">
      <Link className="btn" style={active === 'schedule' ? on : off} to="/appointments" role="tab" aria-selected={active === 'schedule'}>Schedule</Link>
      <Link className="btn" style={active === 'queue' ? on : off} to="/queue" role="tab" aria-selected={active === 'queue'}>
        Walk-in queue{waiting != null ? <span className={active === 'queue' ? '' : 'muted'}>&nbsp;{waiting} waiting</span> : null}
      </Link>
    </div>
  )
}

const memory = { doctor: '' }

export default function Appointments() {
  const { date } = useParams()
  const { can, role, user, scope } = useAuth()
  const { openDrawer, version, toast, bump } = useShell()
  const [doctor, setDoctor] = useState(memory.doctor || (role === 'doctor' ? user.code : ''))
  const { data: doctors } = useApi(() => doctorsApi(false), [scope])
  const { data, error, reload } = useApi(() => dayScheduleApi(date, doctor), [date, doctor, scope, version])
  const today = data?.today
  const day = data?.date
  const { data: week } = useApi(() => (day ? weekApi(day, doctor) : Promise.resolve(null)), [day, doctor, scope, version])

  const chooseDoctor = (code) => {
    memory.doctor = code
    setDoctor(code)
  }

  const book = can('appointments.book')
  const actions = book ? <button type="button" className="btn primary" onClick={() => openDrawer('book', { today, date: day })}><Plus />Book appointment</button> : null

  if (!data) {
    return <Page title="Appointments" actions={actions}>{error ? <ErrorNote error={error} onRetry={reload} /> : <Loading />}</Page>
  }

  const firstNext = day === today ? data.rows.find((a) => a.status === 'scheduled') : null
  const st = data.stats
  const wk = monday(day)
  const doctorName = doctors?.find((d) => d.code === doctor)?.name

  async function setStatus(a, status, msg) {
    try {
      await setAppointmentStatusApi(a.id, status)
      toast(msg)
      bump()
    } catch (e) {
      toast(e.message)
    }
  }

  return (
    <Page title="Appointments" actions={actions}>
      <div className="toolbar">
        <QueueTabs active="schedule" />
        <span style={{ flex: 1 }} />
        <label className="sr" htmlFor="doc-f">Doctor</label>
        <select className="sel" id="doc-f" value={doctor} onChange={(e) => chooseDoctor(e.target.value)}>
          <option value="">All doctors</option>
          {(doctors || []).map((d) => (
            <option key={d.code} value={d.code}>{d.name}{d.duty === 'on_leave' ? ' (on leave)' : ''}</option>
          ))}
        </select>
      </div>

      <nav className="week" aria-label="Choose a day">
        <Link className="nav-arrow" to={`/appointments/${addDays(wk, -7)}`} aria-label="Previous week"><Left /></Link>
        {(week?.days || [...Array(7)].map((_, i) => ({ date: addDays(wk, i), count: 0 }))).map(({ date: d, count }) => {
          const we = isWeekend(d)
          return (
            <Link key={d} className={`wd${d === day ? ' on' : ''}${d === today ? ' today' : ''}${we ? ' weekend' : ''}`} to={`/appointments/${d}`} style={{ textDecoration: 'none' }}>
              <small>{dow(d)}</small>
              <b>{dt(d).getUTCDate()}</b>
              <em>{we && !count ? 'Closed' : plural(count, 'booking')}</em>
            </Link>
          )
        })}
        <Link className="nav-arrow" to={`/appointments/${addDays(wk, 7)}`} aria-label="Next week"><Right /></Link>
      </nav>

      <Stats four>
        <Stat label={day === today ? 'Booked today' : `Booked on ${dow(day)} ${fmt(day)}`} value={st.booked} note={doctor ? `for ${doctorName ?? ''}` : 'across all doctors'} />
        <Stat label="Seen" value={st.seen} note={`${st.scheduled} still to come`} />
        <Stat label="Did not come or cancelled" value={st.noShow + st.cancelled} note={`${st.noShow} no-shows`} />
        <Stat label="Booked online by patients" value={st.online} note={`${st.booked ? Math.round((100 * st.online) / st.booked) : 0}% of bookings`} />
      </Stats>

      <section className="panel">
        <div className="panel-h"><h3>{dow(day)} {fmtY(day)}</h3><span>Clinic runs 08:00 to 16:00</span></div>
        {data.rows.length ? (
          <div className="tbl-wrap"><table>
            <thead><tr><th>Time</th><th>Patient</th><th>Reason</th><th>Doctor</th>{scope === 'all' && role === 'network_admin' ? <th>Hospital</th> : null}<th>Booked by</th><th>Status</th><th /></tr></thead>
            <tbody>
              {data.rows.map((a) => (
                <tr key={a.id} className={a.status === 'completed' ? 'done' : a === firstNext ? 'now' : ''}>
                  <td>{a.time}</td>
                  <td><Link className="link" to={`/patients/${a.patient.code}`}>{a.patient.name}</Link><span className="sub">{a.patient.code}</span></td>
                  <td>{a.reason}</td>
                  <td>{a.doctor}</td>
                  {scope === 'all' && role === 'network_admin' ? <td>{shortHospital(a.hospital)}</td> : null}
                  <td><BookedBy via={a.via} /></td>
                  <td><ApptStatus status={a.status} next={a === firstNext} /></td>
                  <td>
                    {a.status === 'scheduled' && book ? (
                      <span className="actions" style={{ justifyContent: 'flex-end' }}>
                        {day <= today ? <button type="button" className="btn sm" onClick={() => setStatus(a, 'completed', 'Marked as seen')}>Mark seen</button> : null}
                        <button type="button" className="btn sm danger" onClick={() => setStatus(a, 'cancelled', 'Appointment cancelled')}>Cancel</button>
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        ) : (
          <div className="empty">
            <span>{isWeekend(day) ? 'The outpatient clinic is closed at weekends.' : 'Nothing booked for this day yet.'}</span>
            {day >= today && !isWeekend(day) && book ? (
              <button type="button" className="btn primary" onClick={() => openDrawer('book', { today, date: day })}><Plus />Book appointment</button>
            ) : null}
          </div>
        )}
      </section>
    </Page>
  )
}

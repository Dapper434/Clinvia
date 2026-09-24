import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { dashboardApi } from '../../api/hospital.js'
import AdmissionsChart from '../../components/charts/AdmissionsChart.jsx'
import DoseChart from '../../components/charts/DoseChart.jsx'
import { useShell } from '../../components/shell/shellContext.js'
import { ApptStatus, BookedBy, Empty, ErrorNote, Loading, Stat, Stats, Strip } from '../../components/ui/bits.jsx'
import { Check, Plus } from '../../components/ui/icons.jsx'
import Page from '../../components/ui/Page.jsx'
import { useApi } from '../../components/ui/useApi.js'
import { useAuth } from '../../context/useAuth.js'
import { addDays, band, diffDays, dow, dowLong, fmt, plural, surname, shortHospital } from '../../utils/format.js'

function why(a, today) {
  if (a.kind === 'missed') {
    const lead = `Missed ${a.streak === 2 && a.todayLogged ? 'today and yesterday' : `${a.streak} days in a row`}.`
    let rest = ''
    if (a.notConverted) rest = ' Sputum still positive at month 2.'
    else if (a.mdr) rest = ' Drug-resistant, so every dose counts.'
    else if (a.portal && a.lastCheckIn) rest = ` Last checked in ${a.gender === 'male' ? 'himself' : 'herself'} on ${fmt(a.lastCheckIn)}.`
    return (
      <>
        <b>{lead}</b>
        {rest}
      </>
    )
  }
  if (a.kind === 'not_converted') {
    return (
      <>
        <b>Sputum not converted at month 2.</b> Collected {fmt(a.collected)}.
      </>
    )
  }
  return (
    <>
      <b>GeneXpert result pending</b> since {diffDays(today, a.collected) === 1 ? 'yesterday' : fmt(a.collected)}. {a.notes || ''}
    </>
  )
}

function meta(a, network) {
  if (a.kind === 'pending_genexpert') return `${a.age}, ${a.gender}, presumptive TB${network ? `, ${a.hospital}` : ''}`
  const where = a.where?.ward ? `in ${a.where.ward}${a.where.bed ? `, bed ${a.where.bed}` : ''}${network ? `, ${a.hospital}` : ''}` : a.where?.place
  return `${a.age}, ${a.gender}${a.mdr ? ', MDR-TB' : ''}, ${where}`
}

function AttentionPanel({ rows, today, network }) {
  return (
    <section className="attn" aria-labelledby="attn-h">
      <div className="attn-head">
        <div className="count">{rows.length}</div>
        <h2 id="attn-h">{rows.length === 1 ? 'patient needs' : 'patients need'} attention today</h2>
        <p>Missed doses, unconverted sputum and results still waiting. Most urgent first.</p>
      </div>
      <div className="attn-list">
        {rows.length ? (
          rows.map((a) => (
            <div className="attn-row" key={`${a.code}-${a.kind}`}>
              <div className="who">
                <Link to={`/patients/${a.code}`}>{a.name}</Link>
                <small>
                  {a.code}, {meta(a, network)}
                </small>
              </div>
              <div className="why">{why(a, today)}</div>
              <div>
                {a.days ? (
                  <>
                    <Strip days={a.days} />
                    <div className="strip-label">
                      <span>{dow(addDays(today, -6))}</span>
                      <span>Today</span>
                    </div>
                  </>
                ) : (
                  <span style={{ color: '#A8BDB8', fontSize: 12 }}>No doses yet</span>
                )}
              </div>
              <span className="tag-dark">{a.adherence != null ? `${a.adherence}% adherence` : 'Not on treatment'}</span>
            </div>
          ))
        ) : (
          <p className="why" style={{ paddingTop: 2 }}>
            Nobody needs follow-up right now. Patients who miss two doses in a row, or whose results need action, will show here.
          </p>
        )}
      </div>
    </section>
  )
}

function SummaryPanel({ s }) {
  const parts = [
    s.missed ? `${plural(s.missed, 'patient')} missing doses` : null,
    s.notConverted ? `${s.notConverted} not converted at month 2` : null,
    s.pending ? `${plural(s.pending, 'result')} still pending` : null,
  ].filter(Boolean)
  return (
    <section className="attn" aria-labelledby="attn-h">
      <div className="attn-head">
        <div className="count">{s.total}</div>
        <h2 id="attn-h">{s.total === 1 ? 'patient needs' : 'patients need'} attention today</h2>
        <p>Counts only. The clinical team sees who they are.</p>
      </div>
      <div className="attn-list">
        <p className="why" style={{ paddingTop: 2 }}>{parts.length ? `${parts.join(', ')}.` : 'Nobody needs follow-up right now.'}</p>
      </div>
    </section>
  )
}

const pct = (a, b) => (b ? `${(100 * a) / b}%` : '0%')

export default function Dashboard() {
  const { can, role, scope } = useAuth()
  const { openDrawer, version } = useShell()
  const navigate = useNavigate()
  const [mine, setMine] = useState(false)
  const { data: d, error, loading, reload } = useApi(() => dashboardApi(mine), [scope, version, mine])

  const actions = (
    <>
      {can('patients.register') ? (
        <Link className="btn" to="/patients/new"><Plus />Register patient</Link>
      ) : null}
      {can('appointments.book') ? (
        <button type="button" className="btn" onClick={() => openDrawer('book', { today: d?.today })}><Plus />Book appointment</button>
      ) : null}
      {can('admissions.admit') ? (
        <Link className="btn" to="/admissions"><Plus />Admit patient</Link>
      ) : null}
      {can('doses.log') ? (
        <Link className="btn primary" to="/doses"><Check />Log today&apos;s doses</Link>
      ) : null}
    </>
  )

  if (!d) {
    return (
      <Page title="Today" actions={actions}>
        {error ? <ErrorNote error={error} onRetry={reload} /> : <Loading />}
      </Page>
    )
  }

  const s = d.stats
  const diff = s.appointmentsToday - s.sameDayLastWeek
  const firstNext = d.schedule.find((a) => a.status === 'scheduled')
  const seen = d.schedule.filter((a) => a.status === 'completed').length
  const q = d.queue
  const outcomes = d.outcomes || {}
  const closed = Object.values(outcomes).reduce((a, b) => a + b, 0)
  const success = closed ? Math.round((100 * ((outcomes.cured || 0) + (outcomes.completed || 0))) / closed) : 0
  const lw = Math.floor(q.longestWaitMin / 60)
  const clinical = Array.isArray(d.attention)

  return (
    <Page title="Today" sub={`${dowLong(d.today)} ${fmt(d.today)}`} actions={actions}>
      {role === 'doctor' ? (
        <div className="toolbar">
          <div className="seg" role="group" aria-label="Whose day">
            <button type="button" className={!mine ? 'on' : ''} onClick={() => setMine(false)}>Whole hospital</button>
            <button type="button" className={mine ? 'on' : ''} onClick={() => setMine(true)}>My patients and schedule</button>
          </div>
          {loading ? <span className="muted">Updating…</span> : null}
        </div>
      ) : null}

      {clinical ? <AttentionPanel rows={d.attention} today={d.today} network={d.network} /> : null}
      {d.attentionSummary ? <SummaryPanel s={d.attentionSummary} /> : null}

      <Stats label="Today at a glance">
        <Stat label="Appointments today" value={s.appointmentsToday}
          note={<>{diff === 0 ? 'Same as' : <span className={diff > 0 ? 'up' : 'warn'}>{diff > 0 ? 'Up' : 'Down'} from {s.sameDayLastWeek}</span>} last {dow(d.today)}</>} />
        <Stat label="Walk-ins" value={s.walkIns} note={`${s.waiting} still waiting`} />
        <Stat label="Beds occupied" value={s.bedsOccupied} unit={` / ${s.beds}`}
          note={s.beds ? `${Math.round((100 * s.bedsOccupied) / s.beds)}% across ${plural(s.wards, 'ward')}` : 'No wards set up yet'} />
        {role !== 'receptionist' ? <Stat label="On TB treatment" value={s.activeTb} note={`${s.mdr} drug-resistant (MDR)`} /> : null}
        <Stat label="Doctors on duty" value={s.doctorsOnDuty}
          note={s.doctorsOnLeave.length ? `${s.doctorsOnLeave.map((n) => `Dr. ${surname(n)}`).join(', ')} on leave` : 'Nobody on leave'} />
      </Stats>

      <div className="grid g-2-1">
        <section className="panel">
          {d.scheduleByDoctor ? (
            <>
              <div className="panel-h"><h3>Today&apos;s clinics</h3><span>{plural(s.appointmentsToday, 'appointment')} across {plural(d.scheduleByDoctor.length, 'doctor')}</span></div>
              {d.scheduleByDoctor.length ? (
                <div className="tbl-wrap"><table>
                  <thead><tr><th>Doctor</th><th className="num">Booked</th><th className="num">Seen</th></tr></thead>
                  <tbody>{d.scheduleByDoctor.map((r) => <tr key={r.doctor}><td>{r.doctor}</td><td className="num">{r.booked}</td><td className="num">{r.seen}</td></tr>)}</tbody>
                </table></div>
              ) : <Empty>No appointments booked for today.</Empty>}
            </>
          ) : (
            <>
              <div className="panel-h">
                <h3>{d.mine ? 'My schedule' : "Today's schedule"}</h3>
                <span>
                  {plural(d.schedule.length, 'appointment')}, {seen} seen. {can('appointments.view') ? <Link className="link" to="/appointments">Open schedule</Link> : null}
                </span>
              </div>
              {d.schedule.length ? (
                <div className="tbl-wrap"><table>
                  <thead><tr><th>Time</th><th>Patient</th><th>Reason</th><th>Doctor</th>{d.network ? <th>Hospital</th> : null}<th>Booked by</th><th>Status</th></tr></thead>
                  <tbody>
                    {d.schedule.map((a) => {
                      const now = a === firstNext
                      return (
                        <tr key={a.id} className={`${a.status === 'completed' ? 'done' : now ? 'now' : ''} click`} onClick={() => navigate(`/patients/${a.patient.code}`)}>
                          <td>{a.time}</td>
                          <td>{a.patient.name}<span className="sub">{a.patient.code}</span></td>
                          <td>{a.reason}</td>
                          <td>{a.doctor}</td>
                          {d.network ? <td>{shortHospital(a.hospital)}</td> : null}
                          <td><BookedBy via={a.via} /></td>
                          <td><ApptStatus status={a.status} next={now} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table></div>
              ) : (
                <Empty action={can('appointments.book') ? <button type="button" className="btn primary" onClick={() => openDrawer('book', { today: d.today })}><Plus />Book appointment</button> : null}>
                  No appointments booked for today.
                </Empty>
              )}
            </>
          )}
        </section>
        <div className="stack">
          <section className="panel">
            <div className="panel-h"><h3>Outpatient queue</h3><span>{can('queue.view') ? <Link className="link" to="/queue">Open queue</Link> : null}</span></div>
            <div className="qbar" role="img" aria-label={`${q.completed} seen, ${q.inConsultation} with a doctor, ${q.waiting} waiting`}>
              <i style={{ width: pct(q.completed, q.total), background: 'var(--ink-3)' }} />
              <i style={{ width: pct(q.inConsultation, q.total), background: 'var(--teal)' }} />
              <i style={{ width: pct(q.waiting, q.total), background: 'var(--amber)' }} />
            </div>
            <div className="qlist">
              <div><span><i className="dot" style={{ background: 'var(--amber)' }} />Waiting</span><b>{q.waiting}</b></div>
              <div><span><i className="dot" style={{ background: 'var(--teal)' }} />With a doctor</span><b>{q.inConsultation}</b></div>
              <div><span><i className="dot" style={{ background: 'var(--ink-3)' }} />Seen</span><b>{q.completed}</b></div>
            </div>
            <p className="qnote">
              {q.total ? (
                <>Longest wait: <b>{lw ? `${lw} h ` : ''}{q.longestWaitMin % 60} min</b>{q.urgentWaiting ? `, ${plural(q.urgentWaiting, 'patient')} marked urgent` : ''}.</>
              ) : 'No walk-ins yet today.'}
            </p>
          </section>
          <section className="panel">
            <div className="panel-h"><h3>Beds by ward</h3><span>{s.bedsFree} free. {can('admissions.view') ? <Link className="link" to="/admissions">Open bed map</Link> : null}</span></div>
            {d.bedsByWard.length ? (
              <div className="beds">
                {d.bedsByWard.map((w) => {
                  const cells = []
                  for (let i = 0; i < w.capacity; i++) cells.push(i < w.occupied ? 'o' : i < w.occupied + w.cleaning ? 'c' : i < w.occupied + w.cleaning + w.reserved ? 'r' : '')
                  return (
                    <div className="bed-row" key={w.id}>
                      <p>{w.name}</p>
                      <small>{w.occupied} of {w.capacity}</small>
                      <div className="bed-bar" aria-hidden="true">{cells.map((c, i) => <i key={i} className={c} />)}</div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <Empty action={can('wards.manage') ? <Link className="btn" to="/settings"><Plus />Add wards</Link> : null}>No wards set up yet.</Empty>
            )}
          </section>
        </div>
      </div>

      <div className="grid g-1-1">
        <section className="panel chart">
          <div className="panel-h"><h3>Admitted and discharged</h3><span>Per week, last 8 weeks</span></div>
          <AdmissionsChart weeks={d.weeklyAdmissions} />
          <div className="legend">
            <span><i style={{ background: 'var(--teal)', height: 3, width: 16 }} />Admitted</span>
            <span><i style={{ background: 'repeating-linear-gradient(90deg,var(--ink-2) 0 4px,transparent 4px 7px)', height: 2, width: 16 }} />Discharged</span>
            <span className="muted">This week runs Monday to today</span>
          </div>
        </section>
        {d.doseDays ? (
          <section className="panel chart">
            <div className="panel-h"><h3>TB doses, last 7 days</h3><span>{s.activeTb} expected each day</span></div>
            <DoseChart days={d.doseDays} />
            <div className="legend">
              <span><i style={{ background: 'var(--teal)' }} />Taken</span>
              <span><i style={{ background: 'var(--red)' }} />Missed</span>
              <span><i style={{ border: '1px dashed var(--ink-3)' }} />Not logged yet</span>
            </div>
          </section>
        ) : null}
      </div>

      {d.outcomes ? (
        <div className="grid g-1-1">
          <section className="panel">
            <div className="panel-h"><h3>Adherence, last 30 days</h3><span>Line marks the 80% target</span></div>
            {d.adherence ? (
              d.adherence.length ? (
                <div className="adh">
                  {d.adherence.map((r) => (
                    <div className="adh-row" key={r.code}>
                      <Link to={`/patients/${r.code}`}>{r.name}</Link>
                      <div className="adh-track" aria-hidden="true"><i style={{ width: `${r.value ?? 0}%`, background: band(r.value) }} /></div>
                      <b style={{ color: r.value != null && r.value < 60 ? 'var(--red)' : 'var(--ink)' }}>{r.value != null ? `${r.value}%` : '—'}</b>
                    </div>
                  ))}
                </div>
              ) : <Empty>Nobody is on TB treatment yet.</Empty>
            ) : (
              <div className="qlist">
                <div><span><i className="dot" style={{ background: 'var(--teal)' }} />80% or more</span><b>{d.adherenceBands.good}</b></div>
                <div><span><i className="dot" style={{ background: 'var(--amber)' }} />60–79%</span><b>{d.adherenceBands.watch}</b></div>
                <div><span><i className="dot" style={{ background: 'var(--red)' }} />Under 60%</span><b>{d.adherenceBands.poor}</b></div>
                <p className="qnote">Average adherence: <b>{d.adherenceBands.average != null ? `${d.adherenceBands.average}%` : '—'}</b></p>
              </div>
            )}
          </section>
          <div className="stack">
            <section className="panel">
              <div className="panel-h"><h3>Treatment outcomes</h3><span>{plural(closed, 'closed episode')}</span></div>
              {closed ? (
                <>
                  <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                    <b style={{ fontSize: 22, color: 'var(--ink)', fontWeight: 600 }}>{success}%</b>&nbsp; treatment success (cured or completed)
                  </p>
                  <div className="ob" role="img" aria-label={`${outcomes.cured || 0} cured, ${outcomes.completed || 0} completed, ${outcomes.lost_to_follow_up || 0} lost to follow-up, ${outcomes.died || 0} died`}>
                    {[['cured', 'var(--teal)'], ['completed', '#5FA89E'], ['lost_to_follow_up', 'var(--amber)'], ['died', 'var(--red)'], ['failed', 'var(--ink-2)']]
                      .filter(([k]) => outcomes[k])
                      .map(([k, c]) => <i key={k} style={{ flex: outcomes[k], background: c }}>{outcomes[k]}</i>)}
                  </div>
                  <div className="legend" style={{ marginTop: 0 }}>
                    <span><i style={{ background: 'var(--teal)' }} />Cured</span>
                    <span><i style={{ background: '#5FA89E' }} />Completed</span>
                    <span><i style={{ background: 'var(--amber)' }} />Lost to follow-up</span>
                    <span><i style={{ background: 'var(--red)' }} />Died</span>
                  </div>
                </>
              ) : <Empty>No TB treatment has finished yet.</Empty>}
            </section>
            {d.recent ? (
              <section className="panel">
                <div className="panel-h"><h3>Recently registered</h3><span><Link className="link" to="/patients">All patients</Link></span></div>
                {d.recent.length ? (
                  <div className="tbl-wrap"><table><tbody>
                    {d.recent.map((p) => (
                      <tr key={p.code} className="click" onClick={() => navigate(`/patients/${p.code}`)}>
                        <td><span className="code">{p.code}</span></td><td>{p.name}</td><td>{p.age}, {p.gender}</td><td className="num muted">{fmt(p.registered)}</td>
                      </tr>
                    ))}
                  </tbody></table></div>
                ) : (
                  <Empty action={can('patients.register') ? <Link className="btn primary" to="/patients/new"><Plus />Register patient</Link> : null}>No patients registered yet.</Empty>
                )}
              </section>
            ) : null}
          </div>
        </div>
      ) : null}
    </Page>
  )
}

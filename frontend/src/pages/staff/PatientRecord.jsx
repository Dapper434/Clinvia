import { Link, useParams } from 'react-router-dom'
import { apiDownload } from '../../api/client.js'
import { newLinkCodeApi, patientRecordApi, screenContactApi, stopMedicationApi } from '../../api/patients.js'
import { useShell } from '../../components/shell/shellContext.js'
import { Empty, ErrorNote, Loading, PatientPill } from '../../components/ui/bits.jsx'
import { Back, Plus } from '../../components/ui/icons.jsx'
import Page from '../../components/ui/Page.jsx'
import { useApi } from '../../components/ui/useApi.js'
import { useAuth } from '../../context/useAuth.js'
import { addDays, band, cap, diffDays, dow, dt, fmt, fmtY, initials, plural } from '../../utils/format.js'

const FILE_LABEL = { prescription: 'Prescription', xray: 'Chest X-ray', lab_report: 'Lab report', referral: 'Referral letter', discharge_summary: 'Discharge summary' }
const LAB_PILL = { positive: 'p-red', abnormal: 'p-amber', pending: 'p-done', negative: 'p-next', normal: 'p-next' }
const OUTCOME = { cured: 'Cured', completed: 'Treatment completed', lost_to_follow_up: 'Lost to follow-up', died: 'Died', failed: 'Treatment failed' }
const APPT_PILL = { completed: ['p-done', 'Attended'], scheduled: ['p-next', 'Booked'], no_show: ['p-red', 'Did not come'], cancelled: ['p-done', 'Cancelled'] }
const doseTimeLabel = (t) => (!t || t === '07:00' ? 'Before breakfast' : t === '19:00' ? 'After supper' : t)

function DoseCalendar({ r, first }) {
  const e = r.episode
  const today = r.today
  const d = r.doses
  const from = e.start > addDays(today, -41) ? e.start : addDays(today, -41)
  const cells = []
  const pad = (dt(from).getUTCDay() + 6) % 7
  for (let i = 0; i < pad; i++) cells.push(<div key={`p${i}`} className="day pad" />)
  for (let day = from; day <= today; day = addDays(day, 1)) {
    const v = d.log[day]
    const cls = !v ? 'n' : v.st === 'm' ? 'm' : v.src === 'p' ? 'tp' : 't'
    const mk = !v ? 'Not yet' : v.st === 'm' ? 'Missed' : v.src === 'p' ? `By ${first}` : 'By staff'
    const lbl = dt(day).getUTCDate() === 1 || day === from ? fmt(day) : dt(day).getUTCDate()
    cells.push(
      <div key={day} className={`day ${cls}`}>
        <b>{lbl}</b>
        <span className="mk">{mk}</span>
      </div>,
    )
  }
  return (
    <section className="panel">
      <div className="panel-h">
        <h3>Doses</h3>
        <span>{from === e.start ? 'Since treatment started' : 'Last 6 weeks'}, {fmt(from)} to today</span>
      </div>
      <div className="cal-head" aria-hidden="true">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((x) => <span key={x}>{x}</span>)}
      </div>
      <div className="cal">{cells}</div>
      <div className="legend">
        <span><i style={{ background: 'var(--indigo-wash)', border: '1px solid var(--indigo)' }} />Checked in by {first}</span>
        <span><i style={{ background: 'var(--teal-wash)', border: '1px solid var(--teal)' }} />Observed by staff</span>
        <span><i style={{ background: 'var(--red-wash)', border: '1px solid var(--red)' }} />Missed</span>
        <span><i style={{ border: '1px dashed var(--ink-3)' }} />Not logged yet</span>
      </div>
      <div className="cal-sum">
        <div><b style={{ color: band(d.adherence) }}>{d.adherence != null ? `${d.adherence}%` : '—'}</b>adherence, last 30 days</div>
        <div><b>{d.taken} of {d.logged}</b>doses taken</div>
        {r.patient.portal ? <div><b>{d.byPatient}</b>checked in by {first}</div> : <div><b>Clinic</b>directly observed</div>}
        <div><b>{d.streak ? plural(d.streak, 'day') : 'None'}</b>current missed streak</div>
      </div>
    </section>
  )
}

export default function PatientRecord() {
  const { code: raw } = useParams()
  const code = (raw || '').toUpperCase()
  const { can, scope } = useAuth()
  const { openDrawer, version, toast, bump } = useShell()
  const { data: r, error, reload } = useApi(() => patientRecordApi(code), [code, scope, version])

  if (!r) {
    return (
      <Page title={error ? 'Patient not found' : 'Patient record'} sub={code}>
        {error ? (
          <div className="empty">
            <span>{error}</span>
            <Link className="btn primary" to="/patients">Back to patients</Link>
          </div>
        ) : <Loading />}
      </Page>
    )
  }

  const p = r.patient
  const e = r.episode
  const active = e && e.status === 'active'
  const adm = r.admissions.find((a) => !a.discharged)
  const first = p.name.split(' ')[0]
  const pron = p.gender === 'male' ? ['him', 'his'] : ['her', 'her']
  const today = r.today
  const d = r.doses
  const streak = d?.streak || 0
  const patient = { code: p.code, name: p.name, doctorCode: r.doctor?.code }
  const book = (props = {}) => openDrawer('book', { patient, today, ...props })

  const upcoming = r.appointments.filter((a) => a.status === 'scheduled' && a.at.slice(0, 10) >= today)
  const past = r.appointments.filter((a) => !upcoming.includes(a)).reverse()
  const meds = r.medications || []
  const labs = r.labs || []
  const files = r.files || []

  const actions = (
    <>
      {can('appointments.book') ? <button type="button" className="btn" onClick={() => book()}><Plus />Book appointment</button> : null}
      {!adm && can('admissions.admit') ? <button type="button" className="btn" onClick={() => openDrawer('admit', { patient })}><Plus />Admit</button> : null}
      {can('patients.edit') ? <button type="button" className="btn" onClick={() => openDrawer('editPatient', { record: r, canCare: can('patients.care') })}>Edit details</button> : null}
      <button type="button" className="btn" onClick={() => window.print()}>Print</button>
    </>
  )

  let missedLine = null
  if (streak >= 2) {
    const anchor = d.todayLogged ? today : addDays(today, -1)
    const days = []
    for (let i = 0; i < streak; i++) days.unshift(fmt(addDays(anchor, -i)))
    missedLine =
      p.portal && d.lastCheckIn ? (
        <p><b>No check-in since {dow(d.lastCheckIn)} {fmt(d.lastCheckIn)}.</b> {first} logged {pron[1]} own doses, then missed {days.join(', ').replace(/, ([^,]*)$/, ' and $1')}.</p>
      ) : (
        <p><b>Missed {streak} doses in a row</b> ({days.join(', ')}). Doses are observed at the clinic.</p>
      )
  }

  const labRows = []
  if (active && e.type === 'pulmonary' && diffDays(today, e.start) < 58) {
    labRows.push(
      <div className="row" key="due">
        <time>{fmt(addDays(e.start, 56))}</time>
        <div><p>Sputum smear, month 2</p><small>Due. Confirms whether treatment is working.</small></div>
        <span className="pill p-done">Due</span>
      </div>,
    )
  }
  labs.forEach((l) =>
    labRows.push(
      <div className="row" key={l.id}>
        <time>{fmt(l.collected)}</time>
        <div>
          <p>{l.test}</p>
          <small>{l.notes || (l.reported ? `Reported ${fmt(l.reported)}` : 'Waiting for result')}</small>
        </div>
        <span className="actions" style={{ justifyContent: 'flex-end' }}>
          {l.result === 'pending' && can('labs.write') ? (
            <button type="button" className="btn sm" onClick={() => openDrawer('lab', { patient, lab: l })}>Enter result</button>
          ) : null}
          <span className={`pill ${LAB_PILL[l.result]}`}>{cap(l.result)}</span>
        </span>
      </div>,
    ),
  )

  const apptRow = (a) => (
    <div className="row" key={a.id}>
      <time>{fmt(a.at)}</time>
      <div>
        <p>{a.reason}</p>
        <small>{a.doctor}, {a.at.slice(11, 16)}, {a.via === 'patient_portal' ? `booked online by ${first}` : 'booked at reception'}</small>
      </div>
      <span className={`pill ${APPT_PILL[a.status][0]}`}>{APPT_PILL[a.status][1]}</span>
    </div>
  )

  const calendar = !r.clinical || !e ? null : active ? (
    <DoseCalendar r={r} first={first} />
  ) : (
    <section className="panel">
      <div className="panel-h"><h3>TB treatment</h3><span>Closed</span></div>
      <div className="rows">
        <div className="row"><time>{fmt(e.start)}</time><div><p>Started {e.regimen}</p><small>{e.type === 'pulmonary' ? 'Pulmonary' : 'Extra-pulmonary'} TB{e.mdr ? ', drug-resistant' : ''}</small></div><span /></div>
        <div className="row"><time>{fmt(e.outcomeDate)}</time><div><p>{OUTCOME[e.status]}</p><small>After {diffDays(e.outcomeDate, e.start)} days</small></div>
          <span className={`pill ${['cured', 'completed'].includes(e.status) ? 'p-next' : 'p-red'}`}>{OUTCOME[e.status]}</span></div>
      </div>
    </section>
  )

  const admissionsPanel = (
    <section className="panel">
      <div className="panel-h"><h3>Admissions</h3><span>{plural(r.admissions.length, 'stay')}</span></div>
      {r.admissions.length ? (
        <div className="rows">
          {r.admissions.map((a) => (
            <div className="row" key={a.id}>
              <time>{fmt(a.admitted)}</time>
              <div><p>{a.reason}</p><small>{a.ward}{a.bed ? `, bed ${a.bed}` : ''}{a.discharged ? `, ${diffDays(a.discharged, a.admitted)} days` : ''}</small></div>
              <span className={`pill ${a.discharged ? 'p-done' : 'p-amber'}`}>{a.discharged ? `Discharged ${fmt(a.discharged)}` : 'In ward now'}</span>
            </div>
          ))}
        </div>
      ) : (
        <Empty action={can('admissions.admit') ? <button type="button" className="btn" onClick={() => openDrawer('admit', { patient })}><Plus />Admit</button> : null}>Never admitted.</Empty>
      )}
    </section>
  )

  const appointmentsPanel = (
    <section className="panel">
      <div className="panel-h"><h3>Appointments</h3><span>{upcoming.length} upcoming, {past.length} past</span></div>
      {upcoming.length ? (
        <div className="rows">{upcoming.map(apptRow)}</div>
      ) : (
        <Empty action={can('appointments.book') ? <button type="button" className="btn primary" onClick={() => book()}>Book appointment</button> : null}>
          No appointment booked.{streak >= 2 ? ` With ${streak} missed doses, see ${pron[0]} soon.` : ''}
        </Empty>
      )}
      {past.length ? <div className="rows" style={{ marginTop: 12 }}>{past.slice(0, 5).map(apptRow)}</div> : null}
    </section>
  )

  async function regenerate() {
    try {
      await newLinkCodeApi(p.code)
      toast('New portal link code created')
      bump()
    } catch (err) {
      toast(err.message)
    }
  }

  return (
    <Page title="Patient record" sub={p.code} actions={actions}>
      <Link className="back" to="/patients"><Back />All patients</Link>
      <section className="ph">
        <div className="ph-id">
          <div className="avatar" aria-hidden="true">{initials(p.name)}</div>
          <div>
            <h2>{p.name}</h2>
            <p className="ph-meta">{p.code}, {p.age}, {p.gender}{p.phone ? `, ${p.phone}` : ''}</p>
            <div className="pills">
              {e ? (
                <>
                  <span className="pill p-next">{e.type === 'pulmonary' ? 'Pulmonary' : 'Extra-pulmonary'} TB</span>
                  <span className="pill p-done">{e.regimen}{active ? `, ${e.phase} phase` : ', closed'}</span>
                </>
              ) : null}
              {e && e.mdr ? <span className="pill p-red">Drug-resistant (MDR)</span> : null}
              {adm ? <span className="pill p-amber">Admitted, {adm.ward}{adm.bed ? ` bed ${adm.bed}` : ''}</span> : null}
              {p.portal ? <PatientPill>Uses the patient portal</PatientPill> : null}
            </div>
          </div>
        </div>
        <dl className="facts">
          <div><dt>Facility</dt><dd>{p.facility}</dd></div>
          <div><dt>Doctor</dt><dd>{r.doctor ? <Link className="link" to={`/staff/${r.doctor.code}`}>{r.doctor.name}</Link> : 'Unassigned'}</dd></div>
          <div><dt>Registered</dt><dd>{fmtY(p.registered)}</dd></div>
          {active ? (
            <>
              <div><dt>Treatment started</dt><dd>{fmtY(e.start)}</dd></div>
              <div><dt>Day of treatment</dt><dd>{d.day} of {d.regimenDays}</dd></div>
              <div><dt>Dose time</dt><dd>{doseTimeLabel(p.doseTime)}</dd></div>
            </>
          ) : null}
        </dl>
      </section>

      {!p.portal && p.portalLinkCode && can('patients.edit') ? (
        <p className="hint">
          Portal link code: <b style={{ letterSpacing: '.04em' }}>{p.portalLinkCode}</b>. Give this to {first} to connect a patient portal account to this record.{' '}
          <button type="button" className="link" onClick={regenerate}>Make a new code</button>
        </p>
      ) : null}

      {missedLine ? (
        <div className="alert" role="alert">
          {missedLine}
          <div className="actions">
            {p.phone ? <a className="btn" href={`tel:${p.phone}`}>Call {first}</a> : null}
            {can('appointments.book') ? <button type="button" className="btn primary" onClick={() => book({ reason: 'DOT home visit' })}>Schedule a DOT visit</button> : null}
          </div>
        </div>
      ) : null}
      {r.alerts?.notConverted ? (
        <div className="alert amber">
          <p><b>Sputum not converted at month 2.</b> Review adherence and consider drug-resistance testing.</p>
          {can('appointments.book') ? <button type="button" className="btn" onClick={() => book({ reason: 'TB treatment review' })}>Book TB review</button> : null}
        </div>
      ) : null}
      {r.alerts?.pendingLabs.length ? (
        <div className="alert amber">
          <p><b>{plural(r.alerts.pendingLabs.length, 'result')} pending:</b> {r.alerts.pendingLabs.map((l) => l.test).join(', ')}, collected {fmt(r.alerts.pendingLabs[0].collected)}.</p>
        </div>
      ) : null}

      {r.clinical ? (
        <>
          <div className={`grid ${calendar ? 'g-2-1' : 'g-1-1'}`}>
            {calendar}
            <section className="panel">
              <div className="panel-h">
                <h3>Current medication</h3>
                <span>
                  {meds.length ? plural(meds.length, 'drug') : ''}{' '}
                  {meds.length && can('meds.write') ? <button type="button" className="link" onClick={() => openDrawer('prescribe', { patient, today })}>Add</button> : null}
                </span>
              </div>
              {meds.length ? (
                <div className="rows">
                  {meds.map((m) => (
                    <div className="row" key={m.id}>
                      <i className="ring" style={m.drug.startsWith('Pyridoxine') ? { borderColor: 'var(--ink-3)' } : undefined} />
                      <div><p>{m.drug}</p><small>{m.freq}{m.end ? `, until ${fmt(m.end)}` : `, since ${fmt(m.start)}`}</small></div>
                      <span className="actions" style={{ justifyContent: 'flex-end' }}>
                        {m.dose}
                        {can('meds.write') ? (
                          <button type="button" className="btn sm" onClick={async () => { await stopMedicationApi(m.id); toast(`Stopped ${m.drug}`); bump() }}>Stop</button>
                        ) : null}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty action={can('meds.write') ? <button type="button" className="btn" onClick={() => openDrawer('prescribe', { patient, today })}><Plus />Write prescription</button> : null}>
                  No active prescriptions.
                </Empty>
              )}
              {can('tb.manage') ? (
                <p className="qnote">
                  {active ? (
                    <button type="button" className="link" onClick={() => openDrawer('tb', { patient, episode: e, today })}>Record the treatment outcome</button>
                  ) : (
                    <button type="button" className="link" onClick={() => openDrawer('tb', { patient, today })}>Start TB treatment</button>
                  )}
                </p>
              ) : null}
            </section>
            {calendar ? null : admissionsPanel}
          </div>

          <div className="grid g-1-1">
            <section className="panel">
              <div className="panel-h">
                <h3>Lab results</h3>
                <span>Newest first{can('labs.write') ? <> · <button type="button" className="link" onClick={() => openDrawer('lab', { patient, today })}>Add test</button></> : null}</span>
              </div>
              {labRows.length ? <div className="rows">{labRows}</div> : <div className="empty">No lab tests on record.</div>}
            </section>
            <div className="stack">
              <section className="panel">
                <div className="panel-h">
                  <h3>Files</h3>
                  <span>{plural(files.length, 'document')}{can('files.upload') ? <> · <button type="button" className="link" onClick={() => openDrawer('upload', { patient })}>Upload</button></> : null}</span>
                </div>
                {files.length ? (
                  <div className="rows">
                    {files.map((f) => (
                      <div className="row" key={f.id}>
                        <div className="ficon">{f.type === 'xray' ? 'IMG' : 'PDF'}</div>
                        <div>
                          <p>{FILE_LABEL[f.type]}</p>
                          <small>
                            {f.by === 'patient' ? <><PatientPill>Uploaded by {first}</PatientPill>{' '}</> : 'Added by staff, '}
                            {fmt(f.at)}
                          </small>
                        </div>
                        <button type="button" className="btn sm" onClick={() => apiDownload(`/api/files/${f.id}`, f.name, { open: true }).catch((err) => toast(err.message))}>Open</button>
                      </div>
                    ))}
                  </div>
                ) : <div className="empty">No files yet. Staff and the patient can both upload documents.</div>}
              </section>
              {appointmentsPanel}
            </div>
          </div>

          {e ? (
            <div className="grid g-1-1">
              <section className="panel">
                <div className="panel-h">
                  <h3>Household contacts</h3>
                  <span>
                    {plural(r.contacts.length, 'contact')}, {r.contacts.filter((c) => c.screened).length} screened
                    {can('contacts.write') ? <> · <button type="button" className="link" onClick={() => openDrawer('contact', { patient })}>Add contact</button></> : null}
                  </span>
                </div>
                {r.contacts.length ? (
                  <div className="tbl-wrap"><table>
                    <thead><tr><th>Contact</th><th>Relationship</th><th>Screening</th></tr></thead>
                    <tbody>
                      {r.contacts.map((c) => (
                        <tr key={c.id}>
                          <td>{c.name}<span className="sub">{c.age != null ? `${c.age}` : ''}{c.phone ? `${c.age != null ? ', ' : ''}${c.phone}` : ''}</span></td>
                          <td>{cap(c.relationship)}</td>
                          <td>
                            {can('contacts.write') ? (
                              <select className="sel" aria-label={`Screening for ${c.name}`} value={c.screen_result || ''}
                                onChange={async (ev) => { await screenContactApi(c.id, ev.target.value || null); toast(`Saved screening for ${c.name}`); bump() }}>
                                <option value="">Not screened</option><option value="negative">Negative</option>
                                <option value="referred">Referred for testing</option><option value="confirmed_tb">Confirmed TB</option>
                              </select>
                            ) : (
                              <span className={`pill ${c.screen_result === 'confirmed_tb' ? 'p-red' : c.screened ? 'p-next' : 'p-done'}`}>
                                {{ negative: 'Negative', referred: 'Referred', confirmed_tb: 'Confirmed TB' }[c.screen_result] || 'Not screened'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                ) : <div className="empty">No household contacts recorded. People living with {first} should be screened for TB.</div>}
              </section>
              {admissionsPanel}
            </div>
          ) : null}
        </>
      ) : (
        <div className="grid g-1-1">
          {appointmentsPanel}
          {admissionsPanel}
        </div>
      )}
      {error ? <ErrorNote error={error} onRetry={reload} /> : null}
    </Page>
  )
}

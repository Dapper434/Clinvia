import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { doctorsApi } from '../../api/hospital.js'
import { nextPatientCodeApi, registerPatientRecordApi } from '../../api/patients.js'
import { useShell } from '../../components/shell/shellContext.js'
import { Check } from '../../components/ui/icons.jsx'
import Page from '../../components/ui/Page.jsx'
import { useAuth } from '../../context/useAuth.js'

const todayLocal = () => {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export default function RegisterPatient() {
  const { can, user } = useAuth()
  const { toast, bump } = useShell()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [doctors, setDoctors] = useState([])
  const [f, setF] = useState(() => ({
    name: '', age: '', gender: 'female', phone: '', address: '', doctorCode: '',
    tb: false, type: 'pulmonary', start: todayLocal(), doseTime: 'before_breakfast', mdr: false,
    portal: true, email: '', password: `Clinvia-${Math.floor(1000 + Math.random() * 9000)}`,
  }))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    nextPatientCodeApi().then((r) => setCode(r.code)).catch(() => {})
    doctorsApi(false).then(setDoctors).catch(() => {})
  }, [])

  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  async function submit(ev) {
    ev.preventDefault()
    const err = []
    if (!f.name.trim()) err.push('full name')
    if (f.age === '' || +f.age < 0 || +f.age > 120) err.push('an age between 0 and 120')
    if (f.portal && !/^\S+@\S+\.\S+$/.test(f.email)) err.push('a valid email for the portal account')
    if (err.length) {
      setError(`Add ${err.join(', ')} to register this patient.`)
      return
    }
    setBusy(true)
    setError('')
    try {
      const r = await registerPatientRecordApi({
        name: f.name.trim(), age: Number(f.age), gender: f.gender, phone: f.phone, address: f.address,
        doctorCode: f.doctorCode || null,
        tb: f.tb ? { type: f.type, start: f.start, doseTime: f.doseTime, mdr: f.mdr } : null,
        portal: f.portal ? { email: f.email.trim(), password: f.password } : null,
      })
      toast(`Registered ${r.name} as ${r.code}`)
      bump()
      navigate(`/patients/${r.code}`)
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  return (
    <Page title="Register patient" actions={<Link className="btn" to="/patients">Cancel</Link>}>
      {code ? <p className="next-code">This patient will be registered as <b>{code}</b></p> : null}
      <form className="form" onSubmit={submit} noValidate>
        <fieldset className="fieldset">
          <h3>Personal</h3>
          <p>Name and age are needed; everything else can be added later.</p>
          <div className="fields">
            <div className="field"><label htmlFor="f-name">Full name <em>*</em></label><input id="f-name" value={f.name} onChange={set('name')} required autoComplete="off" /></div>
            <div className="field"><label htmlFor="f-age">Age <em>*</em></label><input id="f-age" type="number" min="0" max="120" value={f.age} onChange={set('age')} required /></div>
            <div className="field"><label htmlFor="f-gender">Sex</label><select id="f-gender" value={f.gender} onChange={set('gender')}><option value="female">Female</option><option value="male">Male</option></select></div>
            <div className="field"><label htmlFor="f-phone">Phone</label><input id="f-phone" type="tel" value={f.phone} onChange={set('phone')} placeholder="07XX XXX XXX" /><small>Used for follow-up calls</small></div>
            <div className="field wide"><label htmlFor="f-address">Address</label><input id="f-address" value={f.address} onChange={set('address')} placeholder="Estate, town, county" /></div>
          </div>
        </fieldset>

        <fieldset className="fieldset">
          <h3>Care team</h3>
          <p>Who is responsible for this patient, and where they are seen.</p>
          <div className="fields">
            <div className="field"><label htmlFor="f-doc">Assigned doctor</label>
              <select id="f-doc" value={f.doctorCode} onChange={set('doctorCode')}>
                <option value="">Unassigned</option>
                {doctors.map((d) => <option key={d.code} value={d.code}>{d.name}, {d.specialty || ''}{d.duty === 'on_leave' ? ' (on leave)' : ''}</option>)}
              </select></div>
            <div className="field"><label htmlFor="f-fac">Facility</label>
              <select id="f-fac" disabled value="own"><option value="own">{user?.hospital?.name}</option></select>
              <small>Patients are registered at your hospital</small></div>
          </div>
        </fieldset>

        {can('tb.manage') ? (
          <fieldset className="fieldset">
            <h3>TB treatment</h3>
            <p>Only for patients starting TB treatment. Leave unticked for general patients.</p>
            <label className="check"><input type="checkbox" checked={f.tb} onChange={set('tb')} /> Start this patient on TB treatment</label>
            <div className="fields" hidden={!f.tb} style={{ marginTop: 14 }}>
              <div className="field"><label htmlFor="f-type">TB type</label><select id="f-type" value={f.type} onChange={set('type')}><option value="pulmonary">Pulmonary</option><option value="extra_pulmonary">Extra-pulmonary</option></select></div>
              <div className="field"><label htmlFor="f-start">Treatment start <em>*</em></label><input id="f-start" type="date" value={f.start} onChange={set('start')} /></div>
              <div className="field"><label htmlFor="f-dt">Daily dose time</label><select id="f-dt" value={f.doseTime} onChange={set('doseTime')}><option value="before_breakfast">Before breakfast</option><option value="after_supper">After supper</option></select><small>Sets the daily reminder</small></div>
              <div className="field"><label>Drug resistance</label><label className="check" style={{ marginTop: 8 }}><input type="checkbox" checked={f.mdr} onChange={set('mdr')} /> Rifampicin resistant (MDR-TB) — uses BPaLM</label></div>
            </div>
          </fieldset>
        ) : null}

        <fieldset className="fieldset">
          <h3>Patient portal</h3>
          <p>Lets the patient check in their own doses, book appointments and upload documents.</p>
          <label className="check"><input type="checkbox" checked={f.portal} onChange={set('portal')} /> Create a portal account</label>
          <div className="fields" hidden={!f.portal} style={{ marginTop: 14 }}>
            <div className="field"><label htmlFor="f-email">Email <em>*</em></label><input id="f-email" type="email" value={f.email} onChange={set('email')} /></div>
            <div className="field"><label htmlFor="f-pw">Temporary password</label><input id="f-pw" value={f.password} onChange={set('password')} /><small>The patient changes it on first sign-in</small></div>
          </div>
          {!f.portal ? <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>You&apos;ll get a link code on the patient&apos;s record so they can set up the portal later.</p> : null}
        </fieldset>

        {error ? <p className="warn" role="alert">{error}</p> : null}
        <div className="form-foot">
          <Link className="btn" to="/patients">Cancel</Link>
          <button className="btn primary" type="submit" disabled={busy}><Check />Register {code}</button>
        </div>
      </form>
    </Page>
  )
}

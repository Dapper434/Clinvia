import { useEffect, useState } from 'react'
import { doctorsApi } from '../../api/hospital.js'
import {
  addContactApi,
  addLabApi,
  prescribeApi,
  startTbApi,
  updateLabApi,
  updatePatientApi,
  updateTbApi,
  uploadFileApi,
} from '../../api/patients.js'
import Drawer, { FormError } from '../ui/Drawer.jsx'
import { Check } from '../ui/icons.jsx'

const LAB_TESTS = [
  ['genexpert', 'GeneXpert MTB/RIF'],
  ['sputum_smear', 'Sputum smear microscopy'],
  ['xray', 'Chest X-ray'],
  ['culture', 'TB culture'],
  ['fbc', 'Full blood count'],
  ['malaria_rdt', 'Malaria RDT'],
  ['urinalysis', 'Urinalysis'],
  ['rbs', 'Random blood sugar'],
  ['lft', 'Liver function test'],
]
const RESULTS = ['pending', 'positive', 'negative', 'normal', 'abnormal']
const FILE_TYPES = [
  ['prescription', 'Prescription'],
  ['xray', 'Chest X-ray'],
  ['lab_report', 'Lab report'],
  ['referral', 'Referral letter'],
  ['discharge_summary', 'Discharge summary'],
]

function useSubmit(done) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const run = async (fn) => {
    setBusy(true)
    setError('')
    try {
      done(await fn())
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }
  return { error, setError, busy, run }
}

const Foot = ({ close, onSave, busy, label }) => (
  <>
    <button type="button" className="btn" onClick={close}>Cancel</button>
    <button type="button" className="btn primary" onClick={onSave} disabled={busy}>
      <Check />
      {label}
    </button>
  </>
)

export function PrescribeDrawer({ patient, today, done, close }) {
  const [f, setF] = useState({ drug: '', dose: '', freq: 'Once daily', start: today, end: '' })
  const { error, busy, run } = useSubmit(done)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  return (
    <Drawer title="Write prescription" onClose={close}
      footer={<Foot close={close} busy={busy} label="Prescribe"
        onSave={() => run(async () => { await prescribeApi(patient.code, f); return `Prescribed ${f.drug} for ${patient.name}` })} />}>
      <div className="field"><label htmlFor="m-d">Drug <em>*</em></label><input id="m-d" value={f.drug} onChange={set('drug')} placeholder="e.g. Amoxicillin" /></div>
      <div className="field"><label htmlFor="m-q">Dose <em>*</em></label><input id="m-q" value={f.dose} onChange={set('dose')} placeholder="e.g. 500 mg" /></div>
      <div className="field"><label htmlFor="m-f">How often <em>*</em></label>
        <input id="m-f" value={f.freq} onChange={set('freq')} list="m-fl" />
        <datalist id="m-fl">{['Once daily', '12 hourly', '8 hourly', '6 hourly', '3 times weekly'].map((x) => <option key={x} value={x} />)}</datalist></div>
      <div className="field"><label htmlFor="m-s">Start</label><input id="m-s" type="date" value={f.start} onChange={set('start')} /></div>
      <div className="field"><label htmlFor="m-e">Until</label><input id="m-e" type="date" value={f.end} min={f.start} onChange={set('end')} /><small>Leave empty for ongoing medication</small></div>
      <FormError error={error} />
    </Drawer>
  )
}

export function LabDrawer({ patient, lab, today, done, close }) {
  const [f, setF] = useState(
    lab
      ? { result: lab.result === 'pending' ? 'negative' : lab.result, notes: lab.notes || '', rifResistant: lab.mdr_detected }
      : { test: 'genexpert', result: 'pending', collected: today, notes: '', rifResistant: false },
  )
  const { error, busy, run } = useSubmit(done)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const isGx = (lab?.test_type || f.test) === 'genexpert'
  return (
    <Drawer title={lab ? `Enter result: ${lab.test}` : 'Add lab test'} onClose={close}
      footer={<Foot close={close} busy={busy} label={lab ? 'Save result' : 'Add test'}
        onSave={() => run(async () => {
          if (lab) await updateLabApi(lab.id, f)
          else await addLabApi(patient.code, f)
          return lab ? `Result saved for ${patient.name}` : `Lab test added for ${patient.name}`
        })} />}>
      {!lab ? (
        <>
          <div className="field"><label htmlFor="l-t">Test</label>
            <select id="l-t" value={f.test} onChange={set('test')}>{LAB_TESTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="field"><label htmlFor="l-c">Sample collected</label><input id="l-c" type="date" max={today} value={f.collected} onChange={set('collected')} /></div>
        </>
      ) : null}
      <div className="field"><label htmlFor="l-r">Result</label>
        <select id="l-r" value={f.result} onChange={set('result')}>
          {RESULTS.filter((r) => !lab || r !== 'pending').map((r) => <option key={r} value={r}>{r === 'pending' ? 'Waiting for result' : r[0].toUpperCase() + r.slice(1)}</option>)}
        </select></div>
      {isGx ? <label className="check"><input type="checkbox" checked={f.rifResistant} onChange={set('rifResistant')} /> Rifampicin resistance detected</label> : null}
      <div className="field"><label htmlFor="l-n">Notes</label><textarea id="l-n" rows={3} value={f.notes} onChange={set('notes')} /></div>
      <FormError error={error} />
    </Drawer>
  )
}

export function ContactDrawer({ patient, done, close }) {
  const [f, setF] = useState({ name: '', age: '', relationship: 'spouse', phone: '' })
  const { error, busy, run } = useSubmit(done)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  return (
    <Drawer title="Add household contact" onClose={close}
      footer={<Foot close={close} busy={busy} label="Add contact"
        onSave={() => run(async () => { await addContactApi(patient.code, f); return `${f.name} added as a contact` })} />}>
      <div className="field"><label htmlFor="c-n">Full name <em>*</em></label><input id="c-n" value={f.name} onChange={set('name')} /></div>
      <div className="field"><label htmlFor="c-a">Age</label><input id="c-a" type="number" min="0" max="120" value={f.age} onChange={set('age')} /></div>
      <div className="field"><label htmlFor="c-r">Relationship</label>
        <select id="c-r" value={f.relationship} onChange={set('relationship')}>
          {['spouse', 'child', 'parent', 'roommate', 'other'].map((r) => <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>)}
        </select></div>
      <div className="field"><label htmlFor="c-p">Phone</label><input id="c-p" type="tel" value={f.phone} onChange={set('phone')} placeholder="07XX XXX XXX" /></div>
      <FormError error={error} />
    </Drawer>
  )
}

export function UploadDrawer({ patient, done, close }) {
  const [file, setFile] = useState(null)
  const [type, setType] = useState('lab_report')
  const { error, setError, busy, run } = useSubmit(done)
  return (
    <Drawer title="Upload a document" onClose={close}
      footer={<Foot close={close} busy={busy} label="Upload"
        onSave={() => (file ? run(async () => { await uploadFileApi(patient.code, file, type); return `${file.name} added to ${patient.name}'s file` }) : setError('Choose a file to upload.'))} />}>
      <div className="field"><label htmlFor="u-t">Kind of document</label>
        <select id="u-t" value={type} onChange={(e) => setType(e.target.value)}>{FILE_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
      <div className="field"><label htmlFor="u-f">File <em>*</em></label>
        <input id="u-f" type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <small>PDF, JPG or PNG, up to 5 MB</small></div>
      <FormError error={error} />
    </Drawer>
  )
}

export function TbDrawer({ patient, episode, today, done, close }) {
  const closing = Boolean(episode)
  const [f, setF] = useState(closing ? { outcome: 'completed', outcomeDate: today } : { type: 'pulmonary', start: today, doseTime: 'before_breakfast', mdr: false })
  const { error, busy, run } = useSubmit(done)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  return (
    <Drawer title={closing ? 'Record treatment outcome' : 'Start TB treatment'} onClose={close}
      footer={<Foot close={close} busy={busy} label={closing ? 'Close treatment' : 'Start treatment'}
        onSave={() => run(async () => {
          if (closing) await updateTbApi(patient.code, f)
          else await startTbApi(patient.code, f)
          return closing ? `Treatment closed for ${patient.name}` : `${patient.name} started on TB treatment`
        })} />}>
      {closing ? (
        <>
          <div className="field"><label htmlFor="t-o">Outcome</label>
            <select id="t-o" value={f.outcome} onChange={set('outcome')}>
              <option value="cured">Cured</option><option value="completed">Treatment completed</option>
              <option value="lost_to_follow_up">Lost to follow-up</option><option value="failed">Treatment failed</option><option value="died">Died</option>
            </select></div>
          <div className="field"><label htmlFor="t-d">Date</label><input id="t-d" type="date" max={today} value={f.outcomeDate} onChange={set('outcomeDate')} /></div>
          <p className="hint">Closing the episode stops its TB medication and removes the patient from the dose log.</p>
        </>
      ) : (
        <>
          <div className="field"><label htmlFor="t-type">TB type</label>
            <select id="t-type" value={f.type} onChange={set('type')}><option value="pulmonary">Pulmonary</option><option value="extra_pulmonary">Extra-pulmonary</option></select></div>
          <div className="field"><label htmlFor="t-s">Treatment start</label><input id="t-s" type="date" value={f.start} onChange={set('start')} /></div>
          <div className="field"><label htmlFor="t-dt">Daily dose time</label>
            <select id="t-dt" value={f.doseTime} onChange={set('doseTime')}><option value="before_breakfast">Before breakfast</option><option value="after_supper">After supper</option></select>
            <small>Sets the patient's daily reminder</small></div>
          <label className="check"><input type="checkbox" checked={f.mdr} onChange={set('mdr')} /> Rifampicin resistant (MDR-TB) — uses BPaLM</label>
        </>
      )}
      <FormError error={error} />
    </Drawer>
  )
}

export function EditPatientDrawer({ record, canCare, done, close }) {
  const p = record.patient
  const [f, setF] = useState({ name: p.name, age: p.age ?? '', gender: p.gender || 'female', phone: p.phone || '', address: p.address || '',
    doctorCode: record.doctor?.code || '', doseTime: p.doseTime || '' })
  const [doctors, setDoctors] = useState([])
  const { error, busy, run } = useSubmit(done)
  useEffect(() => {
    if (canCare) doctorsApi(false).then(setDoctors).catch(() => {})
  }, [canCare])
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const body = () => {
    const b = { name: f.name, age: f.age, gender: f.gender, phone: f.phone, address: f.address }
    if (canCare) Object.assign(b, { doctorCode: f.doctorCode || null, doseTime: f.doseTime || null })
    return b
  }
  return (
    <Drawer title="Edit patient details" onClose={close}
      footer={<Foot close={close} busy={busy} label="Save changes"
        onSave={() => run(async () => { await updatePatientApi(p.code, body()); return `Saved ${f.name}'s details` })} />}>
      <div className="field"><label htmlFor="e-n">Full name <em>*</em></label><input id="e-n" value={f.name} onChange={set('name')} /></div>
      <div className="field"><label htmlFor="e-a">Age <em>*</em></label><input id="e-a" type="number" min="0" max="120" value={f.age} onChange={set('age')} /></div>
      <div className="field"><label htmlFor="e-g">Sex</label><select id="e-g" value={f.gender} onChange={set('gender')}><option value="female">Female</option><option value="male">Male</option></select></div>
      <div className="field"><label htmlFor="e-p">Phone</label><input id="e-p" type="tel" value={f.phone} onChange={set('phone')} /></div>
      <div className="field"><label htmlFor="e-ad">Address</label><input id="e-ad" value={f.address} onChange={set('address')} /></div>
      {canCare ? (
        <>
          <div className="field"><label htmlFor="e-d">Assigned doctor</label>
            <select id="e-d" value={f.doctorCode} onChange={set('doctorCode')}>
              <option value="">Unassigned</option>
              {doctors.map((d) => <option key={d.code} value={d.code}>{d.name}{d.specialty ? `, ${d.specialty}` : ''}{d.duty === 'on_leave' ? ' (on leave)' : ''}</option>)}
            </select></div>
          {record.episode?.status === 'active' ? (
            <div className="field"><label htmlFor="e-t">Daily dose time</label>
              <select id="e-t" value={f.doseTime} onChange={set('doseTime')}>
                <option value="">Standard (before breakfast)</option>
                <option value="07:00">Before breakfast, 07:00</option>
                <option value="19:00">After supper, 19:00</option>
              </select><small>Sets the patient's daily reminder</small></div>
          ) : null}
        </>
      ) : null}
      <FormError error={error} />
    </Drawer>
  )
}

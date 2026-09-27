import { useEffect, useState } from 'react'
import { doctorsApi } from '../../api/hospital.js'
import {
  addContactApi,
  addLabApi,
  prescribeApi,
  prescribeRegimenApi,
  regimenApi,
  startTbApi,
  updateLabApi,
  updatePatientApi,
  updateTbApi,
  uploadFileApi,
} from '../../api/patients.js'
import { fmt } from '../../utils/format.js'
import { DEFAULT_FREQUENCIES, DRUG_CATALOG, blankClassification } from '../../utils/tbTerms.js'
import TbClassification, { RegimenPreview } from '../patients/TbClassification.jsx'
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

/**
 * Write a prescription. For a patient on TB treatment the whole regimen can be loaded at
 * once: the backend works out the drugs from how the case is classified and the doses from
 * the patient's weight, and every line stays editable before it is saved.
 */
export function PrescribeDrawer({ patient, today, onTb, done, close }) {
  const [mode, setMode] = useState(onTb ? 'regimen' : 'single')
  const [f, setF] = useState({ drug: '', dose: '', freq: 'Once daily', start: today, end: '' })
  const [plan, setPlan] = useState(null)
  const [lines, setLines] = useState([])
  const { error, setError, busy, run } = useSubmit(done)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const preset = DRUG_CATALOG.find(([name]) => name.toLowerCase() === f.drug.trim().toLowerCase())

  useEffect(() => {
    if (mode !== 'regimen') return
    regimenApi(patient.code)
      .then((r) => { setPlan(r); setLines(r.lines) })
      .catch((e) => { setError(e.message); setMode('single') })
  }, [mode, patient.code, setError])

  const editLine = (i, k) => (e) =>
    setLines(lines.map((l, j) => (j === i ? { ...l, [k]: e.target.value } : l)))

  if (mode === 'regimen') {
    return (
      <Drawer title="Prescribe TB regimen" onClose={close}
        footer={<Foot close={close} busy={busy} label={`Prescribe ${lines.length || ''} lines`.trim()}
          onSave={() => (lines.length
            ? run(async () => {
              await prescribeRegimenApi(patient.code, lines)
              return `${plan.label} prescribed for ${patient.name}`
            })
            : setError('There is nothing to prescribe yet.'))} />}>
        <button type="button" className="link" onClick={() => setMode('single')}>Prescribe a single drug instead</button>
        {plan ? (
          <>
            <RegimenPreview plan={{ ...plan, lines: [] }} />
            <p className="hint">
              {plan.weight ? `Dosed for ${plan.weight} kg` : 'No weight recorded'} · starts {fmt(plan.start)}
            </p>
            {lines.map((l, i) => (
              <div className="rx-line" key={`${l.drug}-${i}`}>
                <div className="field"><label htmlFor={`rx-d${i}`}>Drug</label>
                  <input id={`rx-d${i}`} value={l.drug} onChange={editLine(i, 'drug')} /></div>
                <div className="field"><label htmlFor={`rx-q${i}`}>Dose</label>
                  <input id={`rx-q${i}`} value={l.dose} onChange={editLine(i, 'dose')} /></div>
                <div className="field"><label htmlFor={`rx-f${i}`}>How often</label>
                  <input id={`rx-f${i}`} value={l.freq} onChange={editLine(i, 'freq')} list="m-fl" /></div>
                <button type="button" className="link" onClick={() => setLines(lines.filter((_, j) => j !== i))}>
                  Remove
                </button>
                {l.note || l.phase ? <small className="muted">{[l.phase, l.note].filter(Boolean).join(' · ')}</small> : null}
              </div>
            ))}
            <datalist id="m-fl">{(plan.frequencies || DEFAULT_FREQUENCIES).map((x) => <option key={x} value={x} />)}</datalist>
          </>
        ) : <p className="hint">Working out the regimen…</p>}
        <FormError error={error} />
      </Drawer>
    )
  }

  return (
    <Drawer title="Write prescription" onClose={close}
      footer={<Foot close={close} busy={busy} label="Prescribe"
        onSave={() => run(async () => { await prescribeApi(patient.code, f); return `Prescribed ${f.drug} for ${patient.name}` })} />}>
      {onTb ? <button type="button" className="link" onClick={() => setMode('regimen')}>Load the TB regimen instead</button> : null}
      <div className="field"><label htmlFor="m-d">Drug <em>*</em></label>
        <input id="m-d" value={f.drug} onChange={set('drug')} list="m-dl" placeholder="e.g. Amoxicillin" />
        <datalist id="m-dl">{DRUG_CATALOG.map(([name]) => <option key={name} value={name} />)}</datalist></div>
      <div className="field"><label htmlFor="m-q">Dose <em>*</em></label>
        <input id="m-q" value={f.dose} onChange={set('dose')} list="m-ql" placeholder="e.g. 500 mg" />
        {preset ? <datalist id="m-ql">{preset[1].map((d) => <option key={d} value={d} />)}</datalist> : null}
        <small>{preset ? `Usual doses: ${preset[1].join(', ')}` : 'An amount and a unit, like 500 mg or 2 tablets'}</small></div>
      <div className="field"><label htmlFor="m-f">How often <em>*</em></label>
        <input id="m-f" value={f.freq} onChange={set('freq')} list="m-fl" />
        <datalist id="m-fl">{DEFAULT_FREQUENCIES.map((x) => <option key={x} value={x} />)}</datalist>
        {preset ? <small>Usually {preset[2]}</small> : null}</div>
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
  const [f, setF] = useState(closing
    ? { outcome: 'completed', outcomeDate: today }
    : { ...blankClassification(), start: today, doseTime: 'before_breakfast' })
  const { error, setError, busy, run } = useSubmit(done)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  return (
    <Drawer title={closing ? 'Record treatment outcome' : 'Start TB treatment'} onClose={close}
      footer={<Foot close={close} busy={busy} label={closing ? 'Close treatment' : 'Start treatment'}
        onSave={() => (!closing && f.type === 'extra_pulmonary' && !f.eptbSite
          ? setError('Choose which organ the extra-pulmonary TB affects.')
          : run(async () => {
            if (closing) await updateTbApi(patient.code, f)
            else await startTbApi(patient.code, f)
            return closing ? `Treatment closed for ${patient.name}` : `${patient.name} started on TB treatment`
          }))} />}>
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
          <TbClassification f={f} set={set} age={patient.age} weight={patient.weight} idPrefix="t" />
          <div className="field"><label htmlFor="t-s">Treatment start</label><input id="t-s" type="date" value={f.start} onChange={set('start')} /></div>
          <div className="field"><label htmlFor="t-dt">Daily dose time</label>
            <select id="t-dt" value={f.doseTime} onChange={set('doseTime')}><option value="before_breakfast">Before breakfast</option><option value="after_supper">After supper</option></select>
            <small>Sets the patient's daily reminder</small></div>
        </>
      )}
      <FormError error={error} />
    </Drawer>
  )
}

export function EditPatientDrawer({ record, canCare, done, close }) {
  const p = record.patient
  const [f, setF] = useState({ name: p.name, age: p.age ?? '', gender: p.gender || 'female', phone: p.phone || '',
    email: p.email || '', weight: p.weight ?? '', address: p.address || '',
    doctorCode: record.doctor?.code || '', doseTime: p.doseTime || '' })
  const [doctors, setDoctors] = useState([])
  const { error, busy, run } = useSubmit(done)
  useEffect(() => {
    if (canCare) doctorsApi(false).then(setDoctors).catch(() => {})
  }, [canCare])
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const body = () => {
    const b = { name: f.name, age: f.age, gender: f.gender, phone: f.phone, address: f.address,
      email: f.email || null, weight: f.weight === '' ? null : Number(f.weight) }
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
      <div className="field"><label htmlFor="e-e">Email</label><input id="e-e" type="email" value={f.email} onChange={set('email')} placeholder="name@gmail.com" /></div>
      <div className="field"><label htmlFor="e-w">Weight</label>
        <input id="e-w" type="number" min="0.5" max="400" step="0.1" value={f.weight} onChange={set('weight')} placeholder="kg" />
        <small>{record.episode?.status === 'active' ? 'Re-dose the TB regimen after a change' : 'In kilograms'}</small></div>
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

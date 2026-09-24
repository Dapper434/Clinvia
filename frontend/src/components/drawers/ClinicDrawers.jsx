import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { doctorsApi } from '../../api/hospital.js'
import { admitApi, admissionsApi } from '../../api/wards.js'
import { addWalkInApi, bookApi, slotsApi } from '../../api/schedule.js'
import { fmt, readCode } from '../../utils/format.js'
import Drawer, { FormError } from '../ui/Drawer.jsx'
import { Check } from '../ui/icons.jsx'
import PatientPicker from '../ui/PatientPicker.jsx'

const REASONS = ['TB treatment review', 'DOT home visit', 'General consultation', 'Follow-up review',
  'Antenatal visit', 'Immunisation', 'Post-discharge review']

const pickerValue = (p) => (p ? `${p.code} — ${p.name}` : '')

export function BookDrawer({ patient, reason, date: initialDate, today, done, close }) {
  const [who, setWho] = useState(pickerValue(patient))
  const [doctors, setDoctors] = useState([])
  const [doc, setDoc] = useState('')
  const [date, setDate] = useState(initialDate && initialDate >= today ? initialDate : today)
  const [time, setTime] = useState(null)
  const [slots, setSlots] = useState(null)
  const [why, setWhy] = useState(reason || '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    doctorsApi(true)
      .then((list) => {
        setDoctors(list)
        const preferred = list.find((d) => d.code === patient?.doctorCode)
        setDoc((preferred || list[0])?.code || '')
      })
      .catch((e) => setError(e.message))
  }, [patient?.doctorCode])

  useEffect(() => {
    if (!doc || !date) return
    let alive = true
    slotsApi(doc, date)
      .then((s) => alive && setSlots(s))
      .catch((e) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [doc, date])

  const doctorName = doctors.find((d) => d.code === doc)?.name
  async function save() {
    const code = readCode(who)
    const problems = []
    if (!code) problems.push('choose a patient from the list')
    if (!time) problems.push('pick a time')
    if (problems.length) {
      setError(problems.join(' and ').replace(/^./, (c) => c.toUpperCase()) + '.')
      return
    }
    setBusy(true)
    try {
      const r = await bookApi({ patientCode: code, doctorCode: doc, date, time, reason: why.trim() || 'General consultation' })
      done(`Booked ${r.patient} with ${r.doctor}, ${fmt(date)} at ${time}`)
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  return (
    <Drawer
      title="Book appointment"
      onClose={close}
      footer={
        <>
          <button type="button" className="btn" onClick={close}>Cancel</button>
          <button type="button" className="btn primary" onClick={save} disabled={busy}>
            <Check />
            Book appointment
          </button>
        </>
      }
    >
      <PatientPicker id="b-p" value={who} onChange={(v) => { setWho(v); setError('') }} />
      <div className="field">
        <label htmlFor="b-d">Doctor</label>
        <select id="b-d" value={doc} onChange={(e) => { setDoc(e.target.value); setTime(null) }}>
          {doctors.map((d) => (
            <option key={d.code} value={d.code}>
              {d.name}{d.specialty ? `, ${d.specialty}` : ''}
            </option>
          ))}
        </select>
        <small>{doctors.length ? 'Doctors on leave are not shown' : 'No doctor is on duty to take bookings.'}</small>
      </div>
      <div className="field">
        <label htmlFor="b-date">Date</label>
        <input id="b-date" type="date" min={today} value={date} onChange={(e) => { setDate(e.target.value || today); setTime(null) }} />
      </div>
      <div className="field">
        <label>
          Time <em>*</em>
        </label>
        <div className="slots">
          {(slots?.slots || []).map((s) => (
            <button
              type="button"
              key={s.time}
              className={`slot${s.time === time ? ' on' : ''}`}
              disabled={!s.free}
              aria-pressed={s.time === time}
              onClick={() => setTime(s.time)}
            >
              {s.time}
            </button>
          ))}
        </div>
        <small>
          {slots?.closed ? 'The clinic is closed at weekends.' : slots ? `${slots.free} of ${slots.total} slots free with ${doctorName ?? ''}` : ''}
        </small>
      </div>
      <div className="field">
        <label htmlFor="b-r">Reason</label>
        <input id="b-r" value={why} onChange={(e) => setWhy(e.target.value)} list="b-rl" placeholder="e.g. TB treatment review" />
        <datalist id="b-rl">
          {REASONS.map((r) => <option key={r} value={r} />)}
        </datalist>
      </div>
      <p className="hint">Booked at reception. Patients with a portal account see it in their portal.</p>
      <FormError error={error} />
    </Drawer>
  )
}

export function AdmitDrawer({ patient, bedId, done, close }) {
  const [who, setWho] = useState(pickerValue(patient))
  const [wards, setWards] = useState([])
  const [wardId, setWardId] = useState('')
  const [bed, setBed] = useState(bedId || '')
  const [doctors, setDoctors] = useState([])
  const [doc, setDoc] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([admissionsApi(), doctorsApi(true)])
      .then(([a, d]) => {
        setWards(a.wards)
        setDoctors(d)
        setDoc(d[0]?.code || '')
        const start = a.wards.find((w) => w.beds.some((b) => b.id === bedId)) || a.wards.find((w) => w.beds.some((b) => b.status === 'available'))
        setWardId(start?.id || '')
        if (!bedId) setBed(start?.beds.find((b) => b.status === 'available')?.id || '')
      })
      .catch((e) => setError(e.message))
  }, [bedId])

  const ward = useMemo(() => wards.find((w) => w.id === wardId), [wards, wardId])
  const free = ward ? ward.beds.filter((b) => b.status === 'available') : []

  async function save() {
    const code = readCode(who)
    const problems = []
    if (!code) problems.push('choose a patient from the list')
    if (!bed) problems.push('choose a free bed')
    if (!reason.trim()) problems.push('add the reason for admission')
    if (problems.length) {
      setError(problems.join(', ').replace(/^./, (c) => c.toUpperCase()) + '.')
      return
    }
    setBusy(true)
    try {
      const r = await admitApi({ patientCode: code, bedId: bed, doctorCode: doc, reason: reason.trim() })
      done(`${r.patient} admitted to bed ${r.bed}`)
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  return (
    <Drawer
      title="Admit patient"
      onClose={close}
      footer={
        <>
          <button type="button" className="btn" onClick={close}>Cancel</button>
          <button type="button" className="btn primary" onClick={save} disabled={busy}>
            <Check />
            Admit
          </button>
        </>
      }
    >
      <PatientPicker id="a-p" value={who} onChange={(v) => { setWho(v); setError('') }} />
      <div className="field">
        <label htmlFor="a-w">Ward</label>
        <select
          id="a-w"
          value={wardId}
          onChange={(e) => {
            setWardId(e.target.value)
            setBed(wards.find((w) => w.id === e.target.value)?.beds.find((b) => b.status === 'available')?.id || '')
          }}
        >
          {wards.map((w) => {
            const n = w.beds.filter((b) => b.status === 'available').length
            return (
              <option key={w.id} value={w.id} disabled={!n}>
                {w.name} — {n} free
              </option>
            )
          })}
        </select>
        {!wards.length ? <small>This hospital has no wards yet. An administrator can add them in Hospital settings.</small> : null}
      </div>
      <div className="field">
        <label htmlFor="a-b">
          Bed <em>*</em>
        </label>
        <select id="a-b" value={bed} onChange={(e) => setBed(e.target.value)}>
          {free.map((b) => (
            <option key={b.id} value={b.id}>{b.label}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="a-d">Admitting doctor</label>
        <select id="a-d" value={doc} onChange={(e) => setDoc(e.target.value)}>
          {doctors.map((d) => (
            <option key={d.code} value={d.code}>{d.name}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="a-r">
          Reason for admission <em>*</em>
        </label>
        <input id="a-r" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Severe malaria" />
      </div>
      <FormError error={error} />
    </Drawer>
  )
}

export function WalkinDrawer({ done, close }) {
  const [who, setWho] = useState('')
  const [priority, setPriority] = useState('low')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function save() {
    const code = readCode(who)
    if (!code) {
      setError('Choose a patient from the list.')
      return
    }
    setBusy(true)
    try {
      const r = await addWalkInApi({ patientCode: code, priority })
      done(`${r.patient} added to the queue`)
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  return (
    <Drawer
      title="Add walk-in"
      onClose={close}
      footer={
        <>
          <button type="button" className="btn" onClick={close}>Cancel</button>
          <button type="button" className="btn primary" onClick={save} disabled={busy}>
            <Check />
            Add to queue
          </button>
        </>
      }
    >
      <PatientPicker
        id="w-p"
        value={who}
        onChange={(v) => { setWho(v); setError('') }}
        hint={
          <>
            Not registered yet?{' '}
            <Link className="link" to="/patients/new" onClick={close}>
              Register them first
            </Link>
          </>
        }
      />
      <div className="field">
        <label htmlFor="w-pr">Priority</label>
        <select id="w-pr" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="low">Low</option>
          <option value="moderate">Moderate</option>
          <option value="urgent">Urgent — seen first</option>
        </select>
      </div>
      <FormError error={error} />
    </Drawer>
  )
}

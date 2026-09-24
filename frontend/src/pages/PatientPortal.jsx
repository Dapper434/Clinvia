import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiDownload } from '../api/client.js'
import {
  bookMyAppointmentApi,
  cancelMyAppointmentApi,
  getMyTreatmentApi,
  linkMyRecordApi,
  logMyDoseApi,
  mySlotsApi,
  uploadMyFileApi,
} from '../api/portal.js'
import AdherenceCalendar from '../components/patients/AdherenceCalendar.jsx'
import ReminderCard from '../components/patients/ReminderCard.jsx'
import StatsCard from '../components/dashboard/StatsCard.jsx'
import { useAuth } from '../context/useAuth.js'
import { daysRemainingInTreatment, getRiskLevel } from '../utils/adherence.js'
import { todayISODate } from '../utils/dateHelpers.js'
import {
  Activity,
  CalendarCheck,
  CalendarPlus,
  CheckCircle2,
  ChevronRight,
  FileUp,
  FlaskConical,
  HeartPulse,
  Mail,
  Pill,
  Stethoscope,
} from 'lucide-react'

const LAB_RESULT_TONE = { positive: 'bad', abnormal: 'warning', negative: 'good', normal: 'good', pending: 'warning' }
const FILE_TYPES = [['referral', 'Referral letter'], ['lab_report', 'Lab report'], ['prescription', 'Prescription'], ['xray', 'Chest X-ray'], ['discharge_summary', 'Discharge summary']]
const card = 'rounded-3xl border border-gray-200 bg-white p-6 shadow-sm'
const input = 'w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500'
const niceDate = (s) => new Date(`${s.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })

function LinkRecord({ onLinked }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await linkMyRecordApi(code.trim())
      onLinked()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-teal-100 bg-white p-6 sm:p-8 shadow-sm">
      <h1 className="text-xl font-bold text-gray-900">Connect your clinic record</h1>
      <p className="mt-2 text-sm text-gray-600">
        Enter the link code your clinic gave you. Once connected you&apos;ll see your treatment, results and appointments here.
      </p>
      <form onSubmit={submit} className="mt-5 flex flex-wrap gap-3">
        <label htmlFor="link-code" className="sr-only">Link code</label>
        <input id="link-code" className={`${input} max-w-[220px] uppercase tracking-wider`} value={code} onChange={(e) => setCode(e.target.value)} placeholder="K7M4-QX2P" />
        <button type="submit" disabled={busy || !code.trim()} className="rounded-xl bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">Connect</button>
      </form>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      <p className="mt-4 text-xs text-gray-500">No code? Ask at your clinic&apos;s reception; they can read it from your record.</p>
    </div>
  )
}

function BookAppointment({ doctors, onBooked }) {
  const today = todayISODate()
  const [doc, setDoc] = useState(doctors[0]?.code || '')
  const [date, setDate] = useState(today)
  const [slots, setSlots] = useState(null)
  const [time, setTime] = useState(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    if (!doc || !date) return undefined
    let alive = true
    mySlotsApi(doc, date).then((s) => alive && setSlots(s)).catch((e) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [doc, date])
  async function book() {
    if (!time) {
      setError('Pick a time.')
      return
    }
    try {
      const r = await bookMyAppointmentApi({ doctorCode: doc, date, time, reason })
      onBooked(`Booked with ${r.doctor}, ${niceDate(r.date)} at ${r.time}`)
    } catch (e) {
      setError(e.message)
    }
  }
  if (!doctors.length) return <p className="text-sm text-gray-500">No doctor is taking bookings right now. Call your clinic to book.</p>
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-gray-700">Doctor
          <select className={`${input} mt-1`} value={doc} onChange={(e) => { setDoc(e.target.value); setTime(null) }}>
            {doctors.map((d) => <option key={d.code} value={d.code}>{d.name}{d.specialty ? `, ${d.specialty}` : ''}</option>)}
          </select>
        </label>
        <label className="text-sm text-gray-700">Date
          <input type="date" min={today} className={`${input} mt-1`} value={date} onChange={(e) => { setDate(e.target.value || today); setTime(null) }} />
        </label>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {(slots?.slots || []).map((s) => (
          <button key={s.time} type="button" disabled={!s.free} onClick={() => setTime(s.time)}
            className={`rounded-lg border py-1.5 text-xs ${s.time === time ? 'border-teal-600 bg-teal-600 text-white' : 'border-gray-200'} disabled:bg-gray-50 disabled:text-gray-400 disabled:line-through`}>
            {s.time}
          </button>
        ))}
      </div>
      {slots?.closed ? <p className="text-xs text-gray-500">The clinic is closed at weekends.</p> : null}
      <input className={input} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What is it about? (optional)" />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button type="button" onClick={book} className="rounded-xl bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700">Book appointment</button>
    </div>
  )
}

export default function PatientPortal() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [booking, setBooking] = useState(false)
  const [upload, setUpload] = useState({ type: 'referral', file: null })

  const reload = useCallback(async () => {
    if (!user) return
    try {
      setError('')
      setData(await getMyTreatmentApi())
    } catch (err) {
      setError(err.message || 'Could not retrieve your record')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    // Deferred out of the synchronous effect body (react-hooks/set-state-in-effect).
    Promise.resolve().then(reload)
  }, [reload])

  const done = async (msg) => {
    setMessage(msg)
    setBooking(false)
    await reload()
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <HeartPulse className="h-8 w-8 animate-pulse text-teal-600" />
          <p className="text-sm text-gray-500">Loading your treatment information…</p>
        </div>
      </div>
    )
  }
  if (data?.needsLink) return <LinkRecord onLinked={reload} />
  if (!data?.patient) {
    return <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">{error || 'We could not load your record.'}</div>
  }

  const patient = data.patient
  const today = data.today
  const doseLogs = data.doseLogs
  const labResults = data.labResults
  const todayLog = doseLogs.find((d) => d.date === today)
  const adherence = data.adherence
  const risk = getRiskLevel(adherence ?? 0)
  const weekCutoff = new Date(`${today}T00:00:00`)
  weekCutoff.setDate(weekCutoff.getDate() - 6)
  const dosesThisWeek = doseLogs.filter((d) => d.taken && new Date(`${d.date}T00:00:00`) >= weekCutoff).length
  const upcoming = data.appointments.filter((a) => a.status === 'scheduled' && a.at.slice(0, 10) >= today)
  const doctor = patient.assigned_doctor

  async function checkIn() {
    setSaving(true)
    setError('')
    try {
      await logMyDoseApi({ date: today, taken: true })
      await done('Well done! Your dose is logged and your care team can see it.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function sendFile(e) {
    e.preventDefault()
    if (!upload.file) {
      setError('Choose a file to upload.')
      return
    }
    try {
      await uploadMyFileApi(upload.file, upload.type)
      setUpload({ type: upload.type, file: null })
      e.target.reset()
      await done(`${upload.file.name} uploaded. Your care team can open it from your record.`)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-500/10 via-white to-teal-500/5 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Hello, {patient.name.split(' ')[0]}</h1>
            <p className="mt-1 text-sm text-gray-600">
              {data.onTreatment ? <>Regimen: <span className="font-semibold text-gray-800">{patient.regimen}</span> · </> : null}
              Clinic: <span className="font-semibold text-gray-800">{patient.facility ?? 'Your clinic'}</span> · Your code: <span className="font-semibold text-gray-800">{patient.code}</span>
            </p>
          </div>
          <Link to="/my-profile" className="inline-flex items-center gap-1.5 rounded-2xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-700">
            <span>View full profile</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
      {message ? (
        <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600" />
          <span>{message}</span>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.onTreatment ? (
          <>
            <StatsCard label="Adherence" value={adherence != null ? `${adherence}%` : '—'} icon={Activity}
              tone={risk === 'good' ? 'good' : risk === 'warning' ? 'warning' : 'bad'} hint="Last 30 days" />
            <StatsCard label="Days Remaining" value={daysRemainingInTreatment(patient.treatment_start)} icon={CalendarCheck} tone="neutral" hint="Until the standard course ends" />
            <StatsCard label="Doses This Week" value={`${dosesThisWeek}/7`} icon={Pill} tone={dosesThisWeek >= 6 ? 'good' : dosesThisWeek >= 4 ? 'warning' : 'bad'} hint="Taken in the last 7 days" />
          </>
        ) : null}
        <StatsCard label="Appointments" value={upcoming.length} icon={CalendarPlus} tone="neutral" hint={upcoming[0] ? `Next: ${niceDate(upcoming[0].at)}` : 'None booked'} />
        <StatsCard label="Lab Results" value={labResults.length} icon={FlaskConical} tone="neutral" hint={labResults.length ? `Latest: ${labResults[0].result}` : 'None recorded yet'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {data.onTreatment ? (
            <div className="rounded-3xl border-2 border-teal-500/30 bg-white p-6 sm:p-8 shadow-lg shadow-teal-500/5">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600"><Pill className="h-5 w-5" /></div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Daily medication check-in</h2>
                  <p className="text-xs text-gray-500">Today: {niceDate(today)}</p>
                </div>
              </div>
              {todayLog ? (
                <p className="mt-4 text-sm text-gray-700">
                  {todayLog.taken
                    ? todayLog.source === 'patient_portal' ? 'You checked in today’s dose. See you tomorrow!' : 'Your clinic recorded today’s dose as taken.'
                    : 'Your clinic recorded today’s dose as missed. If that’s wrong, let them know.'}
                </p>
              ) : (
                <>
                  <p className="mt-2 text-sm text-gray-600">Took your TB medicine today? Check in so your care team can see you&apos;re on track.</p>
                  <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-gray-100 pt-4">
                    <button type="button" disabled={saving} onClick={checkIn} className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-50">
                      {saving ? 'Saving…' : 'I took today’s dose'}
                    </button>
                    <p className="text-xs text-gray-500">Missed it? Tell your clinic — they&apos;ll record it and help you get back on track.</p>
                  </div>
                </>
              )}
            </div>
          ) : null}

          <div className={card}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-900">Appointments</h2>
              {!booking ? (
                <button type="button" onClick={() => setBooking(true)} className="rounded-xl border border-teal-600 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50">Book an appointment</button>
              ) : null}
            </div>
            {booking ? <BookAppointment doctors={data.doctors} onBooked={done} /> : null}
            {!booking ? (
              upcoming.length ? (
                <div className="space-y-2">
                  {upcoming.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{niceDate(a.at)} at {a.at.slice(11, 16)}</p>
                        <p className="text-xs text-gray-500">{a.reason} with {a.doctor}</p>
                      </div>
                      <button type="button" className="text-xs font-semibold text-red-700 hover:underline"
                        onClick={async () => { await cancelMyAppointmentApi(a.id); await done('Appointment cancelled') }}>Cancel</button>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-gray-500">No upcoming appointments.</p>
            ) : null}
          </div>

          <div className={card}>
            <h2 className="mb-4 text-lg font-bold text-gray-900">Lab results</h2>
            {labResults.length ? (
              <div className="space-y-2">
                {labResults.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
                    <div><p className="text-sm font-medium text-gray-900">{r.test}</p><p className="text-xs text-gray-500">{r.collected}</p></div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                      LAB_RESULT_TONE[r.result] === 'bad' ? 'bg-rose-100 text-rose-700' : LAB_RESULT_TONE[r.result] === 'good' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {r.result}
                    </span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-500">No lab results recorded yet.</p>}
          </div>
        </div>

        <div className="space-y-6">
          <div className={card}>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Your doctor</p>
            {doctor ? (
              <div className="mt-3 flex items-start gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700"><Stethoscope className="h-5 w-5" /></div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900">{doctor.fullName}</p>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-gray-500"><Mail className="h-3 w-3 flex-shrink-0" />{doctor.email}</p>
                </div>
              </div>
            ) : <p className="mt-3 text-sm text-gray-500">No doctor assigned yet. Your clinic will link one to your record.</p>}
          </div>

          {data.onTreatment ? <ReminderCard reminder={data.reminder} /> : null}

          {data.medications.length ? (
            <div className={card}>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Current medication</p>
              <ul className="mt-3 space-y-2">
                {data.medications.map((m) => (
                  <li key={m.id} className="text-sm"><span className="font-medium text-gray-900">{m.drug}</span> <span className="text-gray-500">{m.dose}, {m.freq.toLowerCase()}</span></li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className={card}>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">My documents</p>
            {data.files.length ? (
              <ul className="mt-3 space-y-2">
                {data.files.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-gray-800">{FILE_TYPES.find(([k]) => k === f.type)?.[1]}</span>
                    <button type="button" className="text-xs font-semibold text-teal-700 hover:underline"
                      onClick={() => apiDownload(`/api/patient-portal/files/${f.id}`, f.name, { open: true }).catch((err) => setError(err.message))}>Open</button>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-3 text-sm text-gray-500">Nothing yet.</p>}
            <form onSubmit={sendFile} className="mt-4 space-y-2 border-t border-gray-100 pt-4">
              <label htmlFor="up-type" className="text-xs text-gray-600">Share a document with your care team</label>
              <select id="up-type" className={input} value={upload.type} onChange={(e) => setUpload({ ...upload, type: e.target.value })}>
                {FILE_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <input type="file" accept="application/pdf,image/jpeg,image/png" className="block w-full text-xs" onChange={(e) => setUpload({ ...upload, file: e.target.files?.[0] || null })} />
              <button type="submit" className="inline-flex items-center gap-1.5 rounded-xl border border-teal-600 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50"><FileUp className="h-3.5 w-3.5" />Upload</button>
            </form>
          </div>
        </div>
      </div>

      {data.onTreatment ? (
        <div className={card}>
          <h2 className="mb-4 text-lg font-bold text-gray-900">Treatment history calendar</h2>
          <AdherenceCalendar treatmentStart={patient.treatment_start} doseLogs={doseLogs} />
        </div>
      ) : null}
    </div>
  )
}

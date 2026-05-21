import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../utils/supabaseClient.js'
import { useAuth } from '../context/useAuth.js'
import {
  calcAdherence,
  daysRemainingInTreatment,
  getRiskLevel,
  TREATMENT_DAYS_DEFAULT,
} from '../utils/adherence.js'
import { todayISODate } from '../utils/dateHelpers.js'
import { ensurePatientRecord } from '../utils/patientRecord.js'
import AdherenceCalendar from '../components/patients/AdherenceCalendar.jsx'
import DoseToggle from '../components/patients/DoseToggle.jsx'
import StatusBadge from '../components/patients/StatusBadge.jsx'

export default function PatientPortal() {
  const { user, profile, patientId, refreshPatientId } = useAuth()
  const [patient, setPatient] = useState(null)
  const [doseLogs, setDoseLogs] = useState([])
  const [todayTaken, setTodayTaken] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const reload = useCallback(async () => {
    if (!user) return
    setError('')
    setLoading(true)

    let pid = patientId
    if (!pid) {
      const ensured = await ensurePatientRecord(user.id, {
        name: profile?.full_name || user.email?.split('@')[0] || 'Patient',
        treatment_start: todayISODate(),
        tb_type: 'pulmonary',
        regimen: 'HRZE',
        status: 'active',
      })
      if (ensured.error) {
        setError(ensured.error.message)
        setLoading(false)
        return
      }
      pid = ensured.patientId
      await refreshPatientId()
    }

    const { data: p, error: e1 } = await supabase.from('patients').select('*').eq('id', pid).maybeSingle()
    if (e1 || !p) {
      setError(e1?.message || 'Could not load your treatment record')
      setLoading(false)
      return
    }
    setPatient(p)

    const { data: logs, error: e2 } = await supabase
      .from('dose_logs')
      .select('*')
      .eq('patient_id', pid)
      .order('date', { ascending: true })
    if (e2) {
      setError(e2.message)
      setLoading(false)
      return
    }
    setDoseLogs(logs ?? [])

    const today = todayISODate()
    const todayLog = (logs ?? []).find((row) => row.date === today)
    setTodayTaken(todayLog ? todayLog.taken : null)
    setLoading(false)
  }, [user, patientId, profile, refreshPatientId])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    reload()
  }, [reload])
  /* eslint-enable react-hooks/set-state-in-effect */

  async function saveTodayDose() {
    if (!patient || !user || todayTaken === null) return
    setSaving(true)
    setError('')
    setMessage('')
    const { error: err } = await supabase.from('dose_logs').upsert(
      {
        patient_id: patient.id,
        date: todayISODate(),
        taken: Boolean(todayTaken),
        logged_by: user.id,
      },
      { onConflict: 'patient_id,date' },
    )
    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    setMessage('Saved — your clinic can see this on your adherence calendar.')
    reload()
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading your treatment…</p>
  }

  if (!patient) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error || 'No treatment record found. Contact your clinic or sign up again.'}
      </div>
    )
  }

  const adherence = calcAdherence(doseLogs, patient.treatment_start)
  const risk = getRiskLevel(adherence)
  const riskBadge =
    risk === 'good'
      ? 'bg-green-100 text-green-800'
      : risk === 'warning'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-red-100 text-red-700'
  const remaining = daysRemainingInTreatment(patient.treatment_start)
  const today = todayISODate()

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-semibold text-gray-900">Hello, {patient.name}</h2>
          <StatusBadge status={patient.status} />
        </div>
        <p className="mt-1 text-sm text-gray-600">
          {patient.regimen ?? '—'} · {patient.facility ?? 'Your clinic'} · started {patient.treatment_start}
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</div>
      ) : null}
      {message ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">{message}</div>
      ) : null}

      

      <div className="rounded-xl border border-teal-200 bg-teal-50 p-5">
        <h3 className="text-sm font-semibold text-teal-900">Today&apos;s dose · {today}</h3>
        <p className="mt-1 text-sm text-teal-800">
          Mark whether you took your medication. This updates the same calendar your hospital team uses.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <DoseToggle value={todayTaken} onChange={setTodayTaken} />
          <button
            type="button"
            disabled={todayTaken === null || saving}
            onClick={saveTodayDose}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save today'}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className={`rounded-xl border border-gray-200 p-4 ${riskBadge}`}>
          <p className="text-xs font-medium uppercase tracking-wide opacity-80">Your adherence</p>
          <p className="mt-1 text-3xl font-semibold">{adherence}%</p>
          <p className="mt-2 text-xs opacity-90">
            {remaining} days remaining (of {TREATMENT_DAYS_DEFAULT})
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Your patient ID</p>
          <p className="mt-2 font-mono text-xs text-gray-700 break-all">{patient.id}</p>
          <p className="mt-2 text-xs text-gray-500">Share this with your clinic if they registered you first.</p>
        </div>
      </div>

      <AdherenceCalendar treatmentStart={patient.treatment_start} doseLogs={doseLogs} />
    </div>
  )
}

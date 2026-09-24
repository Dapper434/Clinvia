import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { getMyTreatmentApi, logMyDoseApi } from '../api/portal.js'
import { calcAdherence, daysRemainingInTreatment, getRiskLevel } from '../utils/adherence.js'
import { todayISODate } from '../utils/dateHelpers.js'
import AdherenceCalendar from '../components/patients/AdherenceCalendar.jsx'
import DoseToggle from '../components/patients/DoseToggle.jsx'
import StatusBadge from '../components/patients/StatusBadge.jsx'
import StatsCard from '../components/dashboard/StatsCard.jsx'
import {
  Pill,
  CheckCircle2,
  HeartPulse,
  Activity,
  CalendarCheck,
  FlaskConical,
  Stethoscope,
  Mail,
  ChevronRight,
} from 'lucide-react'

const LAB_RESULT_TONE = { positive: 'bad', negative: 'good', pending: 'warning' }

export default function PatientPortal() {
  const { user } = useAuth()
  const [patient, setPatient] = useState(null)
  const [doseLogs, setDoseLogs] = useState([])
  const [labResults, setLabResults] = useState([])
  const [todayTaken, setTodayTaken] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const reload = useCallback(async () => {
    if (!user) return
    try {
      setError('')
      setLoading(true)
      const { patient: p, doseLogs: logs, labResults: labs } = await getMyTreatmentApi()
      if (!p) {
        setError('No active treatment record found linked to your account.')
        setLoading(false)
        return
      }
      setPatient(p)
      setDoseLogs(logs ?? [])
      setLabResults(labs ?? [])

      const today = todayISODate()
      const todayLog = (logs ?? []).find((row) => row.date === today)
      setTodayTaken(todayLog ? todayLog.taken : null)
    } catch (err) {
      setError(err.message || 'Could not retrieve treatment record')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    // Defer the fetch out of the synchronous effect body
    // (react-hooks/set-state-in-effect).
    Promise.resolve().then(reload)
  }, [reload])

  async function saveTodayDose() {
    if (!patient || !user || todayTaken === null) return
    setSaving(true)
    setError('')
    setMessage('')

    try {
      await logMyDoseApi({
        date: todayISODate(),
        taken: Boolean(todayTaken),
      })
      setMessage('Great job! Your dose was logged and submitted to your healthcare provider.')
      await reload()
    } catch (err) {
      setError(err.message || 'Failed to save dose log')
    } finally {
      setSaving(false)
    }
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

  if (!patient) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 shadow-sm">
        <p className="font-semibold text-base">Account Registration Pending</p>
        <p className="mt-2">
          {error || 'Your account is not yet connected to a clinical treatment record. Please contact your healthcare worker at the clinic to link your patient profile.'}
        </p>
      </div>
    )
  }

  const adherence = calcAdherence(doseLogs, patient.treatment_start)
  const risk = getRiskLevel(adherence)
  const remaining = daysRemainingInTreatment(patient.treatment_start)
  const today = todayISODate()

  const weekCutoff = new Date()
  weekCutoff.setDate(weekCutoff.getDate() - 6)
  const dosesThisWeek = doseLogs.filter((d) => d.taken && new Date(d.date) >= weekCutoff).length

  const doctor = patient.assigned_doctor

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Greeting Banner */}
      <div className="rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-500/10 via-white to-teal-500/5 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                Hello, {patient.name.split(' ')[0]}
              </h1>
              <StatusBadge status={patient.status} />
            </div>
            <p className="mt-1 text-sm text-gray-600">
              Regimen: <span className="font-semibold text-gray-800">{patient.regimen ?? 'HRZE'}</span> · Clinic: <span className="font-semibold text-gray-800">{patient.facility ?? 'Assigned Health Center'}</span>
            </p>
          </div>
          <Link
            to="/my-profile"
            className="inline-flex items-center gap-1.5 rounded-2xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-700"
          >
            <span>View full profile</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      ) : null}

      {message ? (
        <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      ) : null}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          label="Overall Adherence"
          value={`${adherence}%`}
          icon={Activity}
          tone={risk === 'good' ? 'good' : risk === 'warning' ? 'warning' : 'bad'}
          hint="Since treatment started"
        />
        <StatsCard
          label="Days Remaining"
          value={remaining}
          icon={CalendarCheck}
          tone="neutral"
          hint="Until standard cycle ends"
        />
        <StatsCard
          label="Doses This Week"
          value={`${dosesThisWeek}/7`}
          icon={Pill}
          tone={dosesThisWeek >= 6 ? 'good' : dosesThisWeek >= 4 ? 'warning' : 'bad'}
          hint="Taken in the last 7 days"
        />
        <StatsCard
          label="Lab Results"
          value={labResults.length}
          icon={FlaskConical}
          tone="neutral"
          hint={labResults.length ? `Latest: ${labResults[0].result}` : 'None recorded yet'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Daily Dose Action Card */}
        <div className="rounded-3xl border-2 border-teal-500/30 bg-white p-6 sm:p-8 shadow-lg shadow-teal-500/5 lg:col-span-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <Pill className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Daily Medication Check-in</h2>
              <p className="text-xs text-gray-500">Today: {today}</p>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Did you take your prescribed tuberculosis medication today? Regular daily adherence is key to complete recovery and prevents drug resistance.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4 pt-4 border-t border-gray-100">
            <DoseToggle value={todayTaken} onChange={setTodayTaken} />
            <button
              type="button"
              disabled={todayTaken === null || saving}
              onClick={saveTodayDose}
              className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Submit Today’s Log'}
            </button>
          </div>
        </div>

        {/* Your Doctor Card */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Your Doctor</p>
          {doctor ? (
            <div className="mt-3 flex items-start gap-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-900">{doctor.fullName}</p>
                <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-gray-500">
                  <Mail className="h-3 w-3 flex-shrink-0" />
                  {doctor.email}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-500">
              No doctor assigned yet. Your clinic will link one to your record.
            </p>
          )}
        </div>
      </div>

      {/* Lab Results */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Lab Results</h2>
        {labResults.length ? (
          <div className="space-y-2">
            {labResults.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium capitalize text-gray-900">
                    {r.test_type?.replaceAll('_', ' ')}
                  </p>
                  <p className="text-xs text-gray-500">{r.result_date}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                    LAB_RESULT_TONE[r.result] === 'bad'
                      ? 'bg-rose-100 text-rose-700'
                      : LAB_RESULT_TONE[r.result] === 'good'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {r.result}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No lab results recorded yet.</p>
        )}
      </div>

      {/* Adherence Calendar Matrix */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Treatment History Calendar</h2>
        <AdherenceCalendar treatmentStart={patient.treatment_start} doseLogs={doseLogs} />
      </div>
    </div>
  )
}

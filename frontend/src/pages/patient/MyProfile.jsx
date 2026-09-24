import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyTreatmentApi } from '../../api/portal.js'
import StatusBadge from '../../components/patients/StatusBadge.jsx'
import { formatDoseTime } from '../../utils/doseTimes.js'
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Stethoscope,
  Mail,
  Activity,
  ShieldAlert,
} from 'lucide-react'

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-3 last:border-b-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value ?? '—'}</span>
    </div>
  )
}

export default function MyProfile() {
  const [patient, setPatient] = useState(null)
  const [labResults, setLabResults] = useState([])
  const [reminder, setReminder] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    try {
      setError('')
      setLoading(true)
      const { patient: p, labResults: labs, reminder: rem } = await getMyTreatmentApi()
      setPatient(p ?? null)
      setLabResults(labs ?? [])
      setReminder(rem ?? null)
    } catch (err) {
      setError(err.message || 'Could not load your profile')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    Promise.resolve().then(reload)
  }, [reload])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-gray-500">Loading your profile…</p>
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 shadow-sm">
        <p className="font-semibold">{error || 'No profile found.'}</p>
      </div>
    )
  }

  const doctor = patient.assigned_doctor
  const initials = patient.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/my-treatment" className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 hover:underline">
        <ArrowLeft className="h-4 w-4" />
        Back to treatment
      </Link>

      {/* Header */}
      <div className="rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-500/10 via-white to-teal-500/5 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-teal-600 text-xl font-bold text-white">
            {initials}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
              <StatusBadge status={patient.status} />
            </div>
            <p className="mt-1 text-sm text-gray-600">
              Patient ID: <span className="font-mono text-xs text-gray-800">{patient.id}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Personal & clinical info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <User className="h-4 w-4 text-teal-600" />
              Personal Details
            </h2>
            <div className="mt-2">
              <InfoRow label="Age" value={patient.age} />
              <InfoRow label="Gender" value={patient.gender} />
              <InfoRow label="Phone" value={patient.phone} />
              <InfoRow label="Address" value={patient.address} />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Activity className="h-4 w-4 text-teal-600" />
              Clinical Details
            </h2>
            <div className="mt-2">
              <InfoRow label="TB Type" value={patient.tb_type?.replace('-', ' ')} />
              <InfoRow label="Regimen" value={patient.regimen} />
              <InfoRow label="Treatment Start" value={patient.treatment_start} />
              <InfoRow
                label="Daily Dose Time"
                value={
                  reminder
                    ? `${formatDoseTime(reminder.doseTime)} (${reminder.setByDoctor ? 'set by your doctor' : 'standard'})`
                    : null
                }
              />
              <InfoRow label="Facility" value={patient.facility} />
              <InfoRow
                label="MDR-TB Status"
                value={
                  patient.mdr_flag ? (
                    <span className="inline-flex items-center gap-1 text-rose-600">
                      <ShieldAlert className="h-3.5 w-3.5" /> Rifampicin-resistant
                    </span>
                  ) : (
                    'Not detected'
                  )
                }
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Lab Results</h2>
            {labResults.length ? (
              <div className="mt-3 space-y-2">
                {labResults.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-gray-600">{r.test_type?.replaceAll('_', ' ')}</span>
                    <span className="text-gray-500">{r.result_date}</span>
                    <span className="capitalize font-medium text-gray-900">{r.result}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-500">No lab results recorded yet.</p>
            )}
          </div>
        </div>

        {/* Care team */}
        <div className="self-start rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Stethoscope className="h-4 w-4 text-teal-600" />
            Care Team
          </h2>
          {doctor ? (
            <div className="mt-4 flex items-start gap-3">
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

          {patient.facility ? (
            <div className="mt-5 flex items-start gap-2 border-t border-gray-100 pt-4 text-sm text-gray-600">
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
              <span>{patient.facility}</span>
            </div>
          ) : null}
          {patient.phone ? (
            <div className="mt-2 flex items-start gap-2 text-sm text-gray-600">
              <Phone className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
              <span>{patient.phone}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

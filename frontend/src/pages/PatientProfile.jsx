import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { getPatientByIdApi } from '../api/patients.js'
import { getDoseLogsApi, upsertDoseLogApi } from '../api/doseLogs.js'
import { getLabsApi } from '../api/labs.js'
import { getContactsApi } from '../api/contacts.js'
import {
  calcAdherence,
  daysRemainingInTreatment,
  getRiskLevel,
  TREATMENT_DAYS_DEFAULT,
} from '../utils/adherence.js'
import { todayISODate } from '../utils/dateHelpers.js'
import StatusBadge from '../components/patients/StatusBadge.jsx'
import PatientIdCard from '../components/patients/PatientIdCard.jsx'
import AdherenceCalendar from '../components/patients/AdherenceCalendar.jsx'
import LabResultsTable from '../components/labs/LabResultsTable.jsx'
import LabResultForm from '../components/labs/LabResultForm.jsx'
import ContactTracingTable from '../components/contacts/ContactTracingTable.jsx'
import ContactForm from '../components/contacts/ContactForm.jsx'
import { CheckCircle2, XCircle, ArrowLeft } from 'lucide-react'

export default function PatientProfile() {
  const { id } = useParams()
  const { user } = useAuth()
  const [patient, setPatient] = useState(null)
  const [doseLogs, setDoseLogs] = useState([])
  const [labs, setLabs] = useState([])
  const [contacts, setContacts] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    try {
      setError('')
      const p = await getPatientByIdApi(id)
      if (!p) {
        setError('Patient not found')
        setPatient(null)
        return
      }
      setPatient(p)

      const [logs, labRows, cRows] = await Promise.all([
        getDoseLogsApi({ patient_id: id }),
        getLabsApi({ patient_id: id }),
        getContactsApi({ source_patient_id: id }),
      ])

      setDoseLogs(logs ?? [])
      setLabs(labRows ?? [])
      setContacts(cRows ?? [])
    } catch (err) {
      setError(err.message || 'Failed to load patient records')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    // Defer the fetch out of the synchronous effect body
    // (react-hooks/set-state-in-effect).
    Promise.resolve().then(reload)
  }, [reload])

  const adherence = patient ? calcAdherence(doseLogs, patient.treatment_start) : 0
  const risk = getRiskLevel(adherence)
  const riskBadge =
    risk === 'good'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
      : risk === 'warning'
        ? 'bg-amber-50 border-amber-200 text-amber-900'
        : 'bg-rose-50 border-rose-200 text-rose-900'

  async function logDose(taken) {
    if (!patient || !user) return
    setBusy(true)
    setError('')
    try {
      await upsertDoseLogApi({
        patient_id: patient.id,
        date: todayISODate(),
        taken,
        logged_by: user.id,
      })
      await reload()
    } catch (err) {
      setError(err.message || 'Failed to log dose')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-gray-500">Loading patient profile…</p>
      </div>
    )
  }

  if (error && !patient) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">{error}</p>
        </div>
        <Link to="/patients" className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 hover:underline">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to patients</span>
        </Link>
      </div>
    )
  }

  if (!patient) {
    return <p className="text-sm text-gray-500">No patient details found.</p>
  }

  const remaining = daysRemainingInTreatment(patient.treatment_start)

  return (
    <div className="space-y-8">
      {/* Header and Quick Actions */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{patient.name}</h1>
            {patient.mdr_flag ? (
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700 uppercase tracking-wide">
                MDR-TB
              </span>
            ) : null}
            <StatusBadge status={patient.status} />
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Age {patient.age ?? '—'} ·{' '}
            <span className="capitalize">{patient.tb_type?.replace('-', ' ') ?? '—'}</span> · {patient.facility ?? '—'}
          </p>
          {patient.user_id ? (
            <p className="mt-1.5 text-xs font-medium text-teal-700">
              Linked to patient portal — self-logged adherence synchronizes in real-time
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => logDose(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Mark Taken (Today)</span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => logDose(false)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-100 disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />
            <span>Mark Missed (Today)</span>
          </button>
          <Link
            to="/patients"
            className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Back to list
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      ) : null}

      {!patient.user_id ? (
        <PatientIdCard
          patientId={patient.id}
          title="Patient Portal Link ID — provide this to the patient"
        />
      ) : null}

      {/* Metric Cards */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className={`rounded-2xl border p-5 shadow-sm ${riskBadge}`}>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Adherence Score</p>
          <p className="mt-1 text-3xl font-bold">{adherence}%</p>
          <p className="mt-2 text-xs opacity-90 font-medium">
            {remaining} days remaining (out of {TREATMENT_DAYS_DEFAULT} standard cycle)
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Prescription Regimen</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{patient.regimen ?? 'Standard HRZE'}</p>
          <p className="mt-2 text-xs text-gray-500">Treatment started: {patient.treatment_start}</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Patient Contact</p>
          <p className="mt-1 text-lg font-bold text-gray-900">{patient.phone ?? 'No phone recorded'}</p>
          <p className="mt-2 text-xs text-gray-500 truncate">{patient.address ?? 'No physical address on file'}</p>
        </div>
      </div>

      {/* Adherence Calendar */}
      <AdherenceCalendar
        treatmentStart={patient.treatment_start}
        doseLogs={doseLogs}
        subtitle={patient.user_id ? 'Includes direct patient-reported doses' : undefined}
      />

      {/* Lab Results */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Laboratory Diagnostic Tests</h2>
        <LabResultsTable rows={labs} />
        <LabResultForm patientId={patient.id} onSaved={reload} />
      </section>

      {/* Contact Tracing */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Household Contact Tracing</h2>
        <ContactTracingTable contacts={contacts} />
        <ContactForm sourcePatientId={patient.id} onSaved={reload} />
      </section>
    </div>
  )
}

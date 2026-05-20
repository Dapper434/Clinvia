import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../utils/supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'
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

export default function PatientProfile() {
  const { id } = useParams()
  const { user } = useAuth()
  const [patient, setPatient] = useState(null)
  const [doseLogs, setDoseLogs] = useState([])
  const [labs, setLabs] = useState([])
  const [contacts, setContacts] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    setError('')
    const { data: p, error: e1 } = await supabase.from('patients').select('*').eq('id', id).maybeSingle()
    if (e1 || !p) {
      setError(e1?.message || 'Patient not found')
      setPatient(null)
      return
    }
    setPatient(p)
    const [{ data: logs, error: e2 }, { data: labRows, error: e3 }, { data: cRows, error: e4 }] =
      await Promise.all([
        supabase.from('dose_logs').select('*').eq('patient_id', id).order('date', { ascending: true }),
        supabase.from('lab_results').select('*').eq('patient_id', id).order('result_date', { ascending: false }),
        supabase.from('contacts').select('*').eq('source_patient_id', id).order('name'),
      ])
    if (e2 || e3 || e4) {
      setError(e2?.message || e3?.message || e4?.message || 'Failed to load related data')
    }
    setDoseLogs(logs ?? [])
    setLabs(labRows ?? [])
    setContacts(cRows ?? [])
  }, [id])

  useEffect(() => {
    reload()
  }, [reload])

  const adherence = patient ? calcAdherence(doseLogs, patient.treatment_start) : 0
  const risk = getRiskLevel(adherence)
  const riskBadge =
    risk === 'good'
      ? 'bg-green-100 text-green-800'
      : risk === 'warning'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-red-100 text-red-700'

  async function logDose(taken) {
    if (!patient || !user) return
    setBusy(true)
    const { error: err } = await supabase.from('dose_logs').upsert(
      {
        patient_id: patient.id,
        date: todayISODate(),
        taken,
        logged_by: user.id,
      },
      { onConflict: 'patient_id,date' },
    )
    setBusy(false)
    if (err) {
      setError(err.message)
      return
    }
    reload()
  }

  if (error && !patient) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-700">{error}</p>
        <Link to="/patients" className="text-teal-700 underline">
          Back to patients
        </Link>
      </div>
    )
  }

  if (!patient) {
    return <p className="text-sm text-gray-500">Loading patient…</p>
  }

  const remaining = daysRemainingInTreatment(patient.treatment_start)

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold text-gray-900">{patient.name}</h2>
            {patient.mdr_flag ? (
              <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">MDR</span>
            ) : null}
            <StatusBadge status={patient.status} />
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Age {patient.age ?? '—'} ·{' '}
            <span className="capitalize">{patient.tb_type?.replace('-', ' ') ?? '—'}</span> · {patient.facility ?? '—'}
          </p>
          {patient.user_id ? (
            <p className="mt-2 text-xs text-teal-700">Linked to patient portal — self-logged doses appear below</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => logDose(true)}
            className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            Mark dose taken (today)
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => logDose(false)}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50"
          >
            Mark missed (today)
          </button>
          <Link
            to="/patients"
            className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to list
          </Link>
        </div>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</div> : null}

      {!patient.user_id ? (
        <PatientIdCard
          patientId={patient.id}
          title="Portal link-up ID — give this to the patient"
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className={`rounded-xl border border-gray-200 p-4 ${riskBadge}`}>
          <p className="text-xs font-medium uppercase tracking-wide opacity-80">Adherence</p>
          <p className="mt-1 text-3xl font-semibold">{adherence}%</p>
          <p className="mt-2 text-xs opacity-90">
            {remaining} days remaining (of {TREATMENT_DAYS_DEFAULT} in UI model)
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Regimen</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{patient.regimen ?? '—'}</p>
          <p className="mt-2 text-sm text-gray-600">Started {patient.treatment_start}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Contact</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{patient.phone ?? '—'}</p>
          <p className="mt-2 text-sm text-gray-600">{patient.address ?? 'No address on file'}</p>
        </div>
      </div>

      <AdherenceCalendar
        treatmentStart={patient.treatment_start}
        doseLogs={doseLogs}
        subtitle={patient.user_id ? 'Includes doses logged by the patient in their portal' : undefined}
      />

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Lab results</h3>
        <LabResultsTable rows={labs} />
        <LabResultForm patientId={patient.id} onSaved={reload} />
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Contact tracing</h3>
        <ContactTracingTable contacts={contacts} />
        <ContactForm sourcePatientId={patient.id} onSaved={reload} />
      </section>
    </div>
  )
}

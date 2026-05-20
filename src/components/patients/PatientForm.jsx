import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../../utils/supabaseClient.js'
import { useAuth } from '../../context/AuthContext.jsx'
import PatientIdCard from './PatientIdCard.jsx'

const empty = {
  name: '',
  age: '',
  gender: 'male',
  phone: '',
  address: '',
  facility: '',
  tb_type: 'pulmonary',
  regimen: 'HRZE',
  treatment_start: new Date().toISOString().slice(0, 10),
  status: 'active',
  mdr_flag: false,
  lat: '',
  lng: '',
}

export default function PatientForm() {
  const { user, isHospital } = useAuth()
  const [params] = useSearchParams()
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [savedId, setSavedId] = useState(null)

  useEffect(() => {
    const preName = params.get('name')
    const preAge = params.get('age')
    const prePhone = params.get('phone')
    if (preName || preAge || prePhone) {
      setForm((f) => ({
        ...f,
        name: preName ?? f.name,
        age: preAge ?? f.age,
        phone: prePhone ?? f.phone,
      }))
    }
  }, [params])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  const canSubmit = useMemo(() => form.name.trim().length > 0 && form.treatment_start, [form])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    if (!isHospital) {
      setError('You must be signed in as hospital staff to register patients. Use /login/hospital.')
      return
    }
    setBusy(true)
    setError('')
    const payload = {
      name: form.name.trim(),
      age: form.age === '' ? null : Number(form.age),
      gender: form.gender,
      phone: form.phone || null,
      address: form.address || null,
      facility: form.facility || null,
      tb_type: form.tb_type,
      regimen: form.regimen || null,
      treatment_start: form.treatment_start,
      status: form.status,
      mdr_flag: Boolean(form.mdr_flag),
      lat: form.lat === '' ? null : (Number.isFinite(Number(form.lat)) ? Number(form.lat) : null),
      lng: form.lng === '' ? null : (Number.isFinite(Number(form.lng)) ? Number(form.lng) : null),
      registered_by: user?.id ?? null,
    }
    const { data, error: err } = await supabase.from('patients').insert([payload]).select('id').single()
    setBusy(false)
    if (err) {
      const hint =
        err.message?.includes('row-level security') || err.code === '42501'
          ? ' Permission denied — sign in as Hospital staff (/login/hospital) and run the updated schema in Supabase.'
          : ''
      setError(`${err.message}${hint}`)
      return
    }
    setSavedId(data.id)
  }

  if (savedId) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-xl border border-green-200 bg-green-50 p-6">
          <h2 className="text-xl font-semibold text-green-900">Patient registered</h2>
          <p className="mt-2 text-sm text-green-800">
            Share the Patient ID below so they can link their portal account at patient sign-up.
          </p>
        </div>
        <PatientIdCard patientId={savedId} />
        <div className="flex flex-wrap gap-3">
          <Link
            to={`/patients/${savedId}`}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Open patient profile
          </Link>
          <button
            type="button"
            onClick={() => {
              setSavedId(null)
              setForm(empty)
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Register another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Register patient</h2>
          <p className="mt-1 text-sm text-gray-500">
            Creates a patient record. Share the patient ID so they can link their portal account at sign-up.
          </p>
        </div>
        <Link to="/patients" className="text-sm font-medium text-teal-700 underline">
          Back to list
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-gray-200 bg-white p-6">
        <section>
          <h3 className="text-sm font-semibold text-gray-900">Personal</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-gray-600">Full name *</span>
              <input
                required
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">Age</span>
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.age}
                onChange={(e) => update('age', e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">Gender</span>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.gender}
                onChange={(e) => update('gender', e.target.value)}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">Phone</span>
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-gray-600">Address</span>
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
              />
            </label>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-gray-900">Clinical</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-gray-600">TB type</span>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.tb_type}
                onChange={(e) => update('tb_type', e.target.value)}
              >
                <option value="pulmonary">Pulmonary</option>
                <option value="extra-pulmonary">Extra-pulmonary</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">Regimen</span>
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.regimen}
                onChange={(e) => update('regimen', e.target.value)}
                placeholder="HRZE"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">Treatment start *</span>
              <input
                type="date"
                required
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.treatment_start}
                onChange={(e) => update('treatment_start', e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">Status</span>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.status}
                onChange={(e) => update('status', e.target.value)}
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="lost">Lost</option>
                <option value="died">Died</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={form.mdr_flag}
                onChange={(e) => update('mdr_flag', e.target.checked)}
              />
              <span className="text-gray-700">MDR-TB flag</span>
            </label>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-gray-900">Facility & map (optional)</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="text-gray-600">Facility name</span>
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.facility}
                onChange={(e) => update('facility', e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">Latitude</span>
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.lat}
                onChange={(e) => update('lat', e.target.value)}
                placeholder="-1.286389"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">Longitude</span>
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.lng}
                onChange={(e) => update('lng', e.target.value)}
                placeholder="36.817223"
              />
            </label>
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        ) : null}

        <div className="flex justify-end gap-3">
          <Link
            to="/patients"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!canSubmit || busy}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save patient'}
          </button>
        </div>
      </form>
    </div>
  )
}

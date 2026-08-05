import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/useAuth.js'
import { createPatientApi } from '../../api/patients.js'
import { registerPatientApi } from '../../api/auth.js'
import { Copy, Check, UserPlus, Eye, EyeOff } from 'lucide-react'

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
  patientEmail: '',
  patientPassword: '',
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-2 rounded p-1 text-gray-400 hover:text-teal-600 transition-colors"
      title="Copy"
    >
      {copied ? <Check className="h-4 w-4 text-teal-600" /> : <Copy className="h-4 w-4" />}
    </button>
  )
}

export default function PatientForm() {
  const { isHospital } = useAuth()
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [savedData, setSavedData] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  const canSubmit = useMemo(
    () =>
      form.name.trim().length > 0 &&
      form.treatment_start &&
      form.patientEmail.trim().length > 0 &&
      form.patientPassword.length >= 6,
    [form]
  )

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    if (!isHospital) {
      setError('You must be signed in as hospital staff to register patients.')
      return
    }
    setBusy(true)
    setError('')

    try {
      // Step 1: Create the patient record in the database
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
      }

      const patientData = await createPatientApi(payload)
      const patientId = patientData.id

      // Step 2: Create the patient's login account in the auth system and link it
      const email = form.patientEmail.trim()
      const password = form.patientPassword
      const patientName = form.name.trim()

      try {
        await registerPatientApi(email, password, patientName, null, patientId)
      } catch (authErr) {
        console.warn('Patient created, but auth registration notice:', authErr.message)
      }

      setSavedData({ patientId, email, password, name: patientName })
    } catch (err) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (savedData) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-xl border border-green-200 bg-green-50 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <UserPlus className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-green-900">Patient registered successfully</h2>
              <p className="text-sm text-green-700">{savedData.name} has been added to the system</p>
            </div>
          </div>
        </div>

        {/* Login credentials card */}
        <div className="rounded-xl border-2 border-teal-200 bg-white p-6 shadow-sm">
          <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-teal-700">
            Patient Login Credentials
          </h3>
          <p className="mb-4 text-sm text-gray-500">
            Give these details to the patient so they can log their daily doses.
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div>
                <p className="text-xs font-medium text-gray-500">Login Email</p>
                <p className="mt-0.5 font-mono text-sm text-gray-900">{savedData.email}</p>
              </div>
              <CopyButton text={savedData.email} />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div>
                <p className="text-xs font-medium text-gray-500">Password</p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-gray-900">{savedData.password}</p>
              </div>
              <CopyButton text={savedData.password} />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div>
                <p className="text-xs font-medium text-gray-500">Patient ID</p>
                <p className="mt-0.5 font-mono text-sm text-gray-900">{savedData.patientId}</p>
              </div>
              <CopyButton text={savedData.patientId} />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            to={`/patients/${savedData.patientId}`}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Open patient profile
          </Link>
          <button
            type="button"
            onClick={() => {
              setSavedData(null)
              setForm(empty)
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Register another patient
          </button>
        </div>
      </div>
    )
  }

  // ── Registration form ───────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Register patient</h2>
          <p className="mt-1 text-sm text-gray-500">
            Creates a patient record and sets up their login for the patient portal.
          </p>
        </div>
        <Link to="/patients" className="text-sm font-medium text-teal-700 underline">
          Back to list
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-gray-200 bg-white p-6">
        {/* Personal */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900">Personal</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-gray-600">Full name *</span>
              <input
                required
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ring-teal-600 focus:ring-2"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">Age</span>
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ring-teal-600 focus:ring-2"
                value={form.age}
                onChange={(e) => update('age', e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">Gender</span>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ring-teal-600 focus:ring-2"
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
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ring-teal-600 focus:ring-2"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-gray-600">Address</span>
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ring-teal-600 focus:ring-2"
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
              />
            </label>
          </div>
        </section>

        {/* Clinical */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900">Clinical</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-gray-600">TB type</span>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ring-teal-600 focus:ring-2"
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
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ring-teal-600 focus:ring-2"
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
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ring-teal-600 focus:ring-2"
                value={form.treatment_start}
                onChange={(e) => update('treatment_start', e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">Status</span>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ring-teal-600 focus:ring-2"
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
                className="rounded"
              />
              <span className="text-gray-700">MDR-TB flag</span>
            </label>
          </div>
        </section>

        {/* Facility & map */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900">Facility & map (optional)</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="text-gray-600">Facility name</span>
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ring-teal-600 focus:ring-2"
                value={form.facility}
                onChange={(e) => update('facility', e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">Latitude</span>
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ring-teal-600 focus:ring-2"
                value={form.lat}
                onChange={(e) => update('lat', e.target.value)}
                placeholder="-1.286389"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">Longitude</span>
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ring-teal-600 focus:ring-2"
                value={form.lng}
                onChange={(e) => update('lng', e.target.value)}
                placeholder="36.817223"
              />
            </label>
          </div>
        </section>

        {/* Patient portal login */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900">Patient portal login</h3>
          <p className="mt-1 text-sm text-gray-500">
            Set the email and password the patient will use to log their daily doses.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="text-gray-600">Patient email *</span>
              <input
                type="email"
                required
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ring-teal-600 focus:ring-2"
                value={form.patientEmail}
                onChange={(e) => update('patientEmail', e.target.value)}
                placeholder="e.g. james.mwangi@gmail.com"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-gray-600">Password * (min 6 characters)</span>
              <div className="relative mt-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm outline-none ring-teal-600 focus:ring-2"
                  value={form.patientPassword}
                  onChange={(e) => update('patientPassword', e.target.value)}
                  placeholder="Create a password for the patient"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        )}

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
            {busy ? 'Registering…' : 'Register patient & create login'}
          </button>
        </div>
      </form>
    </div>
  )
}

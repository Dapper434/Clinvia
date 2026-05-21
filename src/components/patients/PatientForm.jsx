import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../utils/supabaseClient.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { Copy, Check, UserPlus } from 'lucide-react'

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

// Generate a clean login email from patient name + random code
function generatePatientEmail(name) {
  const clean = name.trim().toLowerCase().replace(/\s+/g, '.')
  const code = Math.random().toString(36).slice(2, 7)
  return `${clean}.${code}@tbtrack.com`
}

// Generate a simple readable password
function generatePassword() {
  const adjectives = ['Blue', 'Red', 'Green', 'Swift', 'Bright']
  const nouns = ['Lion', 'Eagle', 'River', 'Star', 'Tree']
  const num = Math.floor(Math.random() * 900) + 100
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  return `${adj}${noun}${num}`
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
  const { user, isHospital } = useAuth()
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [savedData, setSavedData] = useState(null) // { patientId, email, password }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  const canSubmit = useMemo(() => form.name.trim().length > 0 && form.treatment_start, [form])

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
      // Step 1: Save patient record
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

      const { data: patientData, error: patientErr } = await supabase
        .from('patients')
        .insert([payload])
        .select('id')
        .single()

      if (patientErr) {
        const hint =
          patientErr.message?.includes('row-level security') || patientErr.code === '42501'
            ? ' Permission denied — make sure you are signed in as hospital staff.'
            : ''
        throw new Error(`${patientErr.message}${hint}`)
      }

      const patientId = patientData.id

      // Step 2: Create patient login account
      const email = generatePatientEmail(form.name)
      const password = generatePassword()

      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: form.name.trim(),
            role: 'patient',
          },
        },
      })

      if (authErr) throw new Error(`Patient record saved but login creation failed: ${authErr.message}`)

      const newUserId = authData.user?.id

      // Step 3: Link the auth user to the patient record
      if (newUserId) {
        const { error: linkErr } = await supabase
          .from('patients')
          .update({ user_id: newUserId })
          .eq('id', patientId)

        if (linkErr) {
          // Non-fatal — patient record exists, linking just failed
          console.warn('Could not link user_id to patient:', linkErr.message)
        }
      }

      setSavedData({ patientId, email, password, name: form.name.trim() })
    } catch (err) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  // Success screen
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
                <p className="text-xs font-medium text-gray-500">Temporary Password</p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-gray-900">{savedData.password}</p>
              </div>
              <CopyButton text={savedData.password} />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div>
                <p className="text-xs font-medium text-gray-500">Patient Record ID</p>
                <p className="mt-0.5 font-mono text-xs text-gray-600">{savedData.patientId}</p>
              </div>
              <CopyButton text={savedData.patientId} />
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <strong>Important:</strong> Note down these credentials now. The patient will use them to sign in
            at <strong>/login</strong> and log their daily doses.
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Register patient</h2>
          <p className="mt-1 text-sm text-gray-500">
            Creates a patient record and generates login credentials for the patient portal.
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
import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { homePathForRole } from '../utils/roles.js'
import { isSupabaseConfigured } from '../utils/supabaseClient.js'

const emptyPatient = {
  name: '',
  age: '',
  gender: 'male',
  phone: '',
  facility: '',
  tb_type: 'pulmonary',
  regimen: 'HRZE',
  treatment_start: new Date().toISOString().slice(0, 10),
  linkPatientId: '',
}

export default function PatientLogin() {
  const { user, role, signIn, signUpPatient, loading } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [patient, setPatient] = useState(emptyPatient)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (user) navigate(homePathForRole(role), { replace: true })
  }, [user, role, navigate])

  if (!isSupabaseConfigured()) {
    return <Navigate to="/login" replace />
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    )
  }

  if (user) return <Navigate to={homePathForRole(role)} replace />

  function updatePatient(field, value) {
    setPatient((p) => ({ ...p, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setBusy(true)
    try {
      if (mode === 'signin') {
        const { error: err } = await signIn(email, password)
        if (err) throw err
        navigate('/my-treatment', { replace: true })
      } else {
        const linkId = patient.linkPatientId.trim()
        const { error: err } = await signUpPatient(
          email,
          password,
          fullName,
          {
            name: patient.name.trim() || fullName,
            age: patient.age === '' ? null : Number(patient.age),
            gender: patient.gender,
            phone: patient.phone || null,
            facility: patient.facility || null,
            tb_type: patient.tb_type,
            regimen: patient.regimen || null,
            treatment_start: patient.treatment_start,
          },
          linkId || null,
        )
        if (err) throw err
        setMessage(
          linkId
            ? 'Account created and linked to your hospital record. Sign in to log doses.'
            : 'Check your email to confirm, then sign in to log your doses.',
        )
      }
    } catch (err) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <Link to="/login" className="text-xs font-medium text-teal-700 hover:underline">
            ← Back
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-gray-900">
            {mode === 'signin' ? 'Patient sign in' : 'Patient sign up'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">Log your daily TB medication — your clinic sees the same calendar</p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <>
              <div className="rounded-lg border-2 border-teal-300 bg-teal-50 p-4">
                <label className="mb-1 block text-sm font-semibold text-teal-900" htmlFor="linkId">
                  Hospital patient ID (link-up)
                </label>
                <input
                  id="linkId"
                  className="w-full rounded-lg border border-teal-300 bg-white px-3 py-2 font-mono text-sm outline-none ring-teal-600 focus:ring-2"
                  value={patient.linkPatientId}
                  onChange={(e) => updatePatient('linkPatientId', e.target.value)}
                  placeholder="Paste ID from your clinic — on patient profile after registration"
                />
                <p className="mt-2 text-xs text-teal-800">
                  <strong>Registered at the hospital?</strong> Paste the ID your clinic gave you. Leave blank only if
                  you are enrolling yourself without a clinic record.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="fullName">
                  Full name
                </label>
                <input
                  id="fullName"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ring-teal-600 focus:ring-2"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              {!patient.linkPatientId.trim() && (
                <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-semibold text-gray-700">Treatment details</p>
                  <label className="block text-sm">
                    <span className="text-gray-600">Treatment start</span>
                    <input
                      type="date"
                      required
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      value={patient.treatment_start}
                      onChange={(e) => updatePatient('treatment_start', e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-gray-600">Clinic / facility</span>
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      value={patient.facility}
                      onChange={(e) => updatePatient('facility', e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-gray-600">Regimen</span>
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      value={patient.regimen}
                      onChange={(e) => updatePatient('regimen', e.target.value)}
                    />
                  </label>
                </div>
              )}
            </>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ring-teal-600 focus:ring-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ring-teal-600 focus:ring-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
          )}
          {message && (
            <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">{message}</p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
          >
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create patient account'}
          </button>
        </form>
        {mode === 'signin' ? (
          <p className="mt-4 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-center text-xs text-amber-900">
            Already registered at a clinic? Sign in, then use <strong>Link to hospital record</strong> on My Treatment.
          </p>
        ) : null}
        <p className="mt-4 text-center text-sm text-gray-600">
          {mode === 'signin' ? (
            <>
              New patient?{' '}
              <button
                type="button"
                className="font-medium text-teal-700 underline"
                onClick={() => {
                  setMode('signup')
                  setError('')
                  setMessage('')
                }}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Have an account?{' '}
              <button
                type="button"
                className="font-medium text-teal-700 underline"
                onClick={() => {
                  setMode('signin')
                  setError('')
                  setMessage('')
                }}
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}

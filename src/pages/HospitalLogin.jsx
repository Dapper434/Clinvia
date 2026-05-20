import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { homePathForRole } from '../utils/roles.js'
import { isSupabaseConfigured } from '../utils/supabaseClient.js'

export default function HospitalLogin() {
  const { user, role, signIn, signUpHospital, loading } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
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

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setBusy(true)
    try {
      if (mode === 'signin') {
        const { error: err } = await signIn(email, password)
        if (err) throw err
        navigate('/dashboard', { replace: true })
      } else {
        const { error: err } = await signUpHospital(email, password, fullName)
        if (err) throw err
        setMessage('Check your email to confirm your account, then sign in.')
      }
    } catch (err) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <Link to="/login" className="text-xs font-medium text-teal-700 hover:underline">
            ← Back
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-gray-900">
            {mode === 'signin' ? 'Hospital sign in' : 'Hospital sign up'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">For nurses, clinicians, and clinic administrators</p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode === 'signup' && (
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
                autoComplete="name"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="email">
              Work email
            </label>
            <input
              id="email"
              type="email"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ring-teal-600 focus:ring-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
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
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
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
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create hospital account'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          {mode === 'signin' ? (
            <>
              New clinic?{' '}
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
              Already registered?{' '}
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

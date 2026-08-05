import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { homePathForRole } from '../utils/roles.js'
import { PORTAL_THEMES } from '../utils/portalThemes.js'
import { Activity, AlertCircle, ArrowRight } from 'lucide-react'
import AuthHeader from '../components/auth/AuthHeader.jsx'
import AuthField from '../components/auth/AuthField.jsx'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

export default function SignUpHospital() {
  const theme = PORTAL_THEMES.hospital
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { user, role, signUpHospital, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate(homePathForRole(role), { replace: true })
    }
  }, [user, role, navigate])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <Activity className="h-8 w-8 animate-pulse text-teal-400" />
          <p className="text-sm font-medium text-slate-400">Loading TBTrack…</p>
        </div>
      </div>
    )
  }

  function validate() {
    const v = {}
    if (!fullName.trim()) v.fullName = 'Full name is required'
    if (!email.trim()) v.email = 'Email address is required'
    else if (!EMAIL_RE.test(email.trim())) v.email = 'Enter a valid email address'
    if (!password) v.password = 'Password is required'
    else if (password.length < MIN_PASSWORD_LENGTH)
      v.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
    if (!confirm) v.confirm = 'Please confirm your password'
    else if (password !== confirm) v.confirm = 'Passwords do not match'
    return v
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const v = validate()
    setErrors(v)
    if (Object.keys(v).length > 0) return
    setError('')
    setBusy(true)

    try {
      const res = await signUpHospital(email.trim(), password, fullName.trim())
      if (res?.error) {
        throw new Error(res.error.message || 'Registration failed')
      }
    } catch (err) {
      setError(err.message || 'Could not create your account')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-12">
      <div className="w-full max-w-md">
        <AuthHeader icon={theme.icon} accent={theme.accent} />

        <div className="rounded-2xl border border-slate-800 bg-slate-800/80 p-8 shadow-2xl backdrop-blur-xl">
          <h2 className="mb-1 text-xl font-semibold text-white">Create a staff account</h2>
          <p className="mb-6 text-xs text-slate-400">{theme.subtitle}</p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <AuthField
              id="fullName"
              label="Full Name"
              icon="user"
              value={fullName}
              onChange={setFullName}
              error={errors.fullName}
              placeholder="Dr. Jane Mwangi"
              autoComplete="name"
              required
              focusClasses={theme.accent.inputFocus}
            />

            <AuthField
              id="email"
              label="Email Address"
              type="email"
              icon="mail"
              value={email}
              onChange={setEmail}
              error={errors.email}
              placeholder={theme.emailPlaceholder}
              autoComplete="email"
              required
              focusClasses={theme.accent.inputFocus}
            />

            <AuthField
              id="password"
              label="Password"
              type="password"
              icon="lock"
              value={password}
              onChange={setPassword}
              error={errors.password}
              hint={`At least ${MIN_PASSWORD_LENGTH} characters`}
              placeholder="••••••••"
              autoComplete="new-password"
              required
              focusClasses={theme.accent.inputFocus}
              toggleable
            />

            <AuthField
              id="confirm"
              label="Confirm Password"
              type="password"
              icon="lock"
              value={confirm}
              onChange={setConfirm}
              error={errors.confirm}
              placeholder="••••••••"
              autoComplete="new-password"
              required
              focusClasses={theme.accent.inputFocus}
              toggleable
            />

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className={`group flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-slate-950 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 ${theme.accent.button}`}
            >
              {busy ? (
                <span>Creating account…</span>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-700/60 pt-4 text-center">
            <p className="text-xs text-slate-400">
              Already have an account?{' '}
              <Link to={theme.loginPath} className={`font-semibold ${theme.accent.link}`}>
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

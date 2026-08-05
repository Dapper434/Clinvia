import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { homePathForRole } from '../utils/roles.js'
import { PORTAL_THEMES } from '../utils/portalThemes.js'
import { Activity, AlertCircle, ArrowRight } from 'lucide-react'
import AuthHeader from '../components/auth/AuthHeader.jsx'
import AuthField from '../components/auth/AuthField.jsx'

export default function Login({ portal = 'hospital' }) {
  const theme = PORTAL_THEMES[portal] ?? PORTAL_THEMES.hospital
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { user, role, signIn, loading } = useAuth()
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

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)

    try {
      const res = await signIn(email.trim(), password)
      if (res?.error) {
        throw new Error(res.error.message || 'Invalid credentials')
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <AuthHeader icon={theme.icon} accent={theme.accent} />

        {/* Login Box */}
        <div className="rounded-2xl border border-slate-800 bg-slate-800/80 p-8 shadow-2xl backdrop-blur-xl">
          <h2 className="mb-1 text-xl font-semibold text-white">{theme.label}</h2>
          <p className="mb-6 text-xs text-slate-400">{theme.subtitle}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AuthField
              id="email"
              label="Email Address"
              type="email"
              icon="mail"
              value={email}
              onChange={setEmail}
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
              placeholder="••••••••"
              autoComplete="current-password"
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
                <span>Authenticating…</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 space-y-2 border-t border-slate-700/60 pt-4 text-center">
            <p className="text-xs text-slate-400">
              Don't have an account?{' '}
              <Link to={theme.signupPath} className={`font-semibold ${theme.accent.link}`}>
                Sign up
              </Link>
            </p>
            <p className="text-xs text-slate-500">{theme.footer}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

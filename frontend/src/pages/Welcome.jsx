import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { homePathForRole } from '../utils/roles.js'
import { Activity, ArrowRight, CheckCircle2 } from 'lucide-react'
import { PORTAL_THEMES } from '../utils/portalThemes.js'

const FEATURES = {
  hospital: [
    'Patient records & TB case tracking',
    'Daily DOTS adherence monitoring',
    'Geospatial case map & reports',
  ],
  patient: [
    'Daily medication check-in',
    'Treatment history calendar',
    'Adherence & recovery progress',
  ],
}

function PortalCard({ theme, features }) {
  const Icon = theme.icon
  return (
    <Link
      to={theme.loginPath}
      className={`group relative flex flex-col rounded-2xl border border-slate-700/60 bg-slate-800/80 p-7 shadow-2xl backdrop-blur-xl transition duration-200 hover:-translate-y-1 ${theme.accent.cardHover}`}
    >
      <div
        className={`inline-flex h-12 w-12 items-center justify-center rounded-xl border shadow-md mb-5 ${theme.accent.logoBox}`}
      >
        <Icon className={`h-6 w-6 ${theme.accent.icon}`} />
      </div>
      <p className={`text-xs font-bold uppercase tracking-widest ${theme.accent.eyebrow}`}>
        {theme.audience}
      </p>
      <h2 className="mt-1.5 text-xl font-bold text-white">{theme.label}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{theme.subtitle}</p>
      <ul className="mt-4 space-y-1.5 text-xs text-slate-400">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2">
            <CheckCircle2 className={`h-3.5 w-3.5 flex-shrink-0 ${theme.accent.icon}`} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex items-center justify-between border-t border-slate-700/60 pt-4">
        <span className="text-sm font-semibold text-white">Sign in</span>
        <ArrowRight
          className={`h-4 w-4 text-slate-500 transition-transform duration-200 group-hover:translate-x-1 ${theme.accent.icon}`}
        />
      </div>
    </Link>
  )
}

export default function Welcome() {
  const { user, role, loading } = useAuth()
  const navigate = useNavigate()
  const hospital = PORTAL_THEMES.hospital
  const patient = PORTAL_THEMES.patient

  // Signed-in users skip the chooser entirely and go straight to their portal.
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-12">
      <div className="w-full max-w-3xl">
        {/* Brand */}
        <div className="mb-10 text-center">
          <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-teal-500/20 bg-teal-500/10 shadow-lg shadow-teal-500/5">
            <Activity className="h-9 w-9 text-teal-400" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">TBTrack</h1>
          <p className="mt-2 text-sm text-slate-400">
            National Tuberculosis Surveillance & Adherence Management
          </p>
          <p className="mt-8 text-xs font-medium uppercase tracking-widest text-slate-500">
            How would you like to continue?
          </p>
        </div>

        {/* Portal cards */}
        <div className="grid gap-6 sm:grid-cols-2">
          <PortalCard theme={hospital} features={FEATURES.hospital} />
          <PortalCard theme={patient} features={FEATURES.patient} />
        </div>

        {/* Sign-up cross links */}
        <div className="mt-8 flex flex-col items-center justify-center gap-2 text-xs text-slate-400 sm:flex-row sm:gap-6">
          <p>
            New staff member?{' '}
            <Link to={hospital.signupPath} className={`font-semibold ${hospital.accent.link}`}>
              Create a staff account
            </Link>
          </p>
          <span className="hidden text-slate-600 sm:inline">·</span>
          <p>
            New patient?{' '}
            <Link to={patient.signupPath} className={`font-semibold ${patient.accent.link}`}>
              Register with your Patient Reference ID
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

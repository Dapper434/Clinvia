import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { whichHospitalApi } from '../api/auth.js'
import AuthLayout, { Loader } from '../components/auth/AuthLayout.jsx'
import { Right } from '../components/ui/icons.jsx'
import { useAuth } from '../context/useAuth.js'
import { homePathForRole } from '../utils/roles.js'

const COPY = {
  hospital: {
    title: 'Staff sign-in',
    lead: 'Use your hospital work email. It decides which hospital you sign in to.',
    placeholder: 'firstname.lastname@yourhospital',
    footer: <>Staff accounts are created by your hospital&apos;s administrator. <Link className="link" to="/login/patient">Patient sign-in</Link></>,
  },
  patient: {
    title: 'Patient sign-in',
    lead: 'Check in your doses, see your results and book appointments.',
    placeholder: 'you@example.com',
    footer: <>New here? <Link className="link" to="/signup/patient">Create a patient account</Link> · <Link className="link" to="/login/hospital">Staff sign-in</Link></>,
  },
}

export default function Login({ portal = 'hospital' }) {
  const copy = COPY[portal]
  const { user, role, signIn, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [where, setWhere] = useState(null)

  // Tell staff which hospital their address belongs to while they type.
  useEffect(() => {
    if (portal !== 'hospital' || !/@[^@\s]+\.[^@\s]+$/.test(email)) return undefined
    const t = setTimeout(() => whichHospitalApi(email.trim()).then(setWhere).catch(() => setWhere(null)), 250)
    return () => clearTimeout(t)
  }, [email, portal])

  if (loading) return <Loader />
  if (user) return <Navigate to={homePathForRole(role)} replace />

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await signIn(portal, email.trim(), password)
    } catch (err) {
      setError(err.message || "That email and password don't match an account.")
      setBusy(false)
    }
  }

  const showWhere = portal === 'hospital' && where && /@[^@\s]+\.[^@\s]+$/.test(email)
  return (
    <AuthLayout title={copy.title} lead={copy.lead} footer={copy.footer}>
      <form className="fields" style={{ gridTemplateColumns: '1fr' }} onSubmit={submit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={copy.placeholder} required />
          {showWhere ? (
            <small style={{ color: where.kind === 'unknown' ? 'var(--amber)' : 'var(--teal-2)' }}>
              {where.kind === 'unknown' ? 'This address isn’t at a hospital on Clinvia. Use your work email.' : `Signing in to ${where.name}`}
            </small>
          ) : null}
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error ? <p className="warn" role="alert">{error}</p> : null}
        <button className="btn primary" type="submit" disabled={busy} style={{ justifySelf: 'start' }}>
          {busy ? 'Signing in…' : <>Sign in<Right /></>}
        </button>
      </form>
    </AuthLayout>
  )
}

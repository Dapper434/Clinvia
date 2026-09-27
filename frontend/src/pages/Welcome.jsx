import { Link, Navigate } from 'react-router-dom'
import { Loader } from '../components/auth/AuthLayout.jsx'
import EntryLayout from '../components/auth/EntryLayout.jsx'
import { Right } from '../components/ui/icons.jsx'
import { useAuth } from '../context/useAuth.js'
import { homePathForRole } from '../utils/roles.js'

function Choice({ to, title, text, primary = false }) {
  return (
    <Link to={to} viewTransition className={`entry-choice${primary ? ' primary' : ''}`}>
      <span><b>{title}</b><small>{text}</small></span>
      <span aria-hidden="true"><Right /></span>
    </Link>
  )
}

export default function Welcome() {
  const { user, role, loading } = useAuth()
  if (loading) return <Loader />
  if (user) return <Navigate to={homePathForRole(role)} replace />
  return (
    <EntryLayout
      title={<>See a <mark className="entry-mark">missed</mark> TB dose the day it happens.</>}
      lead="Hospital management with the TB dose calendar built in."
    >
      <nav className="entry-choices" aria-label="Sign in">
        <Choice primary to="/login/hospital" title="Hospital staff" text="Sign in with your hospital work email" />
        <Choice to="/login/patient" title="Patients" text="Check in your doses, book appointments and see your results" />
        <Choice to="/signup/patient" title="New patient" text="Create a portal account with the link code from your clinic" />
      </nav>
      <p className="entry-register">Running a hospital that isn&apos;t on Clinvia yet? <Link className="link" to="/register-hospital" viewTransition>Register your hospital</Link></p>
    </EntryLayout>
  )
}

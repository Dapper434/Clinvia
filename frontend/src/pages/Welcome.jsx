import { Link, Navigate } from 'react-router-dom'
import AuthLayout, { Loader } from '../components/auth/AuthLayout.jsx'
import { Right } from '../components/ui/icons.jsx'
import { useAuth } from '../context/useAuth.js'
import { homePathForRole } from '../utils/roles.js'

function Choice({ to, title, text }) {
  return (
    <Link to={to} className="row" style={{ textDecoration: 'none', gridTemplateColumns: '1fr auto' }}>
      <div><p>{title}</p><small>{text}</small></div>
      <span><Right /></span>
    </Link>
  )
}

export default function Welcome() {
  const { user, role, loading } = useAuth()
  if (loading) return <Loader />
  if (user) return <Navigate to={homePathForRole(role)} replace />
  return (
    <AuthLayout
      title="Welcome to Clinvia"
      lead="Appointments, admissions and beds, the outpatient queue and the TB programme — for each hospital, with its own records and its own staff."
      footer={<>Running a hospital that isn&apos;t on Clinvia yet? <Link className="link" to="/register-hospital">Register your hospital</Link></>}
    >
      <div className="rows">
        <Choice to="/login/hospital" title="Hospital staff" text="Sign in with your hospital work email" />
        <Choice to="/login/patient" title="Patients" text="Check in your doses, book appointments and see your results" />
        <Choice to="/signup/patient" title="New patient" text="Create a portal account with the link code from your clinic" />
      </div>
    </AuthLayout>
  )
}

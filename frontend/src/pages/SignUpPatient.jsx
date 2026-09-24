import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import AuthLayout, { Loader } from '../components/auth/AuthLayout.jsx'
import { Check } from '../components/ui/icons.jsx'
import { useAuth } from '../context/useAuth.js'
import { homePathForRole } from '../utils/roles.js'

export default function SignUpPatient() {
  const { user, role, signUpPatient, loading } = useAuth()
  const [f, setF] = useState({ linkCode: '', fullName: '', email: '', phone: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (loading) return <Loader />
  if (user) return <Navigate to={homePathForRole(role)} replace />
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    if (!f.fullName.trim() || !/^\S+@\S+\.\S+$/.test(f.email)) {
      setError('Add your full name and a valid email.')
      return
    }
    if (f.password !== f.confirm) {
      setError("The passwords don't match.")
      return
    }
    setBusy(true)
    setError('')
    try {
      await signUpPatient({ fullName: f.fullName.trim(), email: f.email.trim(), phone: f.phone, password: f.password, linkCode: f.linkCode.trim() })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title="Create a patient account"
      lead="Your clinic gives you a link code so your account opens your own record. You can also add it later."
      footer={<>Already have an account? <Link className="link" to="/login/patient">Sign in</Link></>}
    >
      <form className="fields" style={{ gridTemplateColumns: '1fr' }} onSubmit={submit} noValidate>
        <div className="field"><label htmlFor="su-code">Link code from your clinic</label>
          <input id="su-code" value={f.linkCode} onChange={set('linkCode')} placeholder="e.g. K7M4-QX2P" autoComplete="off" style={{ textTransform: 'uppercase' }} />
          <small>Printed on your treatment card, or ask at reception</small></div>
        <div className="field"><label htmlFor="su-n">Full name <em>*</em></label><input id="su-n" value={f.fullName} onChange={set('fullName')} autoComplete="name" /></div>
        <div className="field"><label htmlFor="su-e">Email <em>*</em></label><input id="su-e" type="email" value={f.email} onChange={set('email')} autoComplete="email" /></div>
        <div className="field"><label htmlFor="su-p">Phone</label><input id="su-p" type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" /></div>
        <div className="field"><label htmlFor="su-pw">Password <em>*</em></label><input id="su-pw" type="password" value={f.password} onChange={set('password')} autoComplete="new-password" /><small>At least 8 characters, with a number or symbol</small></div>
        <div className="field"><label htmlFor="su-pc">Password again <em>*</em></label><input id="su-pc" type="password" value={f.confirm} onChange={set('confirm')} autoComplete="new-password" /></div>
        {error ? <p className="warn" role="alert">{error}</p> : null}
        <button className="btn primary" type="submit" disabled={busy} style={{ justifySelf: 'start' }}><Check />Create account</button>
      </form>
    </AuthLayout>
  )
}

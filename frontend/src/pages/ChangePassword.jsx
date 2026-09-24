import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { changePasswordApi } from '../api/auth.js'
import { Check, Mark } from '../components/ui/icons.jsx'
import { useAuth } from '../context/useAuth.js'
import { homePathForRole } from '../utils/roles.js'

/** Change password. Accounts created with a temporary password land here after first sign-in. */
export default function ChangePassword() {
  const { user, role, loading, refreshProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const [f, setF] = useState({ current: '', next: '', confirm: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) return null
  if (!user) return <Navigate to="/welcome" replace />
  const forced = user.mustChangePassword
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    if (f.next !== f.confirm) {
      setError("The new passwords don't match.")
      return
    }
    setBusy(true)
    setError('')
    try {
      await changePasswordApi(f.current, f.next)
      await refreshProfile()
      navigate(homePathForRole(role), { replace: true })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="cv" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <form className="fieldset" onSubmit={submit} style={{ width: 'min(420px, 100%)' }}>
        <div className="brand" style={{ padding: 0, marginBottom: 16 }}>
          <span className="brand-mark" aria-hidden="true"><Mark /></span>
          <span><b>Clinvia</b><small>{user.hospital?.name || (role === 'patient' ? 'Patient portal' : 'Clinvia network')}</small></span>
        </div>
        <h3>{forced ? 'Choose your own password' : 'Change password'}</h3>
        <p>{forced ? 'You signed in with a temporary password. Pick a new one to continue.' : 'Use at least 8 characters, mixing letters with numbers or symbols.'}</p>
        <div className="fields" style={{ gridTemplateColumns: '1fr' }}>
          <div className="field"><label htmlFor="pw-c">{forced ? 'Temporary password' : 'Current password'}</label><input id="pw-c" type="password" autoComplete="current-password" value={f.current} onChange={set('current')} /></div>
          <div className="field"><label htmlFor="pw-n">New password</label><input id="pw-n" type="password" autoComplete="new-password" value={f.next} onChange={set('next')} /></div>
          <div className="field"><label htmlFor="pw-r">New password again</label><input id="pw-r" type="password" autoComplete="new-password" value={f.confirm} onChange={set('confirm')} /></div>
        </div>
        {error ? <p className="warn" role="alert" style={{ marginTop: 12 }}>{error}</p> : null}
        <div className="form-foot" style={{ marginTop: 16 }}>
          {forced ? (
            <button type="button" className="btn" onClick={signOut}>Sign out</button>
          ) : (
            <Link className="btn" to={role === 'patient' ? '/my-profile' : '/profile'}>Cancel</Link>
          )}
          <button className="btn primary" type="submit" disabled={busy}><Check />Save password</button>
        </div>
      </form>
    </div>
  )
}

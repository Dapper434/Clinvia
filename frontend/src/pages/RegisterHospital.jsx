import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { hospitalLevelsApi } from '../api/auth.js'
import AuthLayout, { Loader } from '../components/auth/AuthLayout.jsx'
import { Check } from '../components/ui/icons.jsx'
import { useAuth } from '../context/useAuth.js'
import { homePathForRole } from '../utils/roles.js'

const STOP = new Set(['hospital', 'the', 'county', 'referral', 'level', 'national', 'mission', 'medical', 'centre', 'center', 'clinic', 'of', 'and', 'sub'])
const suggestSlug = (name) =>
  (name.toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => !STOP.has(w) && !/^\d+$/.test(w)).slice(0, 2).join('-')

export default function RegisterHospital() {
  const { user, role, registerHospital, loading } = useAuth()
  const [meta, setMeta] = useState({ levels: [], networkDomain: 'clinvia.health' })
  const [f, setF] = useState({
    name: '', level: '', county: '', subCounty: '', phone: '', lat: '', lng: '',
    domain: '', domainTouched: false, adminName: '', adminLocal: '', adminPhone: '', password: '', confirm: '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    hospitalLevelsApi().then(setMeta).catch(() => {})
  }, [])

  if (loading) return <Loader />
  if (user) return <Navigate to={homePathForRole(role)} replace />

  const domain = f.domainTouched ? f.domain : suggestSlug(f.name) ? `${suggestSlug(f.name)}.${meta.networkDomain}` : ''
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const locate = () =>
    navigator.geolocation?.getCurrentPosition(
      (pos) => setF((x) => ({ ...x, lat: pos.coords.latitude.toFixed(5), lng: pos.coords.longitude.toFixed(5) })),
      () => setError("Couldn't read this device's location. You can add it later in Hospital settings."),
    )

  async function submit(e) {
    e.preventDefault()
    if (f.password !== f.confirm) {
      setError("The passwords don't match.")
      return
    }
    setBusy(true)
    setError('')
    try {
      await registerHospital({
        hospital: { name: f.name.trim(), level: f.level, county: f.county, subCounty: f.subCounty, phone: f.phone, lat: f.lat, lng: f.lng, domain },
        admin: { fullName: f.adminName.trim(), email: `${f.adminLocal.trim().toLowerCase()}@${domain}`, phone: f.adminPhone, password: f.password },
      })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      wide
      title="Register your hospital"
      lead="Your hospital gets its own records and its own staff sign-in. You'll be its administrator and can add staff straight away."
      footer={<>Already on Clinvia? <Link className="link" to="/login/hospital">Staff sign-in</Link></>}
    >
      <form className="form" onSubmit={submit} noValidate>
        <div className="fields">
          <div className="field wide"><label htmlFor="rh-n">Hospital name <em>*</em></label><input id="rh-n" value={f.name} onChange={set('name')} placeholder="e.g. Mercy Mission Hospital" /></div>
          <div className="field"><label htmlFor="rh-l">Level</label>
            <select id="rh-l" value={f.level} onChange={set('level')}><option value="">Choose…</option>{meta.levels.map((l) => <option key={l}>{l}</option>)}</select></div>
          <div className="field"><label htmlFor="rh-ph">Hospital phone</label><input id="rh-ph" type="tel" value={f.phone} onChange={set('phone')} /></div>
          <div className="field"><label htmlFor="rh-c">County</label><input id="rh-c" value={f.county} onChange={set('county')} /></div>
          <div className="field"><label htmlFor="rh-s">Sub-county or town</label><input id="rh-s" value={f.subCounty} onChange={set('subCounty')} /></div>
          <div className="field"><label htmlFor="rh-la">Latitude</label><input id="rh-la" inputMode="decimal" value={f.lat} onChange={set('lat')} placeholder="Optional" /></div>
          <div className="field"><label htmlFor="rh-lo">Longitude</label><input id="rh-lo" inputMode="decimal" value={f.lng} onChange={set('lng')} placeholder="Optional" />
            <small><button type="button" className="link" onClick={locate}>Use this device&apos;s location</button> — places the hospital on the case map</small></div>
          <div className="field wide"><label htmlFor="rh-d">Staff email domain <em>*</em></label>
            <input id="rh-d" value={domain} onChange={(e) => setF({ ...f, domain: e.target.value.trim().toLowerCase(), domainTouched: true })} placeholder={`yourhospital.${meta.networkDomain}`} />
            <small>Every staff account ends with @{domain || `yourhospital.${meta.networkDomain}`}, which is how Clinvia knows which hospital someone signs in to.</small></div>
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Your administrator account</h3>
          <div className="fields">
            <div className="field"><label htmlFor="rh-an">Full name <em>*</em></label><input id="rh-an" value={f.adminName} onChange={set('adminName')} autoComplete="name" /></div>
            <div className="field"><label htmlFor="rh-ae">Work email <em>*</em></label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input id="rh-ae" value={f.adminLocal} onChange={set('adminLocal')} placeholder="firstname.lastname" style={{ flex: 1, minWidth: 0 }} />
                <span className="muted" style={{ fontSize: 13, overflowWrap: 'anywhere' }}>@{domain || '…'}</span>
              </div></div>
            <div className="field"><label htmlFor="rh-ap">Phone</label><input id="rh-ap" type="tel" value={f.adminPhone} onChange={set('adminPhone')} /></div>
            <div />
            <div className="field"><label htmlFor="rh-pw">Password <em>*</em></label><input id="rh-pw" type="password" value={f.password} onChange={set('password')} autoComplete="new-password" /><small>At least 8 characters, with a number or symbol</small></div>
            <div className="field"><label htmlFor="rh-pc">Password again <em>*</em></label><input id="rh-pc" type="password" value={f.confirm} onChange={set('confirm')} autoComplete="new-password" /></div>
          </div>
        </div>
        {error ? <p className="warn" role="alert">{error}</p> : null}
        <div className="form-foot">
          <Link className="btn" to="/welcome">Cancel</Link>
          <button className="btn primary" type="submit" disabled={busy}><Check />Register hospital</button>
        </div>
      </form>
    </AuthLayout>
  )
}

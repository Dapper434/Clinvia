import { useEffect, useState } from 'react'
import { hospitalLevelsApi } from '../../api/auth.js'
import { hospitalsApi, updateHospitalApi } from '../../api/hospital.js'
import { admissionsApi } from '../../api/wards.js'
import { useShell } from '../../components/shell/shellContext.js'
import { ErrorNote, Loading } from '../../components/ui/bits.jsx'
import { Check, Plus } from '../../components/ui/icons.jsx'
import Page from '../../components/ui/Page.jsx'
import { useApi } from '../../components/ui/useApi.js'
import { useAuth } from '../../context/useAuth.js'

function DetailsForm({ hospital, levels, onSaved }) {
  const [f, setF] = useState({
    name: hospital.name, level: hospital.level || '', county: hospital.county || '', subCounty: hospital.sub_county || '',
    phone: hospital.phone || '', lat: hospital.lat ?? '', lng: hospital.lng ?? '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const locate = () =>
    navigator.geolocation?.getCurrentPosition(
      (pos) => setF((x) => ({ ...x, lat: pos.coords.latitude.toFixed(5), lng: pos.coords.longitude.toFixed(5) })),
      () => setError("Couldn't read this device's location. Type the coordinates instead."),
    )

  async function save(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await updateHospitalApi(hospital.slug, f)
      onSaved(`Saved ${f.name}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="fieldset" onSubmit={save}>
      <h3>Hospital details</h3>
      <p>Shown to staff across Clinvia and used to place the hospital on the case map.</p>
      <div className="fields">
        <div className="field"><label htmlFor="h-n">Hospital name</label><input id="h-n" value={f.name} onChange={set('name')} /></div>
        <div className="field"><label htmlFor="h-l">Level</label>
          <select id="h-l" value={f.level} onChange={set('level')}><option value="">Not set</option>{levels.map((l) => <option key={l}>{l}</option>)}</select></div>
        <div className="field"><label htmlFor="h-c">County</label><input id="h-c" value={f.county} onChange={set('county')} /></div>
        <div className="field"><label htmlFor="h-s">Sub-county or town</label><input id="h-s" value={f.subCounty} onChange={set('subCounty')} /></div>
        <div className="field"><label htmlFor="h-p">Phone</label><input id="h-p" type="tel" value={f.phone} onChange={set('phone')} /></div>
        <div className="field"><label>Staff sign-in</label><input value={`@${hospital.emailDomain}`} disabled /><small>Every staff email ends with this domain</small></div>
        <div className="field"><label htmlFor="h-la">Latitude</label><input id="h-la" inputMode="decimal" value={f.lat} onChange={set('lat')} placeholder="-1.2921" /></div>
        <div className="field"><label htmlFor="h-lo">Longitude</label><input id="h-lo" inputMode="decimal" value={f.lng} onChange={set('lng')} placeholder="36.8219" />
          <small><button type="button" className="link" onClick={locate}>Use this device&apos;s location</button></small></div>
      </div>
      {error ? <p className="warn" role="alert" style={{ marginTop: 12 }}>{error}</p> : null}
      <div className="form-foot" style={{ marginTop: 14 }}>
        <button className="btn primary" type="submit" disabled={busy}><Check />Save details</button>
      </div>
    </form>
  )
}

export default function HospitalSettings() {
  const { user, can } = useAuth()
  const { openDrawer, version, toast, bump } = useShell()
  const [levels, setLevels] = useState([])
  const { data: hospitals, error } = useApi(hospitalsApi, [version])
  const { data: adm } = useApi(admissionsApi, [version])
  useEffect(() => {
    hospitalLevelsApi().then((r) => setLevels(r.levels)).catch(() => {})
  }, [])

  const hospital = hospitals?.find((h) => h.id === user?.hospital?.id)
  if (!hospital) return <Page title="Hospital settings">{error ? <ErrorNote error={error} /> : <Loading />}</Page>

  return (
    <Page title="Hospital settings" sub={hospital.name}>
      <DetailsForm key={hospital.id + version} hospital={hospital} levels={levels} onSaved={(m) => { toast(m); bump() }} />
      <section className="panel">
        <div className="panel-h">
          <h3>Wards and beds</h3>
          <span>{can('wards.manage') ? <button type="button" className="btn sm primary" onClick={() => openDrawer('ward')}><Plus />Add ward</button> : null}</span>
        </div>
        {adm?.wards.length ? (
          <div className="tbl-wrap"><table>
            <thead><tr><th>Ward</th><th>Type</th><th>Bed labels</th><th className="num">Beds</th><th className="num">Occupied</th><th /></tr></thead>
            <tbody>
              {adm.wards.map((w) => (
                <tr key={w.id}>
                  <td>{w.name}</td>
                  <td>{w.type[0].toUpperCase() + w.type.slice(1)}</td>
                  <td><span className="code">{w.prefix}-01 to {w.prefix}-{String(w.capacity).padStart(2, '0')}</span></td>
                  <td className="num">{w.capacity}</td>
                  <td className="num">{w.beds.filter((b) => b.status === 'occupied').length}</td>
                  <td className="num">{can('wards.manage') ? <button type="button" className="btn sm" onClick={() => openDrawer('ward', { ward: w })}>Edit</button> : null}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        ) : (
          <div className="empty">
            <span>No wards yet. Add each ward with its number of beds; they then appear on the bed map ready for admissions.</span>
            {can('wards.manage') ? <button type="button" className="btn primary" onClick={() => openDrawer('ward')}><Plus />Add ward</button> : null}
          </div>
        )}
      </section>
    </Page>
  )
}

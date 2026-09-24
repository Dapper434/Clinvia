import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import { tbMapApi } from '../../api/tb.js'
import { useShell } from '../../components/shell/shellContext.js'
import { ErrorNote } from '../../components/ui/bits.jsx'
import Page from '../../components/ui/Page.jsx'
import { useApi } from '../../components/ui/useApi.js'
import { useAuth } from '../../context/useAuth.js'
import { plural } from '../../utils/format.js'

const SETS = [['active', 'On treatment'], ['all', 'All TB episodes'], ['mdr', 'Drug-resistant only']]
const COLOUR = { good: '#0E7C70', watch: '#C98A1E', poor: '#B83A26', closed: '#7F918C' }
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export default function CaseMap() {
  const { scope } = useAuth()
  const { version } = useShell()
  const navigate = useNavigate()
  const [set, setSet] = useState('active')
  const [showFacilities, setShowFacilities] = useState(true)
  const { data, error, reload } = useApi(() => tbMapApi(set), [set, scope, version])
  const box = useRef(null)
  const map = useRef(null)

  useEffect(() => {
    if (!data || !box.current) return undefined
    if (!map.current) {
      map.current = L.map(box.current, { scrollWheelZoom: false }).setView([-0.9, 36.9], 7)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap contributors' }).addTo(map.current)
    }
    const layer = L.layerGroup().addTo(map.current)
    const pts = []
    data.points.forEach((p) => {
      const status = p.status === 'active' ? `Adherence ${p.adherence ?? '—'}%${p.mdr ? ', MDR' : ''}` : `Treatment ${p.status.replace(/_/g, ' ')}`
      const who = p.code ? `<b>${esc(p.name)}</b><br>${esc(p.code)}, ${esc(p.hospital)}` : `<b>${esc(p.hospital)}</b>`
      const link = p.code ? `<br><a href="/patients/${esc(p.code)}" data-code="${esc(p.code)}">Open record</a>` : ''
      L.circleMarker([p.lat, p.lng], { radius: 8, color: '#fff', weight: 2, fillColor: COLOUR[p.band] || COLOUR.closed, fillOpacity: 0.95 })
        .bindPopup(`${who}<br>${status}${link}`)
        .addTo(layer)
      pts.push([p.lat, p.lng])
    })
    if (showFacilities) {
      data.facilities.forEach((f) => {
        if (f.lat == null) return
        L.circleMarker([f.lat, f.lng], { radius: 6, color: '#fff', weight: 2, fillColor: '#2F6FB5', fillOpacity: 1 })
          .bindPopup(`<b>${esc(f.name)}</b><br>${esc(f.level || '')}`)
          .addTo(layer)
        pts.push([f.lat, f.lng])
      })
    }
    if (pts.length) map.current.fitBounds(pts, { padding: [30, 30], maxZoom: 13 })
    return () => layer.remove()
  }, [data, showFacilities])

  useEffect(() => () => {
    map.current?.remove()
    map.current = null
  }, [])

  // Popup links move within the app instead of reloading the page.
  const onClick = (e) => {
    const a = e.target.closest('a[data-code]')
    if (a) {
      e.preventDefault()
      navigate(`/patients/${a.dataset.code}`)
    }
  }

  const counts = data?.counts || {}
  const total = data?.points.length ?? 0
  return (
    <Page title="Case map" sub="TB patients by location">
      <div className="toolbar">
        <div className="seg">
          {SETS.map(([k, l]) => (
            <button type="button" key={k} className={set === k ? 'on' : ''} onClick={() => setSet(k)}>{l}<em>{counts[k] ?? ''}</em></button>
          ))}
        </div>
        <label className="check" style={{ alignItems: 'center' }}>
          <input type="checkbox" checked={showFacilities} onChange={(e) => setShowFacilities(e.target.checked)} /> Show health facilities
        </label>
      </div>
      {error ? <ErrorNote error={error} onRetry={reload} /> : null}
      <div className="grid g-2-1">
        <section className="panel" style={{ padding: 10 }}>
          <div id="map" ref={box} onClick={onClick} />
          <div className="legend" style={{ padding: '4px 8px' }}>
            <span><i style={{ background: '#0E7C70', borderRadius: '50%' }} />80% or more</span>
            <span><i style={{ background: '#C98A1E', borderRadius: '50%' }} />60–79%</span>
            <span><i style={{ background: '#B83A26', borderRadius: '50%' }} />Under 60% or MDR</span>
            <span><i style={{ background: '#7F918C', borderRadius: '50%' }} />Treatment closed</span>
            <span><i style={{ background: 'var(--blue)' }} />Health facility</span>
          </div>
        </section>
        <section className="panel">
          <div className="panel-h"><h3>By facility</h3><span>{plural(total, 'patient')}</span></div>
          <div className="rows">
            {(data?.facilities || []).map((f) => (
              <div className="row" key={f.name}>
                <i className="dot" style={{ background: 'var(--blue)' }} />
                <div><p>{f.name}</p><small>{[f.county, f.level].filter(Boolean).join(', ')}</small></div>
                <span><b style={{ color: 'var(--ink)' }}>{f.count}</b></span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Page>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, LayerGroup, useMap } from 'react-leaflet'
import { supabase } from '../utils/supabaseClient.js'
import { calcAdherence, isLostToFollowUp } from '../utils/adherence.js'
import PatientMarker from '../components/map/PatientMarker.jsx'

const NAIROBI = [-1.286389, 36.817223]

function FitKenya() {
  const map = useMap()
  useEffect(() => {
    map.fitBounds(
      [
        [-5.2, 33.5],
        [5.5, 42.5],
      ],
      { padding: [24, 24] },
    )
  }, [map])
  return null
}

function groupLogs(logs) {
  const m = new Map()
  for (const row of logs ?? []) {
    if (!m.has(row.patient_id)) m.set(row.patient_id, [])
    m.get(row.patient_id).push(row)
  }
  return m
}

function markerColor(patient, adherence, ltfu) {
  if (patient.mdr_flag) return '#dc2626'
  if (adherence < 60 || ltfu) return '#dc2626'
  if (adherence < 80) return '#f59e0b'
  return '#16a34a'
}

export default function CaseMap() {
  const mounted = true
  const [patients, setPatients] = useState([])
  const [facilities, setFacilities] = useState([])
  const [doseLogs, setDoseLogs] = useState([])
  const [filter, setFilter] = useState('active')
  const [showFacilities, setShowFacilities] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setError('')
      const [{ data: p, error: e1 }, { data: f, error: e2 }, { data: l, error: e3 }] = await Promise.all([
        supabase.from('patients').select('*'),
        supabase.from('facilities').select('*'),
        supabase.from('dose_logs').select('*'),
      ])
      if (cancelled) return
      if (e1 || e2 || e3) {
        setError(e1?.message || e2?.message || e3?.message || 'Failed to load map data')
        return
      }
      setPatients(p ?? [])
      setFacilities(f ?? [])
      setDoseLogs(l ?? [])
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const logsByPatient = useMemo(() => groupLogs(doseLogs), [doseLogs])

  const facilityByName = useMemo(() => {
    const m = new Map()
    for (const row of facilities) {
      m.set(row.name?.toLowerCase?.() ?? '', row)
    }
    return m
  }, [facilities])

  const markers = useMemo(() => {
    return patients
      .map((patient) => {
        let lat = patient.lat
        let lng = patient.lng
        if ((lat == null || lng == null) && patient.facility) {
          const fac = facilityByName.get(patient.facility.toLowerCase())
          if (fac?.lat != null && fac?.lng != null) {
            lat = fac.lat
            lng = fac.lng
          }
        }
        if (lat == null || lng == null) return null
        const logs = logsByPatient.get(patient.id) ?? []
        const adherence = calcAdherence(logs, patient.treatment_start)
        const ltfu = isLostToFollowUp(logs)
        return { patient, position: [lat, lng], adherence, ltfu }
      })
      .filter(Boolean)
  }, [patients, facilityByName, logsByPatient])

  const filtered = useMemo(() => {
    return markers.filter((m) => {
      if (filter === 'active') return m.patient.status === 'active'
      if (filter === 'mdr') return Boolean(m.patient.mdr_flag)
      if (filter === 'ltfu') return m.ltfu
      return true
    })
  }, [markers, filter])

  if (!mounted) {
    return <div className="h-[480px] rounded-xl border border-gray-200 bg-white" />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Case map</h2>
          <p className="mt-1 text-sm text-gray-500">
            Kenya overview · markers use patient GPS or facility coordinates as fallback
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-gray-700">
            Filter{' '}
            <select
              className="ml-2 rounded-lg border border-gray-300 px-2 py-1 text-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="active">Active cases</option>
              <option value="mdr">MDR flagged</option>
              <option value="ltfu">Lost to follow-up (14d+)</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={showFacilities} onChange={(e) => setShowFacilities(e.target.checked)} />
            Facilities
          </label>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-gray-200">
        <MapContainer center={NAIROBI} zoom={6} style={{ height: 480, width: '100%' }} scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitKenya />
          {showFacilities ? (
            <LayerGroup>
              {facilities
                .filter((f) => f.lat != null && f.lng != null)
                .map((f) => (
                  <PatientMarker
                    key={`fac-${f.id}`}
                    patient={{
                      id: f.id,
                      name: f.name,
                      tb_type: 'facility',
                    }}
                    position={[f.lat, f.lng]}
                    color="#2563eb"
                    adherence={0}
                  />
                ))}
            </LayerGroup>
          ) : null}
          <LayerGroup>
            {filtered.map((m) => (
              <PatientMarker
                key={m.patient.id}
                patient={m.patient}
                position={m.position}
                color={markerColor(m.patient, m.adherence, m.ltfu)}
                adherence={m.adherence}
              />
            ))}
          </LayerGroup>
        </MapContainer>
      </div>

      <p className="text-xs text-gray-500">
        Legend: green ≥80% adherence · amber 60–79% · red &lt;60%, lost to follow-up, or MDR.
      </p>
    </div>
  )
}

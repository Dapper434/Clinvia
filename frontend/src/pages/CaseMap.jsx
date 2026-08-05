import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, LayerGroup, useMap } from 'react-leaflet'
import { getPatientsApi } from '../api/patients.js'
import { getFacilitiesApi } from '../api/facilities.js'
import { getDoseLogsApi } from '../api/doseLogs.js'
import { calcAdherence, isLostToFollowUp } from '../utils/adherence.js'
import PatientMarker from '../components/map/PatientMarker.jsx'
import { Filter } from 'lucide-react'

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
  const [patients, setPatients] = useState([])
  const [facilities, setFacilities] = useState([])
  const [doseLogs, setDoseLogs] = useState([])
  const [filter, setFilter] = useState('active')
  const [showFacilities, setShowFacilities] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setError('')
      setLoading(true)
      try {
        const [p, f, l] = await Promise.all([
          getPatientsApi(),
          getFacilitiesApi(),
          getDoseLogsApi(),
        ])
        if (cancelled) return
        setPatients(p ?? [])
        setFacilities(f ?? [])
        setDoseLogs(l ?? [])
      } catch (err) {
        if (cancelled) return
        setError(err.message || 'Failed to load geospatial data')
      } finally {
        if (!cancelled) setLoading(false)
      }
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Geospatial Surveillance</h1>
          <p className="mt-1 text-sm text-gray-500">
            Real-time GIS mapping of tuberculosis hot-spots, MDR clustering, and clinic proximity across Kenya.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 shadow-sm">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              className="text-sm font-medium text-gray-700 outline-none bg-transparent"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="active">Active Cases</option>
              <option value="mdr">MDR Flagged Only</option>
              <option value="ltfu">Lost to Follow-up (14d+)</option>
              <option value="all">All Patients</option>
            </select>
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm cursor-pointer hover:bg-gray-50 transition">
            <input
              type="checkbox"
              checked={showFacilities}
              onChange={(e) => setShowFacilities(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="font-medium text-xs">Show Health Facilities</span>
          </label>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md">
        {loading ? (
          <div className="flex h-[520px] items-center justify-center">
            <p className="text-sm text-gray-500">Loading geospatial layers…</p>
          </div>
        ) : (
          <MapContainer center={NAIROBI} zoom={6} style={{ height: 520, width: '100%' }} scrollWheelZoom>
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
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 text-xs text-gray-600 shadow-sm">
        <span className="font-semibold text-gray-900">Map Legend:</span>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-green-600 ring-2 ring-green-100" />
          <span>Optimal Adherence (≥80%)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-amber-500 ring-2 ring-amber-100" />
          <span>Moderate Risk (60–79%)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-red-600 ring-2 ring-red-100" />
          <span>High Risk (&lt;60%, Lost, or MDR-TB)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-blue-600 ring-2 ring-blue-100" />
          <span>Health Facility</span>
        </div>
      </div>
    </div>
  )
}

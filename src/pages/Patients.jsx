import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../utils/supabaseClient.js'
import PatientTable from '../components/patients/PatientTable.jsx'

function groupLogs(logs) {
  const map = new Map()
  for (const row of logs ?? []) {
    if (!map.has(row.patient_id)) map.set(row.patient_id, [])
    map.get(row.patient_id).push(row)
  }
  return map
}

export default function Patients() {
  const [patients, setPatients] = useState([])
  const [doseLogs, setDoseLogs] = useState([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [tbType, setTbType] = useState('all')
  const [mdrOnly, setMdrOnly] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      const { data: p, error: e1 } = await supabase.from('patients').select('*').order('created_at', {
        ascending: false,
      })
      const ids = (p ?? []).map((x) => x.id)
      let logs = []
      if (ids.length) {
        const { data: l, error: e2 } = await supabase.from('dose_logs').select('*').in('patient_id', ids)
        if (e2) {
          if (!cancelled) setError(e2.message)
        } else {
          logs = l ?? []
        }
      }
      if (cancelled) return
      if (e1) {
        setError(e1.message)
      } else {
        setPatients(p ?? [])
        setDoseLogs(logs)
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const doseLogsByPatient = useMemo(() => groupLogs(doseLogs), [doseLogs])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return patients.filter((p) => {
      if (status !== 'all' && p.status !== status) return false
      if (tbType !== 'all' && p.tb_type !== tbType) return false
      if (mdrOnly && !p.mdr_flag) return false
      if (!needle) return true
      const hay = `${p.name} ${p.id} ${p.facility ?? ''}`.toLowerCase()
      return hay.includes(needle)
    })
  }, [patients, q, status, tbType, mdrOnly])

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Patients</h2>
          <p className="mt-1 text-sm text-gray-500">Search, filter, and open profiles.</p>
        </div>
        <Link
          to="/patients/new"
          className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          Register new patient
        </Link>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <label className="block min-w-[200px] flex-1 text-sm">
          <span className="text-gray-600">Search</span>
          <input
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Name, ID, facility"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">Status</span>
          <select
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="lost">Lost</option>
            <option value="died">Died</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">TB type</span>
          <select
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={tbType}
            onChange={(e) => setTbType(e.target.value)}
          >
            <option value="all">All</option>
            <option value="pulmonary">Pulmonary</option>
            <option value="extra-pulmonary">Extra-pulmonary</option>
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm text-gray-700">
          <input type="checkbox" checked={mdrOnly} onChange={(e) => setMdrOnly(e.target.checked)} />
          MDR only
        </label>
      </div>

      {loading ? <p className="text-sm text-gray-500">Loading patients…</p> : null}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      {!loading && !error ? (
        <PatientTable patients={filtered} doseLogsByPatient={doseLogsByPatient} />
      ) : null}
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPatientsApi } from '../api/patients.js'
import { getDoseLogsApi } from '../api/doseLogs.js'
import PatientTable from '../components/patients/PatientTable.jsx'
import { UserPlus, Search, Filter } from 'lucide-react'

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
      try {
        const [pList, lList] = await Promise.all([
          getPatientsApi(),
          getDoseLogsApi(),
        ])
        if (cancelled) return
        setPatients(pList ?? [])
        setDoseLogs(lList ?? [])
      } catch (err) {
        if (cancelled) return
        setError(err.message || 'Failed to load patients')
      } finally {
        if (!cancelled) setLoading(false)
      }
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
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Patient Registry</h1>
          <p className="mt-1 text-sm text-gray-500">
            Search, filter, monitor adherence, and manage clinical records.
          </p>
        </div>
        <Link
          to="/patients/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
        >
          <UserPlus className="h-4 w-4" />
          <span>Register New Patient</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-1 focus:ring-teal-500"
            placeholder="Search by name, ID, or facility…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-1 focus:ring-teal-500"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="lost">Lost to Follow-up</option>
            <option value="died">Died</option>
          </select>
        </div>

        <div>
          <select
            className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-1 focus:ring-teal-500"
            value={tbType}
            onChange={(e) => setTbType(e.target.value)}
          >
            <option value="all">All TB Types</option>
            <option value="pulmonary">Pulmonary</option>
            <option value="extra-pulmonary">Extra-pulmonary</option>
          </select>
        </div>

        <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-100/60 transition">
          <input
            type="checkbox"
            checked={mdrOnly}
            onChange={(e) => setMdrOnly(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
          />
          <span className="font-medium text-xs text-red-700 uppercase tracking-wide">MDR Only</span>
        </label>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <p className="text-sm text-gray-500">Loading patients…</p>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">Error loading patients</p>
          <p className="mt-1">{error}</p>
        </div>
      ) : null}

      {!loading && !error ? (
        <PatientTable patients={filtered} doseLogsByPatient={doseLogsByPatient} />
      ) : null}
    </div>
  )
}

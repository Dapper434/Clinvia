import { useEffect, useMemo, useState } from 'react'
import { format, parseISO, startOfMonth } from 'date-fns'
import { getPatientsApi } from '../api/patients.js'
import { buildCsv, downloadCsv } from '../utils/exportCsv.js'
import { Download, FileText } from 'lucide-react'

function monthKey(d) {
  return format(startOfMonth(d), 'yyyy-MM')
}

export default function Reports() {
  const [patients, setPatients] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [cohortMonth, setCohortMonth] = useState(() => format(new Date(), 'yyyy-MM'))

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const data = await getPatientsApi()
        if (cancelled) return
        setPatients(data ?? [])
      } catch (err) {
        if (cancelled) return
        setError(err.message || 'Failed to load report data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const monthly = useMemo(() => {
    const map = new Map()
    for (const p of patients) {
      const k = monthKey(parseISO(p.created_at || p.treatment_start))
      if (!map.has(k)) map.set(k, { newCases: 0, completed: 0, lost: 0, died: 0 })
      const row = map.get(k)
      row.newCases += 1
      if (p.status === 'completed') row.completed += 1
      if (p.status === 'lost') row.lost += 1
      if (p.status === 'died') row.died += 1
    }
    return [...map.entries()].sort(([a], [b]) => (a < b ? 1 : -1))
  }, [patients])

  const cohort = useMemo(() => {
    return patients.filter((p) => {
      try {
        return format(parseISO(p.treatment_start), 'yyyy-MM') === cohortMonth
      } catch {
        return false
      }
    })
  }, [patients, cohortMonth])

  function exportPatients() {
    const cols = [
      'name',
      'age',
      'gender',
      'facility',
      'tb_type',
      'regimen',
      'treatment_start',
      'status',
      'mdr_flag',
      'created_at',
    ]
    const rows = patients.map((p) => ({
      name: p.name,
      age: p.age,
      gender: p.gender,
      facility: p.facility,
      tb_type: p.tb_type,
      regimen: p.regimen,
      treatment_start: p.treatment_start,
      status: p.status,
      mdr_flag: p.mdr_flag,
      created_at: p.created_at,
    }))
    downloadCsv(`clinvia-registry-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`, buildCsv(rows, cols))
  }

  return (
    <div className="space-y-8 print:block">
      <div className="no-print flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Program Reports & Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Epidemiological cohorts, outcome distributions, and automated Ministry export.
          </p>
        </div>
        <button
          type="button"
          onClick={exportPatients}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
        >
          <Download className="h-4 w-4" />
          <span>Export Registry CSV</span>
        </button>
      </div>

      {loading ? <p className="text-sm text-gray-500">Generating analytics…</p> : null}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      ) : null}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="h-5 w-5 text-teal-600" />
          <h2 className="text-lg font-semibold text-gray-900">Monthly Enrollment Summary</h2>
        </div>
        <p className="text-xs text-gray-500">
          Summary of new patient registrations grouped by month and current clinical outcome status.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Month</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Total Enrolled</th>
                <th className="px-4 py-3 text-right font-semibold text-green-700">Completed</th>
                <th className="px-4 py-3 text-right font-semibold text-amber-700">Lost to Follow-up</th>
                <th className="px-4 py-3 text-right font-semibold text-rose-700">Died</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {monthly.map(([m, row]) => (
                <tr key={m} className="hover:bg-gray-50/50 transition">
                  <td className="px-4 py-3 font-mono font-medium text-gray-900">{m}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{row.newCases}</td>
                  <td className="px-4 py-3 text-right text-green-700 font-medium">{row.completed}</td>
                  <td className="px-4 py-3 text-right text-amber-700 font-medium">{row.lost}</td>
                  <td className="px-4 py-3 text-right text-rose-700 font-medium">{row.died}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {monthly.length === 0 ? <p className="mt-4 text-center text-sm text-gray-500">No data found.</p> : null}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="no-print flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Treatment Initiation Cohort</h2>
            <p className="text-xs text-gray-500">
              Analyze outcomes for patients who began standard treatment within a specific calendar month.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">Cohort Month:</span>
            <input
              type="month"
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-800 outline-none focus:border-teal-500 focus:bg-white"
              value={cohortMonth}
              onChange={(e) => setCohortMonth(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Patient Name</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Treating Facility</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Initiation Date</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Current Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cohort.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.facility ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-gray-600">{p.treatment_start}</td>
                  <td className="px-4 py-3 capitalize">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        p.status === 'active'
                          ? 'bg-blue-50 text-blue-700'
                          : p.status === 'completed'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {cohort.length === 0 ? (
            <p className="mt-4 text-center text-sm text-gray-500">No patients initiated in this cohort month.</p>
          ) : null}
        </div>
      </section>
    </div>
  )
}

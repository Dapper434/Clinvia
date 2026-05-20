import { useEffect, useMemo, useState } from 'react'
import { format, parseISO, startOfMonth } from 'date-fns'
import { supabase } from '../utils/supabaseClient.js'
import { buildCsv, downloadCsv } from '../utils/exportCsv.js'

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
      const { data, error: err } = await supabase.from('patients').select('*').order('treatment_start', {
        ascending: false,
      })
      if (cancelled) return
      if (err) setError(err.message)
      else setPatients(data ?? [])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const monthly = useMemo(() => {
    const map = new Map()
    for (const p of patients) {
      const k = monthKey(parseISO(p.created_at))
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
    return patients.filter((p) => format(parseISO(p.treatment_start), 'yyyy-MM') === cohortMonth)
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
    downloadCsv(`tbtrack-patients-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`, buildCsv(rows, cols))
  }

  return (
    <div className="space-y-8 print:block">
      <div className="no-print flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Reports</h2>
          <p className="mt-1 text-sm text-gray-500">Monthly summaries, cohort view, CSV export.</p>
        </div>
        <button
          type="button"
          onClick={exportPatients}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          Export patients CSV
        </button>
      </div>

      {loading ? <p className="text-sm text-gray-500">Loading…</p> : null}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-lg font-semibold text-gray-900">Monthly summary (by registration date)</h3>
        <p className="mt-1 text-xs text-gray-500">
          “New cases” counts patients created in that month; outcome columns count current status among those patients.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Month</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">Registrations</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">Completed</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">Lost</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">Died</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {monthly.map(([m, row]) => (
                <tr key={m}>
                  <td className="px-3 py-2 font-mono text-gray-900">{m}</td>
                  <td className="px-3 py-2 text-right text-gray-800">{row.newCases}</td>
                  <td className="px-3 py-2 text-right text-gray-800">{row.completed}</td>
                  <td className="px-3 py-2 text-right text-gray-800">{row.lost}</td>
                  <td className="px-3 py-2 text-right text-gray-800">{row.died}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {monthly.length === 0 ? <p className="mt-3 text-sm text-gray-500">No data.</p> : null}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="no-print flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Cohort (by treatment start month)</h3>
            <p className="mt-1 text-xs text-gray-500">Filter patients whose treatment started in the selected month.</p>
          </div>
          <label className="block text-sm">
            <span className="text-gray-600">Month</span>
            <input
              type="month"
              className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={cohortMonth}
              onChange={(e) => setCohortMonth(e.target.value)}
            />
          </label>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Name</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Facility</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Start</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cohort.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2 font-medium text-gray-900">{p.name}</td>
                  <td className="px-3 py-2 text-gray-700">{p.facility ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-700">{p.treatment_start}</td>
                  <td className="px-3 py-2 capitalize text-gray-700">{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {cohort.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">No patients in this cohort month.</p>
          ) : null}
        </div>
      </section>

      <p className="no-print text-xs text-gray-500">
        Use your browser print dialog for a print-friendly layout (sidebar is hidden via print CSS).
      </p>
    </div>
  )
}

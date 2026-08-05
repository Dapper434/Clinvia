import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/useAuth.js'
import { getPatientsApi } from '../api/patients.js'
import { getDoseLogsApi, bulkUpsertDoseLogsApi } from '../api/doseLogs.js'
import { todayISODate } from '../utils/dateHelpers.js'
import DoseToggle from '../components/patients/DoseToggle.jsx'
import { Check, Calendar } from 'lucide-react'

export default function DoseLog() {
  const { user } = useAuth()
  const [patients, setPatients] = useState([])
  const [state, setState] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const today = todayISODate()

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const p = await getPatientsApi({ status: 'active' })
        if (cancelled) return
        const list = p ?? []
        const ids = list.map((x) => x.id)
        const initial = {}

        if (ids.length) {
          const logs = await getDoseLogsApi({ date: today })
          if (cancelled) return
          for (const row of logs ?? []) {
            if (ids.includes(row.patient_id)) {
              initial[row.patient_id] = row.taken
            }
          }
        }

        for (const row of list) {
          if (initial[row.id] === undefined) initial[row.id] = null
        }

        setPatients(list)
        setState(initial)
      } catch (err) {
        if (cancelled) return
        setError(err.message || 'Failed to load dose logs')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [today])

  const canSave = useMemo(() => patients.some((p) => state[p.id] !== null), [patients, state])

  async function saveAll() {
    if (!user) return
    setSaving(true)
    setError('')
    setMessage('')

    const rows = patients
      .filter((p) => state[p.id] !== null)
      .map((p) => ({
        patient_id: p.id,
        date: today,
        taken: Boolean(state[p.id]),
        logged_by: user.id,
      }))

    if (!rows.length) {
      setMessage('No changes to save.')
      setSaving(false)
      return
    }

    try {
      await bulkUpsertDoseLogsApi(rows)
      setMessage('Successfully saved today’s dose logs.')
    } catch (err) {
      setError(err.message || 'Failed to bulk save dose logs')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Bulk Daily Dose Log</h1>
          <p className="mt-1 text-sm text-gray-500">
            Rapidly log daily DOTS medication adherence for all active TB patients.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-sm">
          <Calendar className="h-4 w-4 text-teal-600" />
          <span>Date: <span className="font-mono text-gray-900">{today}</span></span>
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <p className="text-sm text-gray-500">Loading active patient list…</p>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">{error}</p>
        </div>
      ) : null}

      {message ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-5 py-3.5 text-left font-semibold text-gray-600">Patient Name & ID</th>
                <th className="px-5 py-3.5 text-right font-semibold text-gray-600">Medication Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {patients.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-gray-900">{p.name}</p>
                    <p className="font-mono text-xs text-gray-400">{p.id}</p>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <DoseToggle value={state[p.id]} onChange={(v) => setState((s) => ({ ...s, [p.id]: v }))} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {patients.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">No active patients enrolled.</p>
          ) : (
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50/50 p-4">
              <button
                type="button"
                disabled={!canSave || saving}
                onClick={saveAll}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-50"
              >
                {saving ? 'Saving changes…' : 'Save All Doses'}
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

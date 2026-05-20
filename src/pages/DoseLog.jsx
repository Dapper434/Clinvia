import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../utils/supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'
import { todayISODate } from '../utils/dateHelpers.js'
import DoseToggle from '../components/patients/DoseToggle.jsx'

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
      const { data: p, error: e1 } = await supabase
        .from('patients')
        .select('id,name')
        .eq('status', 'active')
        .order('name')
      if (cancelled) return
      if (e1) {
        setError(e1.message)
        setLoading(false)
        return
      }
      const list = p ?? []
      const ids = list.map((x) => x.id)
      const initial = {}
      if (ids.length) {
        const { data: logs, error: e2 } = await supabase
          .from('dose_logs')
          .select('patient_id,taken')
          .eq('date', today)
          .in('patient_id', ids)
        if (e2) {
          setError(e2.message)
        } else {
          for (const row of logs ?? []) {
            initial[row.patient_id] = row.taken
          }
        }
      }
      for (const row of list) {
        if (initial[row.id] === undefined) initial[row.id] = null
      }
      setPatients(list)
      setState(initial)
      setLoading(false)
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
    const { error: err } = await supabase.from('dose_logs').upsert(rows, { onConflict: 'patient_id,date' })
    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    setMessage('Saved today’s dose logs.')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Bulk dose log</h2>
        <p className="mt-1 text-sm text-gray-500">
          Active patients · date <span className="font-mono text-gray-800">{today}</span>
        </p>
      </div>

      {loading ? <p className="text-sm text-gray-500">Loading…</p> : null}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}
      {message ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {message}
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Patient</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Today</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {patients.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-right">
                    <DoseToggle value={state[p.id]} onChange={(v) => setState((s) => ({ ...s, [p.id]: v }))} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {patients.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No active patients.</p>
          ) : (
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 p-4">
              <button
                type="button"
                disabled={!canSave || saving}
                onClick={saveAll}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save all'}
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

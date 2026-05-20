import { useEffect, useMemo, useState } from 'react'
import { format, eachMonthOfInterval, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { supabase } from '../utils/supabaseClient.js'
import {
  calcAdherence,
  isLostToFollowUp,
  missedDosesInWindow,
  TREATMENT_DAYS_DEFAULT,
} from '../utils/adherence.js'
import StatsCard from '../components/dashboard/StatsCard.jsx'
import AlertsPanel from '../components/dashboard/AlertsPanel.jsx'
import CasesBarChart from '../components/dashboard/charts/CasesBarChart.jsx'
import OutcomeDoughnut from '../components/dashboard/charts/OutcomeDoughnut.jsx'
import AdherenceLine from '../components/dashboard/charts/AdherenceLine.jsx'

function groupLogsByPatient(logs) {
  const map = new Map()
  for (const row of logs ?? []) {
    if (!map.has(row.patient_id)) map.set(row.patient_id, [])
    map.get(row.patient_id).push(row)
  }
  return map
}

export default function Dashboard() {
  const [patients, setPatients] = useState([])
  const [doseLogs, setDoseLogs] = useState([])
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
      const { data: l, error: e2 } = await supabase.from('dose_logs').select('*').order('date', {
        ascending: true,
      })
      if (cancelled) return
      if (e1 || e2) {
        setError(e1?.message || e2?.message || 'Failed to load dashboard')
        setLoading(false)
        return
      }
      setPatients(p ?? [])
      setDoseLogs(l ?? [])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const logsByPatient = useMemo(() => groupLogsByPatient(doseLogs), [doseLogs])

  const stats = useMemo(() => {
    const active = patients.filter((x) => x.status === 'active')
    const now = new Date()
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)
    const newThisMonth = patients.filter((x) =>
      isWithinInterval(new Date(x.created_at), { start: monthStart, end: monthEnd }),
    ).length

    let adherenceSum = 0
    let adherenceN = 0
    let highRisk = 0
    let ltfu = 0

    for (const patient of active) {
      const logs = logsByPatient.get(patient.id) ?? []
      const pct = calcAdherence(logs, patient.treatment_start)
      adherenceSum += pct
      adherenceN += 1
      if (pct < 80) highRisk += 1
      if (isLostToFollowUp(logs)) ltfu += 1
    }

    const avgAdherence = adherenceN ? Math.round(adherenceSum / adherenceN) : 0

    const alerts = []
    for (const patient of active) {
      const logs = logsByPatient.get(patient.id) ?? []
      const missed = missedDosesInWindow(logs, 3)
      if (missed > 0) {
        alerts.push({ patientId: patient.id, name: patient.name, missed })
      }
    }
    alerts.sort((a, b) => b.missed - a.missed)

    const outcomeCounts = { active: 0, completed: 0, lost: 0, died: 0 }
    for (const patient of patients) {
      if (outcomeCounts[patient.status] != null) outcomeCounts[patient.status] += 1
    }

    const months = eachMonthOfInterval({
      start: subMonths(startOfMonth(now), 5),
      end: startOfMonth(now),
    })
    const barLabels = months.map((m) => format(m, 'MMM yyyy'))
    const barValues = months.map((m) => {
      const start = startOfMonth(m)
      const end = endOfMonth(m)
      return patients.filter((x) =>
        isWithinInterval(new Date(x.created_at), { start, end }),
      ).length
    })

    const dayLabels = []
    const dayRatios = []
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      const key = format(d, 'yyyy-MM-dd')
      dayLabels.push(format(d, 'MMM d'))
      const rows = doseLogs.filter((r) => r.date === key)
      if (!rows.length) {
        dayRatios.push(0)
      } else {
        const taken = rows.filter((r) => r.taken).length
        dayRatios.push(Math.round((taken / rows.length) * 100))
      }
    }

    return {
      activeCount: active.length,
      newThisMonth,
      avgAdherence,
      highRisk,
      ltfu,
      alerts,
      outcomeCounts,
      barLabels,
      barValues,
      dayLabels,
      dayRatios,
    }
  }, [patients, doseLogs, logsByPatient])

  if (loading) {
    return <p className="text-sm text-gray-500">Loading dashboard…</p>
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Overview</h2>
        <p className="mt-1 text-sm text-gray-500">
          Live stats from Supabase · treatment window for adherence: {TREATMENT_DAYS_DEFAULT} days (UI default)
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatsCard label="Active cases" value={stats.activeCount} />
        <StatsCard label="New this month" value={stats.newThisMonth} />
        <StatsCard label="Avg adherence" value={`${stats.avgAdherence}%`} />
        <StatsCard label="High risk (&lt;80%)" value={stats.highRisk} hint="Among active patients" />
        <StatsCard label="Lost to follow-up" value={stats.ltfu} hint="No dose logged in 14+ days" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CasesBarChart labels={stats.barLabels} values={stats.barValues} />
        <OutcomeDoughnut counts={stats.outcomeCounts} />
      </div>

      <AdherenceLine labels={stats.dayLabels} values={stats.dayRatios} />

      <AlertsPanel alerts={stats.alerts} />
    </div>
  )
}

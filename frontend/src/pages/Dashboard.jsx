import { useEffect, useMemo, useState } from 'react'
import { format, eachMonthOfInterval, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { getPatientsApi } from '../api/patients.js'
import { getDoseLogsApi } from '../api/doseLogs.js'
import { calcAdherence, isLostToFollowUp, missedDosesInWindow } from '../utils/adherence.js'
import StatsCard from '../components/dashboard/StatsCard.jsx'
import AlertsPanel from '../components/dashboard/AlertsPanel.jsx'
import CasesBarChart from '../components/dashboard/charts/CasesBarChart.jsx'
import OutcomeDoughnut from '../components/dashboard/charts/OutcomeDoughnut.jsx'
import AdherenceLine from '../components/dashboard/charts/AdherenceLine.jsx'
import { Activity, ShieldAlert, Users, Calendar, AlertTriangle } from 'lucide-react'

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
      try {
        const [p, l] = await Promise.all([
          getPatientsApi(),
          getDoseLogsApi(),
        ])
        if (cancelled) return
        setPatients(p ?? [])
        setDoseLogs(l ?? [])
      } catch (err) {
        if (cancelled) return
        setError(err.message || 'Failed to load dashboard data')
      } finally {
        if (!cancelled) setLoading(false)
      }
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
      isWithinInterval(new Date(x.created_at || x.treatment_start), { start: monthStart, end: monthEnd }),
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
        isWithinInterval(new Date(x.created_at || x.treatment_start), { start, end }),
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
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Activity className="h-6 w-6 animate-pulse text-teal-600" />
          <p className="text-sm text-gray-500">Loading live clinical dashboard…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <p className="font-semibold">Unable to load dashboard</p>
        <p className="mt-1">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Clinical Overview</h1>
        <p className="mt-1 text-sm text-gray-500">
          Real-time patient monitoring and treatment adherence metrics.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatsCard
          label="Active Cases"
          value={stats.activeCount}
          icon={Users}
          hint="Currently undergoing treatment"
        />
        <StatsCard
          label="New This Month"
          value={stats.newThisMonth}
          icon={Calendar}
          hint="Newly enrolled patients"
        />
        <StatsCard
          label="Avg Adherence"
          value={`${stats.avgAdherence}%`}
          icon={Activity}
          tone={stats.avgAdherence >= 85 ? 'good' : stats.avgAdherence >= 70 ? 'warning' : 'bad'}
          hint="Overall treatment completion rate"
        />
        <StatsCard
          label="High Risk (<80%)"
          value={stats.highRisk}
          icon={AlertTriangle}
          tone={stats.highRisk > 0 ? 'bad' : 'neutral'}
          hint="Adherence below safety threshold"
        />
        <StatsCard
          label="Lost to Follow-up"
          value={stats.ltfu}
          icon={ShieldAlert}
          tone={stats.ltfu > 0 ? 'bad' : 'neutral'}
          hint="No dose recorded in 14+ days"
        />
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

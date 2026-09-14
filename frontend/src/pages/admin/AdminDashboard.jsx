import { useEffect, useState } from 'react'
import { getAdminDashboardApi } from '../../api/admin.js'
import StatsCard from '../../components/dashboard/StatsCard.jsx'
import OutcomeDoughnut from '../../components/dashboard/charts/OutcomeDoughnut.jsx'
import CasesBarChart from '../../components/dashboard/charts/CasesBarChart.jsx'
import { Users, Activity, Calendar, UserCog, ShieldAlert } from 'lucide-react'

const LAB_COLORS = { positive: '#dc2626', negative: '#16a34a', pending: '#f59e0b' }

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const data = await getAdminDashboardApi()
        if (!cancelled) setStats(data)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load admin dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-gray-500">Loading admin dashboard…</p>
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

  const tbTypeEntries = Object.entries(stats.tbTypeCounts || {})

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Hospital Overview</h1>
        <p className="mt-1 text-sm text-gray-500">
          TB program activity and staffing at a glance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatsCard label="Total Patients" value={stats.totalPatients} icon={Users} hint="All registered cases" />
        <StatsCard label="Active Cases" value={stats.activePatients} icon={Activity} hint="Currently in treatment" />
        <StatsCard label="New This Month" value={stats.newThisMonth} icon={Calendar} hint="Newly enrolled" />
        <StatsCard label="Staff Members" value={stats.staffCount} icon={UserCog} hint="Admin + clinical accounts" />
        <StatsCard
          label="MDR-TB Cases"
          value={stats.mdrCount}
          icon={ShieldAlert}
          tone={stats.mdrCount > 0 ? 'bad' : 'neutral'}
          hint="Rifampicin-resistant"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <OutcomeDoughnut
          counts={stats.labStatusCounts}
          colors={LAB_COLORS}
          title="Lab result status"
          emptyLabel="No lab results yet."
        />
        <div className="min-w-0 lg:col-span-2">
          <CasesBarChart
            labels={stats.doseLogDayLabels}
            values={stats.doseLogDayCounts}
            title="Doses taken (last 7 days)"
            datasetLabel="Doses taken"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <CasesBarChart
            labels={stats.newCasesMonthLabels}
            values={stats.newCasesMonthValues}
            title="New cases (last 6 months)"
          />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-900">Cases by TB type</h3>
          <div className="mt-4 space-y-3">
            {tbTypeEntries.length ? (
              tbTypeEntries.map(([type, count]) => (
                <div key={type} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-gray-600">{type.replace('-', ' ')}</span>
                  <span className="font-semibold text-gray-900">{count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No patient data yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

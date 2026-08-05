import { Link } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'

export default function AlertsPanel({ alerts }) {
  if (!alerts || !alerts.length) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900">Missed dose alerts</h2>
        <p className="mt-2 text-sm text-gray-500">No patients with missed doses in the last 3 days.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-gray-900">Missed dose alerts</h2>
      <p className="mt-1 text-xs text-gray-500">Last 3 days · color by severity</p>
      <ul className="mt-4 space-y-2">
        {alerts.map((a) => {
          const critical = a.missed >= 3
          const box = critical
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-amber-50 border-amber-200 text-amber-900'
          const icon = critical ? 'text-red-500' : 'text-amber-500'
          return (
            <li
              key={a.patientId}
              className={`flex items-center gap-3 rounded-lg border p-3 ${box}`}
            >
              <AlertCircle className={`h-5 w-5 shrink-0 ${icon}`} />
              <span className="text-sm">
                {a.name} — missed {a.missed} dose{a.missed > 1 ? 's' : ''}
              </span>
              <Link
                to={`/patients/${a.patientId}`}
                className={`ml-auto text-xs font-medium underline ${critical ? 'text-red-700' : 'text-amber-800'}`}
              >
                View
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

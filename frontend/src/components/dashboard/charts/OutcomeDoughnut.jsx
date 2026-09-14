import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Doughnut } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend)

const DEFAULT_COLORS = {
  active: '#16a34a',
  completed: '#2563eb',
  lost: '#dc2626',
  died: '#6b7280',
  positive: '#dc2626',
  negative: '#16a34a',
  pending: '#f59e0b',
}

export default function OutcomeDoughnut({ counts, colors = DEFAULT_COLORS, title = 'Treatment outcomes', emptyLabel = 'No patient data yet.' }) {
  const safeCounts = counts || {}
  const labels = Object.keys(safeCounts).filter((k) => safeCounts[k] > 0)
  const dataValues = labels.map((k) => safeCounts[k])

  const data = {
    labels: labels.map((l) => l.replaceAll('_', ' ')),
    datasets: [
      {
        data: dataValues,
        backgroundColor: labels.map((l) => colors[l] ?? '#94a3b8'),
        borderWidth: 0,
      },
    ],
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <div className="mx-auto mt-4 flex h-64 max-w-xs items-center justify-center">
        {dataValues.length ? (
          <Doughnut
            data={data}
            options={{
              plugins: { legend: { position: 'bottom' } },
              maintainAspectRatio: false,
            }}
          />
        ) : (
          <p className="text-sm text-gray-500">{emptyLabel}</p>
        )}
      </div>
    </div>
  )
}

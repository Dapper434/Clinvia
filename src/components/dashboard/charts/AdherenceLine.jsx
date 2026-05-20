import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

export default function AdherenceLine({ labels, values }) {
  const data = {
    labels,
    datasets: [
      {
        label: 'Doses taken / logged (%)',
        data: values,
        borderColor: 'rgb(13, 148, 136)',
        backgroundColor: 'rgba(13, 148, 136, 0.12)',
        tension: 0.25,
        fill: true,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'bottom' },
    },
    scales: {
      y: { min: 0, max: 100, ticks: { callback: (v) => `${v}%` } },
    },
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-900">DOT logging trend (30 days)</h3>
      <p className="text-xs text-gray-500">Share of logged doses marked “taken” each day</p>
      <div className="mt-4 h-64">
        <Line data={data} options={options} />
      </div>
    </div>
  )
}

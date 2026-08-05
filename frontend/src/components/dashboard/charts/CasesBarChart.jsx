import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export default function CasesBarChart({ labels, values }) {
  const data = {
    labels: labels || [],
    datasets: [
      {
        label: 'New registrations',
        data: values || [],
        backgroundColor: 'rgba(13, 148, 136, 0.6)',
        borderRadius: 6,
      },
    ],
  }

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, ticks: { precision: 0 } },
    },
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-900">New cases (last 6 months)</h3>
      <div className="mt-4 h-64">
        <Bar data={data} options={options} />
      </div>
    </div>
  )
}

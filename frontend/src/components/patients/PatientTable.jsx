import { Link } from 'react-router-dom'
import StatusBadge from './StatusBadge.jsx'
import { calcAdherence, getRiskLevel } from '../../utils/adherence.js'

export default function PatientTable({ patients, doseLogsByPatient }) {
  if (!patients || !patients.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        No patients yet.{' '}
        <Link to="/patients/new" className="font-medium text-teal-700 underline">
          Register a patient
        </Link>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Age</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">TB type</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Facility</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Start</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Adherence</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {patients.map((p) => {
              const logs = doseLogsByPatient?.get(p.id) ?? []
              const pct = calcAdherence(logs, p.treatment_start)
              const risk = getRiskLevel(pct)
              const riskClass =
                risk === 'good'
                  ? 'text-green-800'
                  : risk === 'warning'
                    ? 'text-amber-800'
                    : 'text-red-700'
              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      {p.name}
                      {p.mdr_flag ? (
                        <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                          MDR
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{p.age ?? '—'}</td>
                  <td className="px-4 py-3 capitalize text-gray-700">{p.tb_type?.replace('-', ' ') ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{p.facility ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{p.treatment_start}</td>
                  <td className={`px-4 py-3 font-semibold ${riskClass}`}>{pct}%</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/patients/${p.id}`} className="font-medium text-teal-700 underline hover:text-teal-900">
                      View
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

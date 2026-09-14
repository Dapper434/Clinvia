import { Link } from 'react-router-dom'

export default function ContactTracingTable({ contacts }) {
  if (!contacts || !contacts.length) {
    return <p className="text-sm text-gray-500">No household contacts recorded.</p>
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Name</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Age</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Relationship</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Phone</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Screened</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Result</th>
            <th className="px-3 py-2 text-right font-medium text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {contacts.map((c) => (
            <tr key={c.id}>
              <td className="px-3 py-2 font-medium text-gray-900">{c.name}</td>
              <td className="px-3 py-2 text-gray-700">{c.age ?? '—'}</td>
              <td className="px-3 py-2 capitalize text-gray-700">{c.relationship ?? '—'}</td>
              <td className="px-3 py-2 text-gray-700">{c.phone ?? '—'}</td>
              <td className="px-3 py-2 text-gray-700">{c.screened ? 'Yes' : 'No'}</td>
              <td className="px-3 py-2 capitalize text-gray-700">{c.screen_result?.replaceAll('_', ' ') ?? '—'}</td>
              <td className="px-3 py-2 text-right">
                {c.screen_result === 'confirmed_tb' ? (
                  <Link
                    to={`/patients/new?name=${encodeURIComponent(c.name)}&age=${encodeURIComponent(
                      c.age ?? '',
                    )}&phone=${encodeURIComponent(c.phone ?? '')}`}
                    className="text-teal-700 underline hover:text-teal-900"
                  >
                    Register as patient
                  </Link>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}

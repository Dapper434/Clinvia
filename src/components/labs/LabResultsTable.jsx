export default function LabResultsTable({ rows }) {
  if (!rows.length) {
    return <p className="text-sm text-gray-500">No lab results recorded.</p>
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Test</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Result</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Date</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Ref</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">MDR</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-3 py-2 capitalize text-gray-900">{r.test_type?.replaceAll('_', ' ')}</td>
              <td className="px-3 py-2 capitalize text-gray-700">{r.result}</td>
              <td className="px-3 py-2 text-gray-700">{r.result_date}</td>
              <td className="px-3 py-2 text-gray-700">{r.lab_ref ?? '—'}</td>
              <td className="px-3 py-2 text-gray-700">{r.mdr_detected ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

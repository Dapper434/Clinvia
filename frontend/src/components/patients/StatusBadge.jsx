const colors = {
  active: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-800',
  died: 'bg-gray-100 text-gray-700',
}

export default function StatusBadge({ status }) {
  const cls = colors[status] ?? 'bg-gray-100 text-gray-700'
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${cls}`}>
      {status?.replace('_', ' ') ?? '—'}
    </span>
  )
}

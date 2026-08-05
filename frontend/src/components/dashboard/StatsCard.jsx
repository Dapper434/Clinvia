export default function StatsCard({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="mb-1 text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-semibold text-gray-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </div>
  )
}

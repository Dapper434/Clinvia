const TONE_STYLES = {
  good: 'bg-emerald-50 text-emerald-600',
  warning: 'bg-amber-50 text-amber-600',
  bad: 'bg-rose-50 text-rose-600',
  neutral: 'bg-gray-100 text-gray-500',
}

export default function StatsCard({ label, value, hint, icon: Icon, tone = 'neutral' }) {
  return (
    <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between">
        <p className="mb-1 min-w-0 text-sm text-gray-500">{label}</p>
        {Icon ? (
          <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${TONE_STYLES[tone] ?? TONE_STYLES.neutral}`}>
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>
      <p className="text-2xl font-semibold text-gray-900 sm:text-3xl">{value}</p>
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </div>
  )
}

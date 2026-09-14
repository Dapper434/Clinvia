import { Activity } from 'lucide-react'

export default function AuthHeader({
  icon: Icon = Activity,
  accent,
  tagline = 'Hospital Management & TB Care Platform',
}) {
  return (
    <div className="mb-8 text-center">
      <div
        className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl border shadow-lg mb-4 ${accent.logoBox}`}
      >
        <Icon className={`h-8 w-8 ${accent.icon}`} />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-white">Clinvia</h1>
      <p className="mt-2 text-sm text-slate-400">{tagline}</p>
    </div>
  )
}

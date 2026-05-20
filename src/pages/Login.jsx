import { Link } from 'react-router-dom'
import { Building2, UserCircle } from 'lucide-react'
import { isSupabaseConfigured } from '../utils/supabaseClient.js'

export default function Login() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-sm font-medium text-amber-900">Supabase is not configured</p>
          <p className="mt-2 text-sm text-amber-800">
            Copy <code className="rounded bg-amber-100 px-1">.env.example</code> to{' '}
            <code className="rounded bg-amber-100 px-1">.env</code> and set your project URL and anon key,
            then restart <code className="rounded bg-amber-100 px-1">npm run dev</code>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">TBTrack</p>
          <h1 className="mt-1 text-2xl font-semibold text-gray-900">Choose how to sign in</h1>
          <p className="mt-2 text-sm text-gray-500">
            Hospitals track all patients. Patients log their own doses — updates appear on the hospital calendar.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            to="/login/hospital"
            className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-teal-300 hover:shadow-md"
          >
            <Building2 className="h-8 w-8 text-teal-600" />
            <h2 className="mt-4 text-lg font-semibold text-gray-900">Hospital / clinic</h2>
            <p className="mt-2 text-sm text-gray-600">
              Register patients, view adherence calendars, dose logs, labs, and reports.
            </p>
            <span className="mt-4 inline-block text-sm font-medium text-teal-700 group-hover:underline">
              Hospital sign in →
            </span>
          </Link>
          <Link
            to="/login/patient"
            className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-teal-300 hover:shadow-md"
          >
            <UserCircle className="h-8 w-8 text-teal-600" />
            <h2 className="mt-4 text-lg font-semibold text-gray-900">Patient</h2>
            <p className="mt-2 text-sm text-gray-600">
              Log today&apos;s dose yourself. Your hospital care team sees the same calendar.
            </p>
            <span className="mt-4 inline-block text-sm font-medium text-teal-700 group-hover:underline">
              Patient sign in →
            </span>
          </Link>
        </div>
        <p className="mt-8 text-center text-xs text-gray-400">
          Run <code className="rounded bg-gray-100 px-1">supabase/schema.sql</code> and{' '}
          <code className="rounded bg-gray-100 px-1">migration_patient_portal.sql</code> in your Supabase project.
        </p>
      </div>
    </div>
  )
}

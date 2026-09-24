import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { getPatientsApi } from '../api/patients.js'
import { roleLabel } from '../utils/roles.js'
import { Mail, UserCog, Users, ArrowRight } from 'lucide-react'

const ROLE_TONE = {
  admin: 'bg-violet-100 text-violet-700',
  hospital: 'bg-teal-100 text-teal-700',
  nurse: 'bg-sky-100 text-sky-700',
  viewer: 'bg-gray-100 text-gray-700',
}

export default function Profile() {
  const { user, profile, role } = useAuth()
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    try {
      setError('')
      setLoading(true)
      const data = await getPatientsApi({ assignedToMe: true })
      setPatients(data ?? [])
    } catch (err) {
      setError(err.message || 'Failed to load assigned patients')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    Promise.resolve().then(reload)
  }, [reload])

  const name = profile?.full_name || user?.fullName || 'Staff Member'
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-500/10 via-white to-teal-500/5 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-teal-600 text-xl font-bold text-white">
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
            <div className="mt-1 flex items-center gap-3">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_TONE[role] ?? ROLE_TONE.viewer}`}>
                {roleLabel(role)}
              </span>
              <span className="flex items-center gap-1 text-sm text-gray-500">
                <Mail className="h-3.5 w-3.5" />
                {user?.email}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Assigned patients */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Users className="h-4 w-4 text-teal-600" />
          Your Assigned Patients ({patients.length})
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          Patients where you're listed as the assigned doctor on their care team.
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-gray-500">Loading…</p>
        ) : error ? (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        ) : patients.length ? (
          <div className="mt-4 divide-y divide-gray-100">
            {patients.map((p) => (
              <Link
                key={p.id}
                to={`/patients/${p.id}`}
                className="flex items-center justify-between gap-3 py-3 text-sm hover:bg-gray-50/60"
              >
                <div>
                  <p className="font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500 capitalize">
                    {p.tb_type?.replace('-', ' ')} · {p.status}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500">
            No patients are currently assigned to you. Assign yourself as the doctor on a patient's profile to
            see them here.
          </p>
        )}
      </div>

      {role === 'admin' ? (
        <Link
          to="/admin/staff"
          className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <span className="flex items-center gap-2">
            <UserCog className="h-4 w-4 text-teal-600" />
            Manage staff accounts
          </span>
          <ArrowRight className="h-4 w-4 text-gray-400" />
        </Link>
      ) : null}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { getStaffApi, createStaffApi } from '../../api/admin.js'
import { UserPlus } from 'lucide-react'

const ROLE_OPTIONS = ['hospital', 'nurse', 'viewer', 'admin']
const ROLE_LABELS = { hospital: 'Clinician', nurse: 'Nurse', viewer: 'Viewer', admin: 'Admin' }

const emptyForm = { fullName: '', email: '', password: '', role: 'hospital' }

export default function StaffManagement() {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  async function reload() {
    setLoading(true)
    setError('')
    try {
      const data = await getStaffApi()
      setStaff(data ?? [])
    } catch (err) {
      setError(err.message || 'Failed to load staff')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Defer out of the synchronous effect body (react-hooks/set-state-in-effect).
    Promise.resolve().then(reload)
  }, [])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')

    if (!form.fullName.trim() || !form.email.trim() || !form.password) {
      setFormError('Full name, email, and password are required.')
      return
    }

    setSaving(true)
    try {
      await createStaffApi({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      })
      setForm(emptyForm)
      await reload()
    } catch (err) {
      setFormError(err.message || 'Failed to create staff account')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Staff Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create and review staff accounts. There is no public sign-up for staff — accounts are created here.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-900">Existing staff ({staff.length})</h2>
          {loading ? (
            <p className="mt-4 text-sm text-gray-500">Loading…</p>
          ) : error ? (
            <p className="mt-4 text-sm text-red-600">{error}</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium">Email</th>
                    <th className="pb-2 font-medium">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {staff.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2.5 font-medium text-gray-900">{s.fullName}</td>
                      <td className="py-2.5 text-gray-500">{s.email}</td>
                      <td className="py-2.5">
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                          {ROLE_LABELS[s.role] ?? s.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <UserPlus className="h-4 w-4" />
            Add staff account
          </h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Full name</label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => update('fullName', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Temporary password</label>
              <input
                type="text"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Role</label>
              <select
                value={form.role}
                onChange={(e) => update('role', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>

            {formError ? <p className="text-xs text-red-600">{formError}</p> : null}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-violet-600 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {saving ? 'Creating…' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

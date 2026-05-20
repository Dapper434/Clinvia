import { useState } from 'react'
import { supabase } from '../../utils/supabaseClient.js'

const initial = {
  name: '',
  age: '',
  relationship: 'spouse',
  phone: '',
  screened: false,
  screen_result: '',
  screened_date: '',
}

export default function ContactForm({ sourcePatientId, onSaved }) {
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function update(k, v) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setBusy(true)
    setError('')
    const payload = {
      source_patient_id: sourcePatientId,
      name: form.name.trim(),
      age: form.age === '' ? null : Number(form.age),
      relationship: form.relationship,
      phone: form.phone || null,
      screened: Boolean(form.screened),
      screen_result: form.screen_result || null,
      screened_date: form.screened_date || null,
    }
    const { error: err } = await supabase.from('contacts').insert([payload])
    setBusy(false)
    if (err) {
      setError(err.message)
      return
    }
    setForm(initial)
    onSaved?.()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <p className="text-sm font-semibold text-gray-900">Add contact</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="text-gray-600">Full name *</span>
          <input
            required
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">Age</span>
          <input
            type="number"
            min={0}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={form.age}
            onChange={(e) => update('age', e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">Relationship</span>
          <select
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={form.relationship}
            onChange={(e) => update('relationship', e.target.value)}
          >
            <option value="spouse">Spouse</option>
            <option value="child">Child</option>
            <option value="parent">Parent</option>
            <option value="roommate">Roommate</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="text-gray-600">Phone</span>
          <input
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={form.screened} onChange={(e) => update('screened', e.target.checked)} />
          <span className="text-gray-700">Screened</span>
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">Screen result</span>
          <select
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={form.screen_result}
            onChange={(e) => update('screen_result', e.target.value)}
          >
            <option value="">—</option>
            <option value="negative">Negative</option>
            <option value="referred">Referred</option>
            <option value="confirmed_tb">Confirmed TB</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">Screened date</span>
          <input
            type="date"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={form.screened_date}
            onChange={(e) => update('screened_date', e.target.value)}
          />
        </label>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
      >
        {busy ? 'Saving…' : 'Save contact'}
      </button>
    </form>
  )
}

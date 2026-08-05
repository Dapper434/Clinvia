import { useState } from 'react'
import { createLabApi } from '../../api/labs.js'
import { updatePatientApi } from '../../api/patients.js'

const initial = {
  test_type: 'sputum_smear',
  result: 'pending',
  result_date: new Date().toISOString().slice(0, 10),
  lab_ref: '',
  notes: '',
  mdr_detected: false,
}

export default function LabResultForm({ patientId, onSaved }) {
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function update(k, v) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const payload = {
        patient_id: patientId,
        test_type: form.test_type,
        result: form.result,
        result_date: form.result_date,
        lab_ref: form.lab_ref || null,
        notes: form.notes || null,
        mdr_detected: Boolean(form.mdr_detected),
      }
      await createLabApi(payload)
      if (payload.mdr_detected) {
        await updatePatientApi(patientId, { mdr_flag: true }).catch(() => {})
      }
      setForm(initial)
      onSaved?.()
    } catch (err) {
      setError(err.message || 'Failed to save lab result')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <p className="text-sm font-semibold text-gray-900">Add lab result</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-gray-600">Test type</span>
          <select
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={form.test_type}
            onChange={(e) => update('test_type', e.target.value)}
          >
            <option value="sputum_smear">Sputum smear</option>
            <option value="genexpert">GeneXpert</option>
            <option value="xray">X-ray</option>
            <option value="culture">Culture</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">Result</span>
          <select
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={form.result}
            onChange={(e) => update('result', e.target.value)}
          >
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
            <option value="pending">Pending</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">Result date</span>
          <input
            type="date"
            required
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={form.result_date}
            onChange={(e) => update('result_date', e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">Lab reference</span>
          <input
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={form.lab_ref}
            onChange={(e) => update('lab_ref', e.target.value)}
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="text-gray-600">Notes</span>
          <input
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={form.mdr_detected}
            onChange={(e) => update('mdr_detected', e.target.checked)}
          />
          <span className="text-gray-700">MDR detected (sets patient MDR flag)</span>
        </label>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
      >
        {busy ? 'Saving…' : 'Save lab result'}
      </button>
    </form>
  )
}

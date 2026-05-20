import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { linkPatientRecord } from '../../utils/patientRecord.js'

export default function LinkHospitalRecord({ onLinked }) {
  const { user, refreshPatientId } = useAuth()
  const [linkId, setLinkId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleLink(e) {
    e.preventDefault()
    if (!user || !linkId.trim()) return
    setBusy(true)
    setError('')
    setMessage('')
    const result = await linkPatientRecord(user.id, linkId.trim())
    setBusy(false)
    if (result.error) {
      setError(result.error.message)
      return
    }
    setMessage('Linked to your clinic record. Your dose history will show on the hospital calendar.')
    setLinkId('')
    await refreshPatientId()
    onLinked?.()
  }

  return (
    <form
      onSubmit={handleLink}
      className="rounded-xl border-2 border-amber-200 bg-amber-50 p-5 space-y-3"
    >
      <h3 className="text-sm font-semibold text-amber-900">Link to hospital record</h3>
      <p className="text-xs text-amber-800">
        Your clinic registered you first? Paste the <strong>Patient ID</strong> from your clinic card below.
      </p>
      <label className="block text-sm">
        <span className="text-amber-900 font-medium">Hospital patient ID</span>
        <input
          required
          className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 font-mono text-sm"
          value={linkId}
          onChange={(e) => setLinkId(e.target.value)}
          placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
        />
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {message ? <p className="text-sm text-green-800">{message}</p> : null}
      <button
        type="submit"
        disabled={busy || !linkId.trim()}
        className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
      >
        {busy ? 'Linking…' : 'Link clinic record'}
      </button>
    </form>
  )
}

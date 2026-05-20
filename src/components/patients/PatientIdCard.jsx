import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export default function PatientIdCard({ patientId, title = 'Patient ID for portal link-up' }) {
  const [copied, setCopied] = useState(false)

  async function copyId() {
    try {
      await navigator.clipboard.writeText(patientId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="rounded-xl border-2 border-teal-200 bg-teal-50 p-4">
      <p className="text-sm font-semibold text-teal-900">{title}</p>
      <p className="mt-1 text-xs text-teal-800">
        Give this ID to the patient. They enter it at{' '}
        <span className="font-medium">/login/patient</span> → Sign up → Hospital patient ID.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="flex-1 break-all rounded-lg border border-teal-200 bg-white px-3 py-2 font-mono text-xs text-gray-800">
          {patientId}
        </code>
        <button
          type="button"
          onClick={copyId}
          className="inline-flex items-center gap-1.5 rounded-lg border border-teal-300 bg-white px-3 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-100"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy ID'}
        </button>
      </div>
    </div>
  )
}

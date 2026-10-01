import { useState } from 'react'
import { EyeOff } from 'lucide-react'
import { setReminderStyleApi } from '../../api/portal.js'

/** Lets the patient choose the voice of their reminders, with today's message as a preview. */
export default function ReminderStylePicker({ reminder }) {
  const [style, setStyle] = useState(reminder?.style)
  const [preview, setPreview] = useState(reminder?.preview)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!reminder?.styles?.length) return null

  async function choose(next) {
    if (next === style || busy) return
    const previous = style
    setStyle(next)
    setBusy(true)
    setError('')
    try {
      const updated = await setReminderStyleApi(next)
      setPreview(updated.preview)
    } catch (err) {
      setStyle(previous)
      setError(err.message || 'Couldn’t save your choice. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-5 border-t border-gray-100 pt-4">
      <p className="text-sm font-semibold text-gray-900" id="reminder-style-label">How should we remind you?</p>
      <div role="radiogroup" aria-labelledby="reminder-style-label" className="mt-2 grid grid-cols-2 gap-2">
        {reminder.styles.map((s) => {
          const selected = s.id === style
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => choose(s.id)}
              disabled={busy}
              className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${selected
                ? 'border-teal-600 bg-teal-50 text-teal-800'
                : 'border-gray-200 text-gray-700 hover:border-teal-300 hover:bg-teal-50/40'} disabled:cursor-wait`}
            >
              {s.label}
            </button>
          )
        })}
      </div>
      {preview ? (
        <div className="mt-3 rounded-2xl bg-gray-50 px-4 py-3" aria-live="polite">
          <p className="text-xs font-semibold text-gray-900">{preview.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-gray-700">{preview.body}</p>
        </div>
      ) : null}
      <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
        <EyeOff className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
        Reminders never mention your health, so they’re safe on a lock screen.
      </p>
      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
    </div>
  )
}

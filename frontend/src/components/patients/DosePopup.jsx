import { useEffect, useRef, useState } from 'react'
import { Pill } from 'lucide-react'

const CHECK_EVERY_MS = 30 * 1000
const SNOOZE_MS = 30 * 60 * 1000

function storageKey(today) {
  return `clinvia.dosePopup.${today}`
}

function readState(today) {
  try { return localStorage.getItem(storageKey(today)) } catch { return null }
}

function writeState(today, value) {
  try { localStorage.setItem(storageKey(today), value) } catch { /* private mode: the popup may come back on reload */ }
}

function isDue(doseTime, today, now = new Date()) {
  const [h, m] = (doseTime || '07:00').split(':').map(Number)
  const due = new Date(`${today}T00:00:00`)
  due.setHours(h, m, 0, 0)
  if (now < due) return false
  const state = readState(today)
  if (state === 'dismissed') return false
  const snoozedUntil = Number(state)
  return !(snoozedUntil && now.getTime() < snoozedUntil)
}

/**
 * In-app popup once today's dose time has passed and the dose isn't checked in.
 * If the tab is in the background and notifications are allowed, a system
 * notification is shown once as well (web push still covers a closed app).
 */
export default function DosePopup({ doseTime, today, isLogged, onCheckIn, message }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const primaryRef = useRef(null)
  const notified = useRef(false)

  useEffect(() => {
    if (isLogged) return undefined
    const check = () => {
      if (!isDue(doseTime, today)) return
      setOpen(true)
      if (!notified.current && document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        notified.current = true
        // Lock screens are public: the system notification uses the discreet wording.
        new Notification(message?.title || 'Time for your daily routine', { body: message?.body || 'Open Clinvia when you have a moment.', tag: 'dose-reminder-local' })
      }
    }
    const first = setTimeout(check, 0)
    const id = setInterval(check, CHECK_EVERY_MS)
    return () => { clearTimeout(first); clearInterval(id) }
  }, [doseTime, today, isLogged, message])

  useEffect(() => { if (open) primaryRef.current?.focus() }, [open])

  if (!open || isLogged) return null

  const snooze = () => {
    writeState(today, String(Date.now() + SNOOZE_MS))
    setOpen(false)
  }
  const dismiss = () => {
    writeState(today, 'dismissed')
    setOpen(false)
  }
  const confirm = async () => {
    setBusy(true)
    try {
      await onCheckIn()
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/30 p-4 sm:items-center" onKeyDown={(e) => e.key === 'Escape' && snooze()}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="dose-popup-title" aria-describedby="dose-popup-text" className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-600"><Pill className="h-5 w-5" aria-hidden="true" /></div>
        <h2 id="dose-popup-title" className="mt-4 text-lg font-bold text-gray-900">Time for your TB medicine</h2>
        <p id="dose-popup-text" className="mt-1 text-sm text-gray-600">It’s past {doseTime}. Take today’s dose, then check in so your care team can see you’re on track.</p>
        {message?.body ? <p className="mt-3 rounded-2xl bg-teal-50/70 px-4 py-3 text-sm leading-relaxed text-teal-900">{message.body}</p> : null}
        <div className="mt-5 flex flex-col gap-2">
          <button ref={primaryRef} type="button" onClick={confirm} disabled={busy} className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
            {busy ? 'Saving…' : 'I took today’s dose'}
          </button>
          <button type="button" onClick={snooze} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Remind me in 30 minutes</button>
          <button type="button" onClick={dismiss} className="px-4 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-800">Not today</button>
        </div>
      </div>
    </div>
  )
}

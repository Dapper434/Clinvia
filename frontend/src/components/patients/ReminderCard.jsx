import { useEffect, useState } from 'react'
import { Bell, BellOff, BellRing, Check } from 'lucide-react'
import { getVapidPublicKeyApi, sendTestPushApi, subscribePushApi, unsubscribePushApi } from '../../api/push.js'
import { disablePush, enablePush, getExistingSubscription, pushSupport } from '../../utils/push.js'
import { formatDoseTime } from '../../utils/doseTimes.js'

const HELP = {
  'not-configured': 'Reminders aren’t set up on the server yet. Ask your clinic.',
  unsupported: 'This browser can’t receive reminders. Try Chrome on Android, or a computer browser.',
  'ios-needs-install':
    'On iPhone: tap Share, then “Add to Home Screen”. Open Clinvia from your Home Screen and turn reminders on there.',
  denied: 'Notifications are blocked for this site. Allow them in your browser’s site settings, then reload this page.',
}

async function detectStatus(pushConfigured) {
  if (!pushConfigured) return 'not-configured'
  const support = pushSupport()
  if (support !== 'supported') return support
  if (Notification.permission === 'denied') return 'denied'
  const subscription = await getExistingSubscription()
  if (!subscription) return 'off'
  // Re-sync in case the server pruned it or another account used this device.
  await subscribePushApi(subscription.toJSON()).catch(() => {})
  return 'on'
}

export default function ReminderCard({ reminder }) {
  const [status, setStatus] = useState('checking')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  useEffect(() => {
    let cancelled = false
    detectStatus(reminder?.pushConfigured)
      .then((s) => !cancelled && setStatus(s))
      .catch(() => !cancelled && setStatus('off'))
    return () => {
      cancelled = true
    }
  }, [reminder?.pushConfigured])

  async function turnOn() {
    setBusy(true)
    setNote('')
    try {
      const { publicKey } = await getVapidPublicKeyApi()
      const subscription = await enablePush(publicKey)
      await subscribePushApi(subscription)
      setStatus('on')
      setNote('Reminders are on. You’ll get a nudge at your dose time if you haven’t logged yet.')
    } catch (err) {
      if (err.message === 'denied') setStatus('denied')
      else if (err.message === 'dismissed') setNote('No problem. Tap the button again whenever you’re ready.')
      else setNote(err.message || 'Couldn’t turn on reminders.')
    } finally {
      setBusy(false)
    }
  }

  async function turnOff() {
    setBusy(true)
    setNote('')
    try {
      const endpoint = await disablePush()
      if (endpoint) await unsubscribePushApi(endpoint)
      setStatus('off')
    } catch (err) {
      setNote(err.message || 'Couldn’t turn off reminders.')
    } finally {
      setBusy(false)
    }
  }

  async function sendTest() {
    setBusy(true)
    setNote('')
    try {
      await sendTestPushApi()
      setNote('Test sent. It should pop up in a few seconds.')
    } catch (err) {
      setNote(err.message || 'Couldn’t send a test reminder.')
    } finally {
      setBusy(false)
    }
  }

  const doseTime = reminder?.doseTime ? formatDoseTime(reminder.doseTime) : null

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        {status === 'on' ? (
          <BellRing className="h-4 w-4 text-teal-600" />
        ) : status === 'off' || status === 'checking' ? (
          <Bell className="h-4 w-4 text-gray-500" />
        ) : (
          <BellOff className="h-4 w-4 text-gray-400" />
        )}
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Dose Reminders</p>
      </div>

      {doseTime ? (
        <div className="mt-3">
          <p className="text-2xl font-bold text-gray-900">Daily at {doseTime}</p>
          <p className="mt-0.5 text-xs text-gray-500">
            {reminder.setByDoctor ? 'Set by your doctor' : 'Standard time: before breakfast. Your doctor can change it.'}
          </p>
        </div>
      ) : null}

      <div className="mt-4">
        {status === 'checking' ? (
          <p className="text-sm text-gray-500">Checking this device…</p>
        ) : status === 'off' ? (
          <button
            type="button"
            onClick={turnOn}
            disabled={busy}
            className="w-full rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-50"
          >
            {busy ? 'Turning on…' : 'Turn on reminders'}
          </button>
        ) : status === 'on' ? (
          <div className="space-y-3">
            <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
              <Check className="h-4 w-4" /> On for this device
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={sendTest}
                disabled={busy}
                className="flex-1 rounded-xl border border-teal-600 px-3 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-50 disabled:opacity-50"
              >
                Send a test
              </button>
              <button
                type="button"
                onClick={turnOff}
                disabled={busy}
                className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Turn off
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-600">{HELP[status]}</p>
        )}
      </div>

      {note ? <p className="mt-3 text-xs text-gray-500">{note}</p> : null}
    </div>
  )
}

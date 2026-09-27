import { addDays, differenceInCalendarDays, eachDayOfInterval, endOfMonth, format, isSameDay, isSameMonth, min, startOfDay, startOfMonth, startOfWeek } from 'date-fns'

/**
 * Sample data and date maths for the landing-page dose calendar: a few patients'
 * last 30 days, ending today, laid out on a real Monday-first month grid.
 *
 * Day codes: t = observed by clinic staff, p = checked in by the patient,
 * m = missed, . = not logged yet.
 */
/** The rotation, in order. Each has the last 30 days and today's clinic event. */
export const PATIENTS = [
  { code: 'P-0219', days: 'tmtpttmtmttmttpmttmtmtmtmtmmmm', event: { tone: 'pending', text: 'dose reminder sent · 07:00 · no check-in yet' } },
  { code: 'P-0142', days: 'tttttttttttttttmtttttttttttttt', event: { tone: 'observed', text: 'dose observed by clinic staff · 07:34' } },
  { code: 'P-0187', days: 'ppptppppppmpppppptpppppppppppp', event: { tone: 'checkin', text: 'checked in today’s dose from their phone · 07:12' } },
  { code: 'P-0203', days: 'ttmtttmtptmtttmtttpttmttttmtt.', event: { tone: 'pending', text: 'today’s dose not logged yet · reminder sent 07:00' } },
]
export const WINDOW_DAYS = 30
export const STREAK_ALERT = 2
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const STATUS_TEXT = {
  t: 'Dose observed by clinic staff',
  p: 'Checked in from their phone',
  m: 'Missed · no dose logged',
  '.': 'Not logged yet',
}

export const BAND_TEXT = { none: '', good: 'on track', fair: 'watch', poor: 'follow up' }

export function today() {
  return startOfDay(new Date())
}

export function windowStart(now) {
  return addDays(now, -(WINDOW_DAYS - 1))
}

/** Index of `date` inside the 30-day window, or -1 outside it. */
export function windowIndex(date, now) {
  const i = differenceInCalendarDays(date, windowStart(now))
  return i >= 0 && i < WINDOW_DAYS ? i : -1
}

export function adherence(seen) {
  const logged = [...seen].filter((d) => d !== '.')
  const taken = logged.filter((d) => d === 't' || d === 'p').length
  return logged.length ? Math.round((100 * taken) / logged.length) : null
}

export function band(pct) {
  if (pct === null) return 'none'
  if (pct >= 80) return 'good'
  if (pct >= 60) return 'fair'
  return 'poor'
}

/** Trailing run of missed doses within what has been seen so far. */
export function missedStreak(seen) {
  const logged = seen.replace(/\.+$/, '')
  return logged.length - logged.replace(/m+$/, '').length
}

/**
 * Monday-first grid for `month`. It opens on the week where the 30-day window
 * begins, so every day that counts is on screen; days of the previous month
 * read as such, dimmed.
 */
export function monthCells(month, now) {
  const start = startOfWeek(min([windowStart(now), startOfMonth(month)]), { weekStartsOn: 1 })
  return eachDayOfInterval({ start, end: endOfMonth(month) })
}

export { addDays, format, isSameDay, isSameMonth, startOfMonth }

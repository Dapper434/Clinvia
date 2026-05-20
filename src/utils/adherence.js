import { differenceInDays, parseISO } from 'date-fns'

/** Standard intensive phase window for UI (WHO regimens vary). */
export const TREATMENT_DAYS_DEFAULT = 180

export function calcAdherence(doseLogs, treatmentStart) {
  const start = parseISO(treatmentStart)
  const today = new Date()
  const totalDays = differenceInDays(today, start) + 1
  if (totalDays <= 0) return 0
  const taken = doseLogs.filter((d) => d.taken).length
  return Math.min(100, Math.round((taken / totalDays) * 100))
}

export function getRiskLevel(adherencePct) {
  if (adherencePct >= 80) return 'good'
  if (adherencePct >= 60) return 'warning'
  return 'critical'
}

export function isLostToFollowUp(doseLogs) {
  if (!doseLogs.length) return true
  const sorted = [...doseLogs].sort((a, b) => new Date(b.date) - new Date(a.date))
  const lastDate = parseISO(sorted[0].date)
  return differenceInDays(new Date(), lastDate) > 14
}

export function daysRemainingInTreatment(treatmentStart, totalDays = TREATMENT_DAYS_DEFAULT) {
  const start = parseISO(treatmentStart)
  const elapsed = differenceInDays(new Date(), start) + 1
  return Math.max(0, totalDays - elapsed)
}

export function missedDosesInWindow(doseLogs, days = 3) {
  const cutoff = new Date()
  cutoff.setHours(0, 0, 0, 0)
  cutoff.setDate(cutoff.getDate() - (days - 1))
  return doseLogs.filter((d) => {
    const dt = parseISO(d.date)
    return dt >= cutoff && d.taken === false
  }).length
}

// The reminder scheduler runs every 30 minutes from 05:00 to 23:30 (Nairobi time),
// so doctors pick from exactly those slots and every choice actually fires.
export const DOSE_TIME_OPTIONS = Array.from({ length: 38 }, (_, i) => {
  const minutes = 5 * 60 + i * 30
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
})

export function formatDoseTime(hhmm) {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`
}

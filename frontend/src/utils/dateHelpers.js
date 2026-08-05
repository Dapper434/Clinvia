import { format, parseISO } from 'date-fns'

export function formatDate(isoDate, pattern = 'yyyy-MM-dd') {
  if (!isoDate) return ''
  return format(typeof isoDate === 'string' ? parseISO(isoDate) : isoDate, pattern)
}

export function todayISODate() {
  return format(new Date(), 'yyyy-MM-dd')
}

// Date helpers work on 'YYYY-MM-DD' strings in UTC so a day never shifts with the browser's zone.
export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const dt = (s) => new Date(`${String(s).slice(0, 10)}T00:00:00Z`)
export const iso = (d) => d.toISOString().slice(0, 10)
export const addDays = (s, n) => {
  const d = dt(s)
  d.setUTCDate(d.getUTCDate() + n)
  return iso(d)
}
export const diffDays = (a, b) => Math.round((dt(a) - dt(b)) / 864e5)
export const fmt = (s) => {
  const d = dt(s)
  return `${d.getUTCDate()} ${MON[d.getUTCMonth()]}`
}
export const fmtY = (s) => `${fmt(s)} ${dt(s).getUTCFullYear()}`
export const dow = (s) => DOW[dt(s).getUTCDay()]
export const dowLong = (s) => DOW_LONG[dt(s).getUTCDay()]
export const monday = (s) => addDays(s, -((dt(s).getUTCDay() + 6) % 7))
export const isWeekend = (s) => [0, 6].includes(dt(s).getUTCDay())
export const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`
export const initials = (n) =>
  (n || '')
    .replace(/^Dr\.\s*/, '')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
export const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s)
export const surname = (name) => (name || '').split(' ').slice(-1)[0]

// Adherence bands used everywhere: >= 80 teal, 60-79 amber, < 60 red.
export const band = (v) => (v == null ? 'var(--ink-3)' : v >= 80 ? 'var(--teal)' : v >= 60 ? 'var(--amber)' : 'var(--red)')
export const bandHex = (v) => (v == null ? '#7F918C' : v >= 80 ? '#0E7C70' : v >= 60 ? '#C98A1E' : '#B83A26')

export const DOSE_TIME_LABEL = (t) =>
  !t ? 'Before breakfast' : t === '07:00' ? 'Before breakfast' : t === '19:00' ? 'After supper' : t

export const readCode = (v) => {
  const m = String(v || '').trim().match(/^(P\d{4,})/i)
  return m ? m[1].toUpperCase() : null
}

// "Thika Level 5 Hospital" -> "Thika", for tight columns in the all-hospitals view.
export const shortHospital = (name) =>
  (name || '').replace(/ (County Referral|Level 5|National Referral|National) Hospital$/, '')

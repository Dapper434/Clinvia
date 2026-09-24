import { Link } from 'react-router-dom'
import { Person } from './icons.jsx'

export function Stats({ four, label = 'At a glance', children }) {
  return (
    <section className={`stats${four ? ' four' : ''}`} aria-label={label}>
      {children}
    </section>
  )
}

export function Stat({ label, value, unit, note, valueClass }) {
  return (
    <div className="stat">
      <p>{label}</p>
      <strong className={valueClass}>
        {value}
        {unit ? <em>{unit}</em> : null}
      </strong>
      <small>{note}</small>
    </div>
  )
}

export function Strip({ days, light = false, label = 'Last 7 days of doses' }) {
  return (
    <div className={`strip${light ? ' light' : ''}`} role="img" aria-label={label}>
      {days.map((d, i) => (
        <i key={i} className={d} />
      ))}
    </div>
  )
}

export const PatientPill = ({ children = 'Patient, online' }) => (
  <span className="pill p-pat">
    <Person />
    {children}
  </span>
)

export const BookedBy = ({ via }) =>
  via === 'patient_portal' ? <PatientPill /> : <span className="pill p-staff">Reception</span>

export function ApptStatus({ status, next }) {
  if (status === 'completed') return <span className="pill p-done">Seen</span>
  if (status === 'no_show') return <span className="pill p-red">Did not come</span>
  if (status === 'cancelled') return <span className="pill p-done">Cancelled</span>
  if (next) return <span className="pill p-next">Next up</span>
  return (
    <span className="muted" style={{ fontSize: 12.5 }}>
      Booked
    </span>
  )
}

export function Empty({ children, action }) {
  return (
    <div className="empty">
      <span>{children}</span>
      {action}
    </div>
  )
}

export function Loading({ what = 'Loading…' }) {
  return (
    <section className="panel" aria-busy="true">
      <p className="muted">{what}</p>
    </section>
  )
}

export function ErrorNote({ error, onRetry }) {
  return (
    <div className="alert" role="alert">
      <p>
        <b>Couldn't load this.</b> {error}
      </p>
      {onRetry ? (
        <button type="button" className="btn" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  )
}

export const PatientLink = ({ p, className = 'link' }) => (
  <Link className={className} to={`/patients/${p.code}`}>
    {p.name}
  </Link>
)

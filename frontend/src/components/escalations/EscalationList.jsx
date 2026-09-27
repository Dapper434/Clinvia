import { useState } from 'react'
import { Link } from 'react-router-dom'
import { acknowledgeEscalationApi } from '../../api/escalations.js'
import { useAuth } from '../../context/useAuth.js'
import { fmt } from '../../utils/format.js'

const when = (at) => `${fmt(at.slice(0, 10))}, ${at.slice(11, 16)}`

function Acknowledge({ id, onDone }) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!open) return <button type="button" className="btn sm" onClick={() => setOpen(true)}>Mark handled</button>
  return (
    <form
      className="esc-ack"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        try {
          onDone(await acknowledgeEscalationApi(id, note))
        } catch (err) {
          setError(err.message)
          setBusy(false)
        }
      }}
    >
      <label className="sr-only" htmlFor={`esc-note-${id}`}>What you did</label>
      <input id={`esc-note-${id}`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="What you did (optional), e.g. called the patient" />
      <button type="submit" className="btn sm primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      <button type="button" className="btn sm" onClick={() => setOpen(false)}>Cancel</button>
      {error ? <small className="warn">{error}</small> : null}
    </form>
  )
}

/**
 * What patients told Rafiki, the portal companion, that a doctor should see.
 * `showPatient` is off on the patient's own record.
 */
export default function EscalationList({ rows, onHandled, showPatient = true }) {
  const { can } = useAuth()
  return (
    <ul className="esc-list">
      {rows.map((e) => (
        <li key={e.id} className={`esc-row ${e.status === 'open' ? e.severity : 'done'}`}>
          <div className="esc-top">
            <span className={`esc-sev ${e.status === 'open' ? e.severity : ''}`}>
              {e.status !== 'open' ? 'Handled' : e.severity === 'urgent' ? 'Urgent' : 'Concern'}
            </span>
            {showPatient ? (
              <Link className="link" to={`/patients/${e.patient.code}`}>{e.patient.name}</Link>
            ) : null}
            <small className="muted">
              {showPatient ? `${e.patient.code} · ` : ''}{when(e.raised)}{e.doctor ? ` · for ${e.doctor}` : ' · for any doctor'}
            </small>
          </div>
          <p className="esc-reason">{e.reason}</p>
          <blockquote className="esc-quote">{e.message}</blockquote>
          {e.status === 'open' ? (
            can('escalations.handle') ? <Acknowledge id={e.id} onDone={onHandled} /> : null
          ) : (
            <small className="muted">
              Handled by {e.acknowledgedBy || 'staff'} on {when(e.acknowledged)}{e.note ? `: ${e.note}` : ''}
            </small>
          )}
        </li>
      ))}
    </ul>
  )
}

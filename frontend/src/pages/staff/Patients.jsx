import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registryApi } from '../../api/patients.js'
import { useShell } from '../../components/shell/shellContext.js'
import { ErrorNote, Strip } from '../../components/ui/bits.jsx'
import { Left, Person, Plus, Right, Search } from '../../components/ui/icons.jsx'
import Page from '../../components/ui/Page.jsx'
import { useApi } from '../../components/ui/useApi.js'
import { useAuth } from '../../context/useAuth.js'
import { band } from '../../utils/format.js'

const FILTERS = [
  ['all', 'All'],
  ['mine', 'My patients'],
  ['tb', 'On TB treatment'],
  ['admitted', 'Admitted'],
  ['portal', 'Use the portal'],
  ['children', 'Children'],
]

// Remembered while moving between pages, like the prototype.
const memory = { filter: 'all', q: '', page: 0 }

export default function Patients() {
  const { can, scope } = useAuth()
  const { version } = useShell()
  const navigate = useNavigate()
  const [filter, setFilter] = useState(memory.filter)
  const [term, setTerm] = useState(memory.q)
  const [q, setQ] = useState(memory.q)
  const [page, setPage] = useState(memory.page)

  useEffect(() => {
    const t = setTimeout(() => setQ(term), 200)
    return () => clearTimeout(t)
  }, [term])
  useEffect(() => {
    Object.assign(memory, { filter, q, page })
  }, [filter, q, page])

  const { data, error, reload } = useApi(() => registryApi({ filter, q, page }), [filter, q, page, scope, version])
  const counts = data?.counts || {}
  const register = can('patients.register')

  return (
    <Page
      title="Patients"
      sub={data ? `${counts.all} registered` : ''}
      actions={register ? <Link className="btn primary" to="/patients/new"><Plus />Register patient</Link> : null}
    >
      <div className="toolbar">
        <label className="search">
          <span className="sr">Search patients</span>
          <Search />
          <input type="search" placeholder="Search by name, P-code or phone" value={term} onChange={(e) => { setTerm(e.target.value); setPage(0) }} />
        </label>
        <div className="seg" role="group" aria-label="Filter patients">
          {FILTERS.filter(([k]) => k in counts || !data).map(([k, l]) => (
            <button type="button" key={k} className={filter === k ? 'on' : ''} onClick={() => { setFilter(k); setPage(0) }}>
              {l}
              <em>{counts[k] ?? ''}</em>
            </button>
          ))}
        </div>
      </div>
      {error ? <ErrorNote error={error} onRetry={reload} /> : null}
      <section className="panel">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr><th>Patient</th><th>Age</th><th>Facility</th><th>Doctor</th><th>Status</th><th>Last 7 days</th><th className="num">Adherence</th></tr>
            </thead>
            <tbody>
              {data?.rows.length ? (
                data.rows.map((p) => {
                  const e = p.episode
                  const pills = []
                  if (e && e.status === 'active') pills.push(<span key="tb" className="pill p-next">TB, {e.phase}</span>)
                  if (e && e.mdr) pills.push(<span key="mdr" className="pill p-red">MDR</span>)
                  if (e && e.status !== 'active') pills.push(<span key="done" className="pill p-done">TB {e.status.replace(/_/g, ' ')}</span>)
                  if (p.admission) pills.push(<span key="adm" className="pill p-amber">{p.admission.bed || p.admission.ward}</span>)
                  if (p.portal) pills.push(<span key="portal" className="pill p-pat"><Person />Portal</span>)
                  return (
                    <tr key={p.code} className="click" onClick={() => navigate(`/patients/${p.code}`)}>
                      <td>{p.name}<span className="sub">{p.code}</span></td>
                      <td>{p.age}, {p.gender?.[0]?.toUpperCase()}</td>
                      <td>{p.facility}</td>
                      <td>{p.doctor || <span className="muted">Unassigned</span>}</td>
                      <td><div className="pills">{pills.length ? pills : <span className="muted">—</span>}</div></td>
                      <td>{p.last7 ? <Strip days={p.last7} light /> : null}</td>
                      <td className="num">{p.adherence != null ? <b style={{ color: band(p.adherence) }}>{p.adherence}%</b> : <span className="muted">—</span>}</td>
                    </tr>
                  )
                })
              ) : data ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty">
                      <span>
                        {q ? `No patients match “${q}”. Check the spelling, or register them as a new patient.` : counts.all ? 'No patients in this group.' : 'No patients registered yet.'}
                      </span>
                      {register ? <Link className="btn primary" to="/patients/new"><Plus />Register patient</Link> : null}
                    </div>
                  </td>
                </tr>
              ) : (
                <tr><td colSpan={7} className="muted">Loading…</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {data ? (
          <div className="pager">
            <span>Showing {data.total ? data.page * data.per + 1 : 0}–{data.page * data.per + data.rows.length} of {data.total}</span>
            <span className="actions">
              <button type="button" className="btn sm" disabled={data.page === 0} onClick={() => setPage(data.page - 1)}><Left />Previous</button>
              <button type="button" className="btn sm" disabled={data.page >= data.pages - 1} onClick={() => setPage(data.page + 1)}>Next<Right /></button>
            </span>
          </div>
        ) : null}
      </section>
    </Page>
  )
}

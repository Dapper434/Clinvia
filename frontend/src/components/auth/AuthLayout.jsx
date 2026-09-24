import { Link } from 'react-router-dom'
import { Mark } from '../ui/icons.jsx'

/** Frame for the public pages: sign-in, sign-up and hospital registration. */
export default function AuthLayout({ title, lead, wide = false, children, footer }) {
  return (
    <div className="cv" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '32px 16px' }}>
      <div style={{ width: `min(${wide ? 720 : 440}px, 100%)`, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Link className="brand" to="/welcome" style={{ padding: 0 }}>
          <span className="brand-mark" aria-hidden="true"><Mark /></span>
          <span><b>Clinvia</b><small>Hospital management and TB care</small></span>
        </Link>
        <section className="fieldset">
          <h3 style={{ fontSize: 20, letterSpacing: '-.015em' }}>{title}</h3>
          {lead ? <p>{lead}</p> : null}
          {children}
        </section>
        {footer ? <div style={{ fontSize: 13, color: 'var(--ink-2)', textAlign: 'center' }}>{footer}</div> : null}
      </div>
    </div>
  )
}

export function Loader() {
  return (
    <div className="cv" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <p className="muted">Loading Clinvia…</p>
    </div>
  )
}

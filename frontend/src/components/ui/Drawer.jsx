import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Close } from './icons.jsx'

/** Side panel for booking, admitting, adding walk-ins and staff. Escape or the scrim closes it. */
export default function Drawer({ title, onClose, footer, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const first = ref.current?.querySelector('input,select,textarea')
    first?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return createPortal(
    <div className="cv" id="drawer-root">
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" ref={ref}>
        <div className="drawer-h">
          <h2 id="drawer-title">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <Close />
          </button>
        </div>
        <div className="drawer-b">{children}</div>
        <div className="drawer-f">{footer}</div>
      </aside>
    </div>,
    document.body,
  )
}

export function FormError({ error }) {
  return error ? (
    <p className="warn" role="alert">
      {error}
    </p>
  ) : null
}

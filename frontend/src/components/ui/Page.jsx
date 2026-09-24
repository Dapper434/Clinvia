import { useEffect } from 'react'
import { useShell } from '../shell/shellContext.js'
import { Menu } from './icons.jsx'

/** The sticky top bar (title, subtitle, actions) and the page body below it. */
export default function Page({ title, sub, actions, children }) {
  const { setMenuOpen } = useShell()
  useEffect(() => {
    document.title = `${title} — Clinvia`
  }, [title])
  return (
    <>
      <header className="top">
        <div className="actions">
          <button type="button" className="btn menu-btn" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
            <Menu />
          </button>
          <h1 id="title">
            {title}
            {sub ? <span>{sub}</span> : null}
          </h1>
        </div>
        <div className="actions">{actions}</div>
      </header>
      <main className="page" id="page">
        {children}
      </main>
    </>
  )
}

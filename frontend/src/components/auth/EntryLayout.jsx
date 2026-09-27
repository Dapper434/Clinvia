import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mark } from '../ui/icons.jsx'
import DoseField from './DoseField.jsx'
import LiveSignal from './LiveSignal.jsx'
import './entry.css'

const SYNC_MIN_GAP_MS = 12000

const MARK_FLASH = {
  teal: [{ boxShadow: '0 0 0 0 rgba(14,124,112,.35)' }, { boxShadow: '0 0 0 6px rgba(14,124,112,0)' }],
  red: [{ boxShadow: '0 0 0 0 rgba(184,58,38,.35)' }, { boxShadow: '0 0 0 7px rgba(184,58,38,0)' }],
}

/**
 * Frame for the landing page and the sign-in pages: the dose calendar field on
 * one side, the page's own content on the other. Sign-up and hospital
 * registration keep AuthLayout. A title may wrap a word in <mark className="entry-mark">;
 * it gets highlighted the moment the field flags a missed streak. The live
 * signal is drawn out of the brand mark and follows the field's story.
 */
export default function EntryLayout({ title, lead, size = 'page', children, footer }) {
  const [isFlagged, setIsFlagged] = useState(false)
  const signalRef = useRef(null)
  const markRef = useRef(null)
  const fieldRef = useRef(null)
  const lastSync = useRef(-Infinity)
  const handleFlagChange = useCallback((flagged) => setIsFlagged(flagged), [])
  const handleStory = useCallback((event) => signalRef.current?.story(event), [])
  const handleEmit = useCallback((pattern, tone) => {
    if (tone !== 'calm') {
      markRef.current?.animate(tone === 'alert' ? MARK_FLASH.red : MARK_FLASH.teal, { duration: 900, easing: 'ease-out' })
      return
    }
    // Signal → detection → event: a quiet waveform leaves the pen and the calendar answers once.
    const now = performance.now()
    if (now - lastSync.current < SYNC_MIN_GAP_MS) return
    if (fieldRef.current?.sync()) lastSync.current = now
  }, [])

  return (
    <div className={`cv entry${isFlagged ? ' is-flagged' : ''}`}>
      <main className="entry-main">
        <div className="entry-top">
          <Link className="brand" to="/welcome" viewTransition>
            <span className="brand-mark" aria-hidden="true" ref={markRef}><Mark /></span>
            <span><b>Clinvia</b><small>Hospital management and TB care</small></span>
          </Link>
          <LiveSignal ref={signalRef} className="entry-signal" onEmit={handleEmit} />
        </div>
        <div className="entry-body">
          <h1 className={`entry-title entry-title-${size}`}>{title}</h1>
          {lead ? <p className="entry-lead">{lead}</p> : null}
          {children}
        </div>
        {footer ? <p className="entry-foot">{footer}</p> : null}
      </main>
      <aside className="entry-field">
        <DoseField ref={fieldRef} onFlagChange={handleFlagChange} onStory={handleStory} />
      </aside>
    </div>
  )
}

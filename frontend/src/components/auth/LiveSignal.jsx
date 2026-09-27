import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { createLiveSignal } from './liveSignalEngine.js'
import './live-signal.css'

/**
 * LiveSignal: Clinvia's monitoring line. A continuous signal drawn left → right
 * from its origin, mostly calm, changing pattern with the system's state.
 * A visual metaphor for continuous monitoring, not a cardiac trace.
 *
 * Props: `state` ('idle' | 'monitoring' | 'anomaly' | 'attention' | 'settling'),
 * `onEmit(pattern, tone)` when a non-calm pattern starts drawing, `className`.
 * Ref API: `story(event)` with 'start' | 'missed' | 'flag' | 'reset', and `setState(state)`.
 */
function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export default function LiveSignal({ ref, state, onEmit, className = '' }) {
  const rootRef = useRef(null)
  const trackRef = useRef(null)
  const engineRef = useRef(null)
  const onEmitRef = useRef(onEmit)
  const [isReduced] = useState(prefersReducedMotion)

  useEffect(() => { onEmitRef.current = onEmit }, [onEmit])

  useEffect(() => {
    const engine = createLiveSignal({
      root: rootRef.current,
      track: trackRef.current,
      isReduced,
      onEmit: (name, tone) => onEmitRef.current?.(name, tone),
    })
    engineRef.current = engine
    return () => { engine.destroy(); engineRef.current = null }
  }, [isReduced])

  useEffect(() => { if (state) engineRef.current?.setState(state) }, [state])

  useImperativeHandle(ref, () => ({
    story: (event) => engineRef.current?.story(event),
    setState: (s) => engineRef.current?.setState(s),
  }), [])

  return (
    <span ref={rootRef} className={`ls${isReduced ? ' is-still' : ''} ${className}`} aria-hidden="true">
      <span ref={trackRef} className="ls-track" />
    </span>
  )
}

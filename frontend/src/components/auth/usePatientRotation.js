import { useCallback, useEffect, useReducer, useRef, useState } from 'react'

/**
 * Clock for the dose calendar's patient rotation. Each patient's month fills
 * in day by day, holds so it can be read, fades, and the next patient begins.
 * The hold only counts down while the visitor isn't reading (`isHeld` false);
 * everything stops while the tab is hidden or the calendar is offscreen.
 * Under reduced motion nothing advances on its own: each patient shows finished.
 */
export const TOTAL_DAYS = 30
const TICK_MS = 60
const START_TICKS = 5
const HOLD_MS = 7000
const FADE_TICKS = 5

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function begin(index, isReduced) {
  return isReduced
    ? { index, day: TOTAL_DAYS, phase: 'hold', ticks: 0 }
    : { index, day: 0, phase: 'fill', ticks: START_TICKS }
}

function reducer(state, action) {
  switch (action.type) {
    case 'tick': {
      if (state.phase === 'fill') {
        if (state.ticks > 0) return { ...state, ticks: state.ticks - 1 }
        const day = state.day + 1
        return day >= TOTAL_DAYS ? { ...state, day: TOTAL_DAYS, phase: 'hold' } : { ...state, day }
      }
      if (state.phase === 'fade') {
        return state.ticks > 1 ? { ...state, ticks: state.ticks - 1 } : begin((state.index + 1) % action.count, false)
      }
      return state
    }
    case 'fade':
      return state.phase === 'hold' ? { ...state, phase: 'fade', ticks: FADE_TICKS } : state
    case 'go':
      return begin((state.index + action.delta + action.count) % action.count, action.isReduced)
    default:
      return state
  }
}

export default function usePatientRotation({ count, targetRef, isHeld }) {
  const [isReduced] = useState(prefersReducedMotion)
  const [state, dispatch] = useReducer(reducer, 0, (i) => begin(i, isReduced))
  const [isVisible, setIsVisible] = useState(true)
  const stateRef = useRef(state)
  const heldRef = useRef(isHeld)
  const holdLeft = useRef(HOLD_MS)

  useEffect(() => { stateRef.current = state }, [state])
  useEffect(() => { heldRef.current = isHeld }, [isHeld])
  useEffect(() => { if (state.phase === 'hold') holdLeft.current = HOLD_MS }, [state.phase, state.index])

  // Stop the clock while nobody can see the calendar.
  useEffect(() => {
    const el = targetRef.current
    let onScreen = true
    const update = () => setIsVisible(onScreen && !document.hidden)
    const io = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; update() })
    if (el) io.observe(el)
    document.addEventListener('visibilitychange', update)
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', update) }
  }, [targetRef])

  // One interval drives fill and fade; the hold counts down in a ref so it doesn't re-render.
  useEffect(() => {
    if (isReduced || !isVisible) return undefined
    const id = setInterval(() => {
      const { phase } = stateRef.current
      if (phase !== 'hold') {
        dispatch({ type: 'tick', count })
        return
      }
      if (heldRef.current) return
      holdLeft.current -= TICK_MS
      if (holdLeft.current <= 0) dispatch({ type: 'fade' })
    }, TICK_MS)
    return () => clearInterval(id)
  }, [count, isReduced, isVisible])

  const go = useCallback((delta) => dispatch({ type: 'go', delta, count, isReduced }), [count, isReduced])

  return { ...state, isReduced, isRunning: !isReduced && isVisible && !isHeld, holdMs: HOLD_MS, go }
}

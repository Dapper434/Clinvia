/**
 * LiveSignal engine: a continuous strip of waveform segments that travels
 * left → right. New segments are emitted at the left (the "pen"), old ones
 * drift off to the right and are dropped. Every pattern starts and ends on the
 * baseline, so the strip reads as one unbroken signal. Plain DOM + one rAF loop
 * that only writes a transform; paused while hidden or offscreen.
 */
const NS = 'http://www.w3.org/2000/svg'
const HEIGHT = 24
const SPEED_PX_PER_S = 56
const MAX_FRAME_MS = 50
const SEAM = 0.6

/** Waveform library. 24px tall, baseline at y=12; each path spans exactly `w`. */
export const PATTERNS = {
  baseline: { w: 40, d: 'M0 12H40' },
  single: { w: 72, d: 'M0 12H30L34 7.5L38.5 15L41 12H72' },
  double: { w: 92, d: 'M0 12H24L28 6L32.5 15.5L35 12H46L50 5L54.5 16L57 12H92' },
  rhythmic: { w: 132, d: 'M0 12H14C16 12 17 10.5 19 10.5S22 12 24 12H27L30 6L33.5 15L36 12H56C58 12 59 10.5 61 10.5S64 12 66 12H69L72 6L75.5 15L78 12H132' },
  rapid: { w: 100, d: 'M0 12H16L19 7L22 15.5L25 8L28 15L31 9L34 14.5L37 10.5L40 12H100' },
  long: { w: 120, d: 'M0 12H26C38 12 42 4 52 4S66 17 76 15C82 13.5 86 12 94 12H120' },
  attention: {
    w: 176,
    d: 'M0 12H12L16 6L20 15.5L23 12H32L36 3L41 20L45 12H50L53 7.5L57 15L60 12H76L80 5L84.5 17.5L88 12H94L97 8.5L100 14.5L103 12H116L120 6.5L124 15.5L127 12H176',
  },
}

/** What each state draws when nothing is queued: mostly calm, with designed pauses. */
const CYCLES = {
  idle: ['baseline', 'baseline', 'baseline', 'single', 'baseline', 'baseline', 'baseline', 'baseline', 'double', 'baseline', 'baseline', 'baseline', 'long', 'baseline', 'baseline', 'baseline'],
  monitoring: ['baseline', 'single', 'baseline', 'baseline', 'rhythmic', 'baseline', 'baseline', 'double', 'baseline'],
  anomaly: ['baseline'],
  attention: ['baseline'],
  settling: ['baseline'],
}
const SETTLE_SEGMENTS = 5

/** A pattern segment; baseline may be cut to any width (flat line reads the same). */
function makeSegment(name, tone, width) {
  const w = width ?? PATTERNS[name].w
  const body = name === 'baseline' ? `M0 12H${w}` : PATTERNS[name].d
  // Overlap neighbours by a hair so sub-pixel joins never show as seams.
  const d = `${body.replace(/^M0 12/, `M-${SEAM} 12`)}H${w + SEAM}`
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('width', String(w))
  svg.setAttribute('height', String(HEIGHT))
  svg.setAttribute('viewBox', `0 0 ${w} ${HEIGHT}`)
  svg.setAttribute('class', `ls-seg ls-${tone}`)
  svg.dataset.pattern = name
  const path = document.createElementNS(NS, 'path')
  path.setAttribute('d', d)
  svg.appendChild(path)
  return { el: svg, w }
}

export function createLiveSignal({ root, track, isReduced, onEmit }) {
  let state = 'idle'
  let cycleIndex = 0
  let settleLeft = 0
  let priority = []
  let lastMissed = -Infinity
  let widths = []
  let x = 0
  let containerW = root.clientWidth
  let frame = 0
  let last = 0
  let isVisible = true

  const setState = (next) => {
    if (state === next) return
    state = next
    cycleIndex = 0
    root.dataset.state = next
  }

  const nextSegment = () => {
    if (priority.length) {
      const item = priority.shift()
      if (item.then) item.then()
      return item
    }
    if (state === 'settling') {
      settleLeft -= 1
      if (settleLeft <= 0) setState('idle')
      return { name: 'baseline', tone: 'calm' }
    }
    const cycle = CYCLES[state]
    const name = cycle[cycleIndex % cycle.length]
    cycleIndex += 1
    return { name, tone: 'calm' }
  }

  const emit = () => {
    const { name, tone } = nextSegment()
    const seg = makeSegment(name, tone)
    track.prepend(seg.el)
    widths.unshift(seg.w)
    if (name !== 'baseline') onEmit?.(name, tone)
    return seg.w
  }

  const prune = () => {
    let left = x + widths.reduce((a, b) => a + b, 0)
    while (widths.length > 1) {
      const w = widths[widths.length - 1]
      left -= w
      if (left <= containerW) break
      widths.pop()
      track.lastChild?.remove()
    }
  }

  // An event should not wait behind flat line: cut the baseline being drawn at the pen.
  const cutAtPen = () => {
    const first = track.firstChild
    if (!first || first.dataset.pattern !== 'baseline' || x >= 0) return
    const drawn = widths[0] + x
    if (drawn < 1) return
    first.replaceWith(makeSegment('baseline', 'calm', drawn).el)
    widths[0] = drawn
    x = 0
  }

  const draw = () => { track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)` }

  // Fill the viewport with calm baseline so the line is there from the first frame.
  const prefill = () => {
    track.replaceChildren()
    widths = []
    let filled = 0
    while (filled < containerW + PATTERNS.baseline.w) {
      const seg = makeSegment('baseline', 'calm')
      track.appendChild(seg.el)
      widths.push(seg.w)
      filled += seg.w
    }
    x = -PATTERNS.baseline.w
    draw()
  }

  // Reduced motion: a still line with one quiet pattern held a short way along it.
  const renderStill = () => {
    track.replaceChildren()
    const lead = makeSegment('baseline', 'calm')
    const mark = makeSegment('double', 'calm')
    track.append(lead.el, mark.el)
    let filled = lead.w + mark.w
    while (filled < containerW) {
      const seg = makeSegment('baseline', 'calm')
      track.appendChild(seg.el)
      filled += seg.w
    }
    x = 0
    draw()
  }

  const tick = (now) => {
    const dt = Math.min(MAX_FRAME_MS, now - last)
    last = now
    x += (SPEED_PX_PER_S * dt) / 1000
    while (x >= 0) x -= emit()
    prune()
    draw()
    frame = requestAnimationFrame(tick)
  }

  const start = () => {
    if (isReduced || frame || !isVisible) return
    last = performance.now()
    frame = requestAnimationFrame(tick)
  }
  const stop = () => { cancelAnimationFrame(frame); frame = 0 }

  /** Product-story events from the dose field. */
  const story = (event) => {
    if (isReduced) return
    if (event === 'start') {
      priority = []
      if (state === 'idle' || state === 'settling') setState('monitoring')
    } else if (event === 'missed') {
      const now = performance.now()
      if (state !== 'monitoring' || priority.length || now - lastMissed < 1800) return
      lastMissed = now
      setState('anomaly')
      priority = [{ name: 'double', tone: 'event', then: () => setTimeout(() => state === 'anomaly' && setState('monitoring'), 900) }]
      cutAtPen()
    } else if (event === 'flag') {
      setState('attention')
      priority = [
        { name: 'attention', tone: 'alert', then: () => { settleLeft = SETTLE_SEGMENTS; setTimeout(() => setState('settling'), 1600) } },
      ]
      cutAtPen()
    } else if (event === 'reset') {
      priority = []
      setState('idle')
    }
  }

  const resize = new ResizeObserver(() => {
    containerW = root.clientWidth
    if (isReduced) renderStill()
  })
  const io = new IntersectionObserver(([entry]) => {
    isVisible = entry.isIntersecting
    if (isVisible) start()
    else stop()
  })

  root.dataset.state = state
  if (isReduced) renderStill()
  else prefill()
  resize.observe(root)
  io.observe(root)
  start()

  return {
    story,
    setState: (s) => { if (!isReduced && CYCLES[s]) setState(s) },
    destroy: () => { stop(); resize.disconnect(); io.disconnect() },
  }
}

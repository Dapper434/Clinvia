import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import NumberFlow from '@number-flow/react'
import { Left, Right } from '../ui/icons.jsx'
import usePatientRotation, { TOTAL_DAYS } from './usePatientRotation.js'
import {
  BAND_TEXT, PATIENTS, STATUS_TEXT, STREAK_ALERT, WEEKDAYS,
  addDays, adherence, band, format, isSameDay, isSameMonth, missedStreak, monthCells, startOfMonth, today, windowIndex,
} from './doseCalendar.js'
import './dose-calendar.css'

/**
 * The public pages' brand field: a TB dose calendar that rotates through a few
 * sample patients. Each patient's last 30 days play in on a real month grid —
 * doses arrive, a missed streak is detected with the clinic rule (2 or more in
 * a row), and the next patient follows. Pauses while the visitor is reading.
 */
const COUNT_TIMING = { duration: 750, easing: 'cubic-bezier(.16,1,.3,1)' }
const SYNC_DELAY_MS = 220
const SYNC_STAGGER_MS = 70
const SYNC_RECENT = 7
const GLOW = [
  { filter: 'brightness(1)', boxShadow: '0 0 0 0 rgba(255,255,255,0)' },
  { filter: 'brightness(1.5)', boxShadow: '0 0 0 3px rgba(255,255,255,.14)', offset: 0.35 },
  { filter: 'brightness(1)', boxShadow: '0 0 0 0 rgba(255,255,255,0)' },
]
const KEY_STEP = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }

/** One quiet answer to the live signal: the last week's dose markers light up in turn, today last. */
function pulseRecent(figure) {
  const dots = [...figure.querySelectorAll('.df-day.on .df-dot')].slice(-SYNC_RECENT)
  dots.forEach((dot, i) => dot.animate(GLOW, { duration: 900, easing: 'ease-out', delay: SYNC_DELAY_MS + i * SYNC_STAGGER_MS }))
}

function dayLabel(date, code, isToday) {
  const status = code ? STATUS_TEXT[code] : 'No dose data'
  return `${format(date, 'EEEE d MMMM')}${isToday ? ', today' : ''}: ${status}`
}

function Header({ patient, index, now, pct, phase, isRunning, holdMs, onStep }) {
  const bandKey = band(pct)
  return (
    <figcaption className="df-head">
      <div className="df-title">
        <b>TB dose calendar</b>
        <span>{format(now, 'MMMM yyyy')} · last 30 days</span>
      </div>
      <div className="df-nav">
        <button type="button" className="df-step" aria-label="Previous patient" onClick={() => onStep(-1)}><Left /></button>
        <span className="df-who" aria-live="polite">{patient.code}</span>
        <button type="button" className="df-step" aria-label="Next patient" onClick={() => onStep(1)}><Right /></button>
      </div>
      <div className="df-score">
        <span className={`df-pct b-${bandKey}`}>
          {pct === null ? '—' : <NumberFlow value={pct} suffix="%" transformTiming={COUNT_TIMING} spinTiming={COUNT_TIMING} />}
        </span>
        <span>adherence{BAND_TEXT[bandKey] ? <> · <em className={`b-${bandKey}`}>{BAND_TEXT[bandKey]}</em></> : null}</span>
      </div>
      <span className={`df-prog${isRunning ? '' : ' is-paused'}`} style={{ '--hold': `${holdMs}ms` }} aria-hidden="true">
        {PATIENTS.map((p, i) => (
          <i key={p.code} className={i === index ? `on is-${phase}` : undefined} />
        ))}
      </span>
    </figcaption>
  )
}

function MonthGrid({ patient, now, day, isFilling, streakFrom, selected, onSelect }) {
  const gridRef = useRef(null)
  const month = startOfMonth(now)
  const cells = monthCells(month, now)
  const first = cells[0]
  const last = cells[cells.length - 1]
  const tabDate = selected >= first && selected <= last ? selected : month

  const handleKey = (e) => {
    const step = KEY_STEP[e.key]
    if (!step) return
    e.preventDefault()
    const next = addDays(selected, step)
    if (next < first || next > last) return
    onSelect(next)
    requestAnimationFrame(() => gridRef.current?.querySelector(`[data-date="${format(next, 'yyyy-MM-dd')}"]`)?.focus())
  }

  return (
    <div className="df-cal">
      <div className="df-wk" aria-hidden="true">{WEEKDAYS.map((w) => <span key={w}>{w}</span>)}</div>
      <div className="df-days" role="group" aria-label={`${patient.code}, ${format(month, 'MMMM yyyy')}`} ref={gridRef} onKeyDown={handleKey}>
        {cells.map((date, i) => {
          const idx = windowIndex(date, now)
          const code = idx >= 0 ? patient.days[idx] : null
          const isOn = idx >= 0 && idx < day
          const isToday = isSameDay(date, now)
          const inStreak = streakFrom !== null && idx >= streakFrom && idx < day
          const col = i % 7
          const classes = [
            'df-day',
            idx < 0 && 'is-out',
            !isSameMonth(date, month) && 'is-other',
            isOn && 'on',
            code && `c-${code === '.' ? 'n' : code}`,
            isToday && 'is-today',
            isSameDay(date, selected) && 'is-sel',
            isFilling && idx === day - 1 && 'is-head',
            inStreak && 'in-streak',
            inStreak && (idx === streakFrom || col === 0) && 'streak-start',
            inStreak && (idx === day - 1 || col === 6) && 'streak-end',
          ].filter(Boolean).join(' ')
          return (
            <button
              key={date.toISOString()}
              type="button"
              className={classes}
              data-date={format(date, 'yyyy-MM-dd')}
              style={inStreak ? { '--si': idx - streakFrom } : undefined}
              tabIndex={isSameDay(date, tabDate) ? 0 : -1}
              aria-pressed={isSameDay(date, selected)}
              aria-current={isToday ? 'date' : undefined}
              aria-label={dayLabel(date, isOn ? code : null, isToday)}
              onClick={() => onSelect(date)}
            >
              <span className="df-num">{isSameMonth(date, month) ? format(date, 'd') : format(date, 'd MMM')}</span>
              <i className="df-dot" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Detail({ patient, date, now, day }) {
  const idx = windowIndex(date, now)
  const code = idx >= 0 && idx < day ? patient.days[idx] : null
  const text = idx < 0 ? 'Outside this 30-day view' : code ? STATUS_TEXT[code] : 'Not logged yet'
  return (
    <p className="df-detail" key={`${patient.code}-${format(date, 'yyyy-MM-dd')}`}>
      <time dateTime={format(date, 'yyyy-MM-dd')}>{format(date, 'd MMM')}</time>
      {isSameDay(date, now) ? <span className="df-detail-today">Today</span> : null}
      <i className={`df-dot c-${code ? (code === '.' ? 'n' : code) : 'x'}`} />
      <span>{text}</span>
    </p>
  )
}

/** The detection first, then the patient's own event for today, in one reserved space. */
function Feed({ patient, streak, showEvent }) {
  return (
    <ol className="df-feed" aria-live="polite">
      {streak >= STREAK_ALERT ? (
        <li key={`${patient.code}-flag`} className="df-ev df-ev-flag">
          <b>{patient.code}</b> missed {streak} doses in a row. They&apos;re on today&apos;s needs-attention list.
        </li>
      ) : null}
      {showEvent ? (
        <li key={`${patient.code}-event`} className={`df-ev df-ev-${patient.event.tone}`}>
          <b>{patient.code}</b> {patient.event.text}
        </li>
      ) : null}
    </ol>
  )
}

export default function DoseField({ ref, onFlagChange, onStory }) {
  const figureRef = useRef(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const { index, day, phase, isReduced, isRunning, holdMs, go } = usePatientRotation({
    count: PATIENTS.length,
    targetRef: figureRef,
    isHeld: isHovered || isFocused,
  })
  const [now] = useState(today)
  const [selected, setSelected] = useState(now)
  const patient = PATIENTS[index]

  const seen = patient.days.slice(0, day)
  const pct = adherence(seen)
  const streak = missedStreak(seen)
  const isFlagged = streak >= STREAK_ALERT
  const streakFrom = isFlagged ? seen.replace(/\.+$/, '').length - streak : null
  const isFilling = phase === 'fill'
  const isDone = !isFilling && day === TOTAL_DAYS

  useImperativeHandle(ref, () => ({
    /** Returns whether the field responded (only while a patient is being read, never under reduced motion). */
    sync: () => {
      if (isReduced || phase !== 'hold' || !figureRef.current) return false
      pulseRecent(figureRef.current)
      return true
    },
  }), [isReduced, phase])

  useEffect(() => { onFlagChange?.(isFlagged) }, [isFlagged, onFlagChange])

  // Tell the live signal what the field just saw.
  useEffect(() => {
    if (isReduced || day === 0) return
    if (day === 1) onStory?.('start')
    if (patient.days[day - 1] === 'm') onStory?.('missed')
  }, [day, patient, isReduced, onStory])
  useEffect(() => {
    if (isFlagged && !isReduced) onStory?.('flag')
  }, [isFlagged, isReduced, onStory])
  useEffect(() => {
    if (phase === 'fade') onStory?.('reset')
  }, [phase, onStory])

  const stateClass = [
    isDone && 'is-done',
    isReduced && 'is-static',
    isFlagged && 'has-flag',
    phase === 'fade' && 'is-resetting',
  ].filter(Boolean).map((c) => ` ${c}`).join('')

  return (
    <figure
      ref={figureRef}
      className={`df${stateClass}`}
      aria-label="Sample TB dose calendars, rotating through patients"
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsFocused(false) }}
    >
      <Header patient={patient} index={index} now={now} pct={pct} phase={phase} isRunning={isRunning} holdMs={holdMs} onStep={go} />
      <div className="df-grid">
        <MonthGrid patient={patient} now={now} day={day} isFilling={isFilling} streakFrom={streakFrom} selected={selected} onSelect={setSelected} />
      </div>
      <Detail patient={patient} date={selected} now={now} day={day} />
      <Feed patient={patient} streak={streak} showEvent={!isFilling} />
      <dl className="df-legend" aria-label="Dose markers">
        <div><dt><i className="c-t" /></dt><dd>Observed by staff</dd></div>
        <div><dt><i className="c-p" /></dt><dd>Patient check-in</dd></div>
        <div><dt><i className="c-m" /></dt><dd>Missed</dd></div>
      </dl>
      <small className="df-note">Illustration with sample data, not real patients.</small>
    </figure>
  )
}

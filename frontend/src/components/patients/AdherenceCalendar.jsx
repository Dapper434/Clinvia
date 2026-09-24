import { useEffect, useRef } from 'react'
import { addDays, differenceInCalendarDays, format, parseISO, isAfter, isBefore, startOfDay } from 'date-fns'

const TREATMENT_DAYS = 180

export default function AdherenceCalendar({ treatmentStart, doseLogs, subtitle }) {
  const gridRef = useRef(null)
  const todayRef = useRef(null)

  // Scroll only the grid (not the page) so today's cell is in view.
  useEffect(() => {
    const grid = gridRef.current
    const cell = todayRef.current
    if (grid && cell) {
      grid.scrollTop = cell.offsetTop - grid.clientHeight / 2
    }
  }, [treatmentStart, doseLogs])

  if (!treatmentStart) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-500">
        No treatment start date provided.
      </div>
    )
  }

  const start = startOfDay(parseISO(treatmentStart))
  const today = startOfDay(new Date())
  const standardEnd = addDays(start, TREATMENT_DAYS - 1)
  // Treatment often runs past the standard cycle (extensions, MDR regimens);
  // extend through today so recent logs stay visible instead of vanishing.
  const extended = isAfter(today, standardEnd)
  const end = extended ? today : standardEnd
  const todayKey = format(today, 'yyyy-MM-dd')

  const byDate = new Map()
  for (const row of doseLogs ?? []) {
    byDate.set(row.date, row.taken)
  }

  const totalCells = differenceInCalendarDays(end, start) + 1
  const cells = []
  for (let i = 0; i < totalCells; i += 1) {
    const d = addDays(start, i)
    const key = format(d, 'yyyy-MM-dd')
    const future = isAfter(d, today)
    const beforeStart = isBefore(d, start)
    let tone
    let label
    if (beforeStart) {
      tone = 'bg-gray-50 border-gray-100'
      label = '—'
    } else if (future) {
      tone = 'bg-gray-100 border-gray-200'
      label = 'Future'
    } else if (byDate.has(key)) {
      const taken = byDate.get(key)
      tone = taken
        ? 'bg-green-200 border-green-300'
        : 'bg-red-200 border-red-300'
      label = taken ? 'Taken' : 'Missed'
    } else {
      tone = 'bg-gray-200 border-gray-300'
      label = 'No log'
    }
    cells.push({ key, day: format(d, 'd'), tone, label, isToday: key === todayKey })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Adherence calendar</h3>
          <p className="text-xs text-gray-500">
            {format(start, 'MMM d, yyyy')} — {format(end, 'MMM d, yyyy')} · {totalCells} days
            {extended ? ` (past the standard ${TREATMENT_DAYS}-day cycle)` : ''}
            {subtitle ? ` · ${subtitle}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm bg-green-200 ring-1 ring-green-300" /> Taken
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm bg-red-200 ring-1 ring-red-300" /> Missed
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm bg-gray-200 ring-1 ring-gray-300" /> No log
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm bg-gray-100 ring-1 ring-gray-200" /> Future
          </span>
        </div>
      </div>
      <div
        ref={gridRef}
        className="relative mt-4 grid max-h-64 grid-cols-[repeat(20,minmax(0,1fr))] gap-1 overflow-auto p-0.5 sm:grid-cols-[repeat(30,minmax(0,1fr))]"
      >
        {cells.map((c) => (
          <div
            key={c.key}
            ref={c.isToday ? todayRef : undefined}
            title={`${c.key}: ${c.isToday ? 'Today · ' : ''}${c.label}`}
            className={`flex h-7 items-center justify-center rounded border text-[10px] font-medium text-gray-800 ${c.tone} ${
              c.isToday ? 'ring-2 ring-teal-600 ring-offset-1' : ''
            }`}
          >
            {c.day}
          </div>
        ))}
      </div>
    </div>
  )
}

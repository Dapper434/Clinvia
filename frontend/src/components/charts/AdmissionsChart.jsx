import { fmt } from '../../utils/format.js'

/** Admitted vs discharged per Monday-start week; this (partial) week is drawn dotted. */
export default function AdmissionsChart({ weeks }) {
  const W = 560, H = 210, pl = 30, pr = 10, pt = 16, pb = 26
  const rows = weeks.map((w) => [w.week, w.admitted, w.discharged])
  const max = Math.max(10, Math.ceil(Math.max(...rows.flatMap((w) => [w[1], w[2]])) / 10) * 10)
  const x = (i) => pl + (i * (W - pl - pr)) / (rows.length - 1)
  const y = (v) => pt + (H - pt - pb) * (1 - v / max)
  const last = rows.length - 1
  const path = (k) => rows.slice(0, -1).map((w, i) => `${i ? 'L' : 'M'}${x(i)},${y(w[k])}`).join(' ')
  const grid = []
  for (let v = 0; v <= max; v += 10) grid.push(v)
  const first = rows[0][1]
  const peak = rows.slice(0, -1).reduce((m, w) => Math.max(m, w[1]), 0)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Admissions per week ranged from ${first} to a peak of ${peak}`}>
      {grid.map((v) => (
        <g key={v}>
          <line x1={pl} x2={W - pr} y1={y(v)} y2={y(v)} stroke="#EAF0EE" />
          <text x={pl - 8} y={y(v) + 4} textAnchor="end">{v}</text>
        </g>
      ))}
      {rows.map((w, i) => (
        <text key={w[0]} x={x(i)} y={H - 6} textAnchor="middle">{i === last ? 'This week' : fmt(w[0])}</text>
      ))}
      <path d={path(1)} fill="none" stroke="#0E7C70" strokeWidth="2.4" strokeLinejoin="round" />
      <path d={`M${x(last - 1)},${y(rows[last - 1][1])} L${x(last)},${y(rows[last][1])}`} stroke="#0E7C70" strokeWidth="2" strokeDasharray="2 4" fill="none" />
      <path d={path(2)} fill="none" stroke="#4D625D" strokeWidth="1.8" strokeDasharray="5 4" />
      <path d={`M${x(last - 1)},${y(rows[last - 1][2])} L${x(last)},${y(rows[last][2])}`} stroke="#4D625D" strokeWidth="1.6" strokeDasharray="2 4" fill="none" />
      {rows.map((w, i) => (
        <circle key={w[0]} cx={x(i)} cy={y(w[1])} r="3.4" fill={i === last ? '#fff' : '#0E7C70'} stroke="#0E7C70" strokeWidth="1.6" />
      ))}
    </svg>
  )
}

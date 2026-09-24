/** TB doses per day: taken, missed, and a dashed box for doses not logged yet. */
export default function DoseChart({ days }) {
  const W = 560, H = 210, pl = 30, pr = 10, pt = 12, pb = 26, n = days.length
  const max = Math.max(...days.map((d) => d.expected), 1)
  const bw = 40
  const gap = (W - pl - pr - n * bw) / (n - 1)
  const y = (v) => pt + (H - pt - pb) * (1 - v / max)
  const h = (v) => (H - pt - pb) * (v / max)
  const step = max > 8 ? 4 : 2
  const grid = []
  for (let v = 0; v <= max; v += step) grid.push(v)
  const missed = days.reduce((s, d) => s + d.missed, 0)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${missed} TB doses missed in the last 7 days`}>
      {grid.map((v) => (
        <g key={v}>
          <line x1={pl} x2={W - pr} y1={y(v)} y2={y(v)} stroke="#EAF0EE" />
          <text x={pl - 8} y={y(v) + 4} textAnchor="end">{v}</text>
        </g>
      ))}
      {days.map((d, i) => {
        const x = pl + i * (bw + gap)
        const open = d.expected - d.taken - d.missed
        return (
          <g key={d.date}>
            <rect x={x} y={y(d.taken)} width={bw} height={h(d.taken)} rx="3" fill="#0E7C70" />
            <rect x={x} y={y(d.taken + d.missed)} width={bw} height={h(d.missed)} fill="#B83A26" />
            {open > 0 ? (
              <>
                <rect x={x + 0.5} y={y(d.expected) + 0.5} width={bw - 1} height={Math.max(0, h(open) - 1)} rx="3" fill="none" stroke="#7F918C" strokeDasharray="3 3" />
                <text x={x + bw / 2} y={y(d.expected) + h(open) / 2 + 4} textAnchor="middle">{open} left</text>
              </>
            ) : null}
            <text x={x + bw / 2} y={H - 6} textAnchor="middle" style={d.label === 'Today' ? { fill: '#16302B', fontWeight: 600 } : undefined}>
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

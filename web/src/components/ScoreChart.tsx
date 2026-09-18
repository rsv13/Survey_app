// A small, theme-aware line chart of total score (14–70) over time.
// It's a single series, so there's no legend — the card title names it — and
// colours come from our CSS theme tokens so light/dark just work.

type Point = { date: string; score: number }

const W = 680
const H = 260
const PAD = { top: 16, right: 18, bottom: 30, left: 38 }
const Y_MIN = 14
const Y_MAX = 70
const GRID = [14, 28, 42, 56, 70] // evenly spaced reference lines

export function ScoreChart({ points }: { points: Point[] }) {
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const xFor = (i: number) =>
    points.length <= 1 ? PAD.left + plotW / 2 : PAD.left + (i / (points.length - 1)) * plotW
  const yFor = (score: number) =>
    PAD.top + (1 - (score - Y_MIN) / (Y_MAX - Y_MIN)) * plotH

  const line = points.map((p, i) => `${xFor(i)},${yFor(p.score)}`).join(' ')
  const fmt = (iso: string) => {
    const n = Number(iso)
    const d = new Date(Number.isNaN(n) ? iso : n)
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
      aria-label="Your total well-being score over time"
      style={{ height: 'auto' }}>
      {/* gridlines + y labels */}
      {GRID.map((g) => (
        <g key={g}>
          <line x1={PAD.left} x2={W - PAD.right} y1={yFor(g)} y2={yFor(g)}
            stroke="var(--border)" strokeWidth={1} />
          <text x={PAD.left - 8} y={yFor(g) + 4} textAnchor="end"
            fontSize={11} fill="var(--muted)">{g}</text>
        </g>
      ))}

      {/* the line (only when there's more than one point) */}
      {points.length > 1 && (
        <polyline points={line} fill="none" stroke="var(--calm)" strokeWidth={2}
          strokeLinejoin="round" strokeLinecap="round" />
      )}

      {/* point markers with a native hover tooltip */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={xFor(i)} cy={yFor(p.score)} r={4.5}
            fill="var(--calm-deep)" stroke="var(--surface)" strokeWidth={2}>
            <title>{fmt(p.date)}: {p.score}</title>
          </circle>
          {/* x-axis date label */}
          <text x={xFor(i)} y={H - 10} textAnchor="middle" fontSize={11} fill="var(--muted)">
            {fmt(p.date)}
          </text>
        </g>
      ))}

      {/* direct-label the latest score */}
      {points.length > 0 && (
        <text x={xFor(points.length - 1)} y={yFor(points[points.length - 1].score) - 10}
          textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--ink)">
          {points[points.length - 1].score}
        </text>
      )}
    </svg>
  )
}

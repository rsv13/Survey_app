import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@apollo/client/react'
import { MY_RESPONSES } from '../graphql-survey'
import { ScoreChart } from '../components/ScoreChart'

type Subscale = { factor: number; name: string; score: number }
type Response = { id: string; totalScore: number; createdAt: string; subscaleScores: Subscale[] }
type Data = { surveyResponses: Response[] }

// Parse a date that may arrive as an ISO string or epoch-millis string.
function parseDate(v: string): Date {
  const n = Number(v)
  return new Date(Number.isNaN(n) ? v : n)
}
const fmtLong = (v: string) =>
  parseDate(v).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })

export default function MyResults() {
  const { data, loading, error } = useQuery<Data>(MY_RESPONSES, { fetchPolicy: 'cache-and-network' })

  // Sort oldest→newest for the chart; the latest is the last entry.
  const chrono = useMemo(
    () => [...(data?.surveyResponses ?? [])].sort(
      (a, b) => parseDate(a.createdAt).getTime() - parseDate(b.createdAt).getTime()),
    [data],
  )
  const latest = chrono.length ? chrono[chrono.length - 1] : null

  if (loading && !data) {
    return <div className="mx-auto max-w-3xl px-5 py-16 text-ink-2">Loading your results…</div>
  }
  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 text-brand-strong">
        Couldn’t load your results. Please make sure you’re signed in and try again.
      </div>
    )
  }

  // No submissions yet.
  if (!latest) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="text-3xl font-semibold text-ink">Your results</h1>
        <p className="mt-4 text-ink-2">You haven’t completed the survey yet.</p>
        <Link to="/survey"
          className="mt-8 inline-block rounded-xl bg-calm-deep px-6 py-3 font-semibold text-white transition hover:bg-calm">
          Take the survey
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-3xl font-semibold text-ink">Your results</h1>
      <p className="mt-2 text-ink-2">
        The scale runs from 14 to 70 — a higher score reflects greater social well-being.
      </p>

      {/* Latest score + subscales */}
      <div className="mt-8 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="inline-flex flex-col items-center rounded-2xl border border-border bg-surface px-8 py-6 shadow-sm">
          <span className="text-xs font-medium uppercase tracking-widest text-muted">Latest total</span>
          <span className="mt-1 text-5xl font-semibold text-calm-deep">{latest.totalScore}</span>
          <span className="text-sm text-muted">of 70 · {fmtLong(latest.createdAt)}</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {latest.subscaleScores.map((s) => (
            <div key={s.factor} className="rounded-xl border border-border bg-surface px-4 py-3">
              <div className="text-xs text-muted">{s.name}</div>
              <div className="text-lg font-semibold text-ink">{s.score}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Score over time */}
      <section className="mt-10 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">Your score over time</h2>
        <p className="mt-1 text-sm text-muted">
          {chrono.length === 1 ? 'Your first submission.' : `${chrono.length} submissions.`}
        </p>
        <div className="mt-4">
          <ScoreChart points={chrono.map((r) => ({ date: r.createdAt, score: r.totalScore }))} />
        </div>
      </section>

      {/* History table (also serves as the accessible table view of the chart) */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink">History</h2>
        <div className="mt-3 overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-2 text-ink-2">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Total</th>
                {latest.subscaleScores.map((s) => (
                  <th key={s.factor} className="px-4 py-2 font-medium">{s.name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {[...chrono].reverse().map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2 text-ink-2">{fmtLong(r.createdAt)}</td>
                  <td className="px-4 py-2 font-semibold text-ink">{r.totalScore}</td>
                  {r.subscaleScores.map((s) => (
                    <td key={s.factor} className="px-4 py-2 text-ink-2">{s.score}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

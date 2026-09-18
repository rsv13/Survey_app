import { useState } from 'react'
import { useQuery } from '@apollo/client/react'
import { useAuth } from '../auth-context'
import { apolloClient } from '../apollo'
import { MY_GROUPS } from '../graphql-groups'
import { GROUP_ANALYTICS, DEMOGRAPHIC_BREAKDOWN, EXPORT_CSV } from '../graphql-analytics'

// ---- Types ----
type Stat = { mean: number; sd: number; ci95Lower: number; ci95Upper: number; min: number; max: number }
type Bin = { label: string; from: number; to: number; count: number }
type Factor = { factor: number; name: string; mean: number }
type Item = { order: number; text: string; factor: number | null; mean: number; n: number }
type AnalyticsData = {
  groupAnalytics: {
    responseCount: number; participantCount: number
    totalScore: Stat; distribution: Bin[]; subscales: Factor[]; items: Item[]
  }
}
type Segment = { label: string; n: number; suppressed: boolean; mean: number | null; ci95Lower: number | null; ci95Upper: number | null }
type DemoData = { demographicBreakdown: { dimension: string; segments: Segment[] } }
type GroupsData = { myGroups: { id: string; name: string }[] }

const DIMENSIONS: [string, string][] = [
  ['SECTOR', 'Sector'], ['AGE_GROUP', 'Age group'], ['GENDER', 'Gender'], ['EDUCATION', 'Education'],
]
const r1 = (n: number) => n.toFixed(1)

export default function Analytics() {
  const { user } = useAuth()
  const canView = user?.role === 'ADMIN' || user?.role === 'GROUP_ADMIN'

  const [groupId, setGroupId] = useState('') // '' = all groups I administer
  const [dimension, setDimension] = useState('SECTOR')
  const [exporting, setExporting] = useState(false)

  const groups = useQuery<GroupsData>(MY_GROUPS, { skip: !canView })
  const analytics = useQuery<AnalyticsData>(GROUP_ANALYTICS, {
    variables: { groupId: groupId || null }, skip: !canView, fetchPolicy: 'cache-and-network',
  })
  const demo = useQuery<DemoData>(DEMOGRAPHIC_BREAKDOWN, {
    variables: { dimension, groupId: groupId || null }, skip: !canView, fetchPolicy: 'cache-and-network',
  })

  async function downloadCsv() {
    setExporting(true)
    try {
      const { data } = await apolloClient.query<{ exportResponsesCsv: string }>({
        query: EXPORT_CSV, variables: { groupId: groupId || null }, fetchPolicy: 'network-only',
      })
      const csv = data?.exportResponsesCsv ?? ''
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `swswbs-responses-${groupId || 'all'}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  if (!canView) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="text-3xl font-semibold text-ink">Analytics</h1>
        <p className="mt-4 text-ink-2">This area is for group admins and site admins.</p>
      </div>
    )
  }

  const a = analytics.data?.groupAnalytics
  const maxCount = a ? Math.max(1, ...a.distribution.map((b) => b.count)) : 1

  return (
    <div className="mx-auto max-w-4xl px-5 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-ink">Analytics</h1>
          <p className="mt-1 text-ink-2">Aggregated, anonymised results for your group(s).</p>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-muted" htmlFor="group">Group</label>
            <select id="group" value={groupId} onChange={(e) => setGroupId(e.target.value)}
              className="mt-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-calm">
              <option value="">All my groups</option>
              {groups.data?.myGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <button onClick={downloadCsv} disabled={exporting}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-ink hover:border-calm disabled:opacity-60">
            {exporting ? 'Preparing…' : 'Export CSV'}
          </button>
        </div>
      </div>

      {analytics.loading && !a ? (
        <p className="mt-10 text-ink-2">Loading analytics…</p>
      ) : analytics.error ? (
        <p className="mt-10 text-brand-strong">Couldn’t load analytics for this selection.</p>
      ) : !a || a.responseCount === 0 ? (
        <p className="mt-10 text-ink-2">No responses yet for this selection.</p>
      ) : (
        <>
          {/* Stat tiles */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Responses" value={String(a.responseCount)} />
            <StatTile label="Participants" value={String(a.participantCount)} />
            <StatTile label="Mean total" value={r1(a.totalScore.mean)}
              sub={`95% CI ${r1(a.totalScore.ci95Lower)}–${r1(a.totalScore.ci95Upper)}`} />
            <StatTile label="Std. deviation" value={r1(a.totalScore.sd)}
              sub={`range ${a.totalScore.min}–${a.totalScore.max}`} />
          </div>

          {/* Distribution histogram */}
          <Section title="Score distribution" subtitle="How many people fall in each score band (14–70).">
            <div className="flex items-end gap-2" style={{ height: 200 }}>
              {a.distribution.map((b) => (
                <div key={b.label} className="flex flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-xs font-medium text-ink-2">{b.count}</span>
                  <div className="w-full rounded-t-md bg-calm" title={`${b.label}: ${b.count}`}
                    style={{ height: `${(b.count / maxCount) * 100}%`, minHeight: b.count ? 4 : 0 }} />
                  <span className="text-[10px] text-muted">{b.label}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Subscale (factor) means */}
          <Section title="Well-being factors" subtitle="Average score per factor, on the 1–5 item scale.">
            <div className="space-y-3">
              {a.subscales.map((f) => (
                <BarRow key={f.factor} label={f.name} value={r1(f.mean)} pct={(f.mean / 5) * 100} />
              ))}
            </div>
          </Section>

          {/* Demographic breakdown */}
          <Section title="By demographic"
            subtitle="Mean total score per group. Segments with fewer than 5 people are hidden to protect anonymity.">
            <div className="mb-4 flex flex-wrap gap-2">
              {DIMENSIONS.map(([v, l]) => (
                <button key={v} onClick={() => setDimension(v)}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                    dimension === v ? 'bg-calm-deep text-white' : 'bg-surface-2 text-ink-2 hover:text-calm-deep'}`}>
                  {l}
                </button>
              ))}
            </div>
            <DemographicBars segments={demo.data?.demographicBreakdown.segments ?? []} loading={demo.loading} />
          </Section>

          {/* Item means */}
          <Section title="Item averages" subtitle="Average response to each statement (1–5).">
            <div className="overflow-hidden rounded-2xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-2 text-ink-2">
                  <tr>
                    <th className="px-4 py-2 font-medium">#</th>
                    <th className="px-4 py-2 font-medium">Statement</th>
                    <th className="px-4 py-2 font-medium">Mean</th>
                    <th className="px-4 py-2 font-medium">n</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface">
                  {[...a.items].sort((x, y) => x.order - y.order).map((it) => (
                    <tr key={it.order}>
                      <td className="px-4 py-2 text-muted">{it.order}</td>
                      <td className="px-4 py-2 text-ink-2">{it.text}</td>
                      <td className="px-4 py-2 font-semibold text-ink">{r1(it.mean)}</td>
                      <td className="px-4 py-2 text-muted">{it.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}
    </div>
  )
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-widest text-muted">{label}</div>
      <div className="mt-1 text-3xl font-semibold text-ink">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-muted">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </section>
  )
}

// A labelled horizontal bar (used for factor means).
function BarRow({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-ink-2">{label}</span>
        <span className="font-semibold text-ink">{value}</span>
      </div>
      <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-calm" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
      </div>
    </div>
  )
}

function DemographicBars({ segments, loading }: { segments: Segment[]; loading: boolean }) {
  if (loading && segments.length === 0) return <p className="text-ink-2">Loading…</p>
  if (segments.length === 0) return <p className="text-ink-2">No data for this breakdown.</p>
  // Scale bars against the largest visible mean so they're comparable.
  const maxMean = Math.max(1, ...segments.filter((s) => !s.suppressed && s.mean != null).map((s) => s.mean as number))
  return (
    <div className="space-y-3">
      {segments.map((s) => (
        <div key={s.label}>
          <div className="flex justify-between text-sm">
            <span className="text-ink-2">{s.label} <span className="text-muted">(n={s.n})</span></span>
            <span className="font-semibold text-ink">
              {s.suppressed || s.mean == null
                ? 'hidden (n<5)'
                : `${r1(s.mean)}  ·  CI ${r1(s.ci95Lower ?? 0)}–${r1(s.ci95Upper ?? 0)}`}
            </span>
          </div>
          <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
            {!s.suppressed && s.mean != null && (
              <div className="h-full rounded-full bg-calm" style={{ width: `${(s.mean / maxMean) * 100}%` }} />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

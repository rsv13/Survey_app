import { IconBook, IconBuilding, IconCompass, IconList, IconLifebuoy } from '../components/Illustrations'

const resources = [
  { icon: <IconBook />, name: 'SWSWBS User Guide (v2, PDF)', desc: 'The official guide to the scale and its scoring.', href: 'https://www.wsspr.wales/ws/media-library/56772de855bcf21e2b5f7c941694b218/swswbs-user-guide_version-2_16jan25.pdf' },
  { icon: <IconBuilding />, name: 'Wales School for Social Prescribing Research', desc: 'The research school behind the scale.', href: 'https://www.wsspr.wales' },
  { icon: <IconCompass />, name: 'Dewis Cymru', desc: 'A directory of well-being services across Wales.', href: 'https://www.dewis.wales/' },
  { icon: <IconList />, name: 'InfoEngine', desc: 'Third-sector services and community support in Wales.', href: 'https://www.pavs.org.uk/help-for-organisations/infoengine/' },
]

const crisis = [
  { name: 'C.A.L.L. Mental Health Helpline for Wales', detail: '0800 132 737' },
  { name: 'Samaritans', detail: '116 123' },
]

export default function Resources() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-16">
      <div className="fade-up">
        <p className="text-sm font-semibold uppercase tracking-widest text-calm-deep">Resources &amp; support</p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight text-ink">Learn more and find support</h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-2">
          Reading to understand the scale, and services that can help you find support in your community.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {resources.map((r, i) => (
          <a key={r.href} href={r.href} target="_blank" rel="noreferrer"
            className={`lift flex gap-4 rounded-2xl border border-border bg-surface p-5 fade-up-${(i % 3) + 1}`}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-calm-soft text-calm-deep">{r.icon}</div>
            <div>
              <h3 className="font-semibold text-calm-deep">{r.name}</h3>
              <p className="mt-1 text-sm text-ink-2">{r.desc}</p>
            </div>
          </a>
        ))}
      </div>

      {/* Support */}
      <section className="mt-12 rounded-2xl border border-border bg-surface-2 p-6 fade-up">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface text-brand-strong"><IconLifebuoy /></div>
          <h2 className="text-lg font-semibold text-ink">If you need to talk to someone</h2>
        </div>
        <p className="mt-3 text-sm text-ink-2">
          If you are struggling or in distress, free and confidential support is available at any time.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {crisis.map((c) => (
            <li key={c.name} className="rounded-xl border border-border bg-surface px-4 py-3">
              <div className="font-medium text-ink">{c.name}</div>
              <div className="text-sm text-calm-deep">{c.detail}</div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted">In an emergency, call 999.</p>
      </section>
    </div>
  )
}

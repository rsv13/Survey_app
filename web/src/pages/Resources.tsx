const partners = [
  { name: 'SWSWBS User Guide (v2, PDF)', href: 'https://www.wsspr.wales/ws/media-library/56772de855bcf21e2b5f7c941694b218/swswbs-user-guide_version-2_16jan25.pdf' },
  { name: 'Wales School for Social Prescribing Research', href: 'https://www.wsspr.wales' },
  { name: 'Dewis Cymru — well-being directory', href: 'https://www.dewis.wales/' },
  { name: 'InfoEngine — Welsh third-sector services', href: 'https://www.pavs.org.uk/help-for-organisations/infoengine/' },
]

const crisis = [
  { name: 'C.A.L.L. Mental Health Helpline for Wales', detail: '0800 132 737' },
  { name: 'Samaritans', detail: '116 123' },
]

export default function Resources() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="text-3xl font-semibold text-[var(--ink)]">Resources &amp; support</h1>

      <p className="mt-4 text-[var(--ink-2)]">
        Reading and services that may help you understand the scale and find
        support in your community.
      </p>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-widest text-[var(--calm-deep)]">
        Learn more
      </h2>
      <ul className="mt-4 space-y-3">
        {partners.map((p) => (
          <li key={p.href}>
            <a
              href={p.href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[var(--calm-deep)] underline-offset-2 hover:underline"
            >
              {p.name}
            </a>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-widest text-[var(--calm-deep)]">
        If you need to talk to someone
      </h2>
      <p className="mt-4 text-[var(--ink-2)]">
        If you are struggling or in distress, free and confidential support is
        available at any time.
      </p>
      <ul className="mt-4 space-y-3">
        {crisis.map((c) => (
          <li
            key={c.name}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
          >
            <span className="font-medium text-[var(--ink)]">{c.name}</span>
            <span className="ml-2 text-[var(--ink-2)]">{c.detail}</span>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-[var(--muted)]">
        In an emergency, call 999.
      </p>
    </div>
  )
}

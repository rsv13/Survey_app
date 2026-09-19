import { IconBuilding, IconCompass, IconList } from '../components/Illustrations'

// NOTE: update the research-team email below with your team's real address.
const cards = [
  {
    icon: <IconBuilding />,
    title: 'University of South Wales',
    body: 'For any queries or further information about the South Wales Social Well-being Scale (SWSWBS), please contact the University of South Wales.',
    rows: [
      { label: 'Address', value: 'Treforest Campus, University of South Wales, Treforest, Pontypridd, CF37 1DL, United Kingdom' },
      { label: 'Email', value: 'info@southwales.ac.uk', href: 'mailto:info@southwales.ac.uk' },
      { label: 'Phone', value: '+44 (0)1443 482 000' },
    ],
    footer: { text: 'You can also visit the Wales School for Social Prescribing Research (WSSPR).', href: 'https://www.wsspr.wales', linkText: 'WSSPR' },
  },
  {
    icon: <IconCompass />,
    title: 'Dewis Cymru',
    body: 'A comprehensive resource for well-being information in Wales — a directory of local services including mental-health support and community activities.',
    rows: [{ label: 'Website', value: 'dewis.wales', href: 'https://www.dewis.wales/' }],
  },
  {
    icon: <IconList />,
    title: 'InfoEngine',
    body: 'A directory of third-sector services across Wales — community groups, social activities and counselling among them.',
    rows: [{ label: 'Website', value: 'infoengine (PAVS)', href: 'https://www.pavs.org.uk/help-for-organisations/infoengine/' }],
  },
]

export default function Contact() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-16">
      <div className="fade-up">
        <p className="text-sm font-semibold uppercase tracking-widest text-calm-deep">Contact us</p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight text-ink">We’re here to help</h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-2">
          Please feel free to reach out with any questions or concerns about the South Wales Social
          Well-being Scale or this study.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {cards.map((c, i) => (
          <section key={c.title} className={`lift rounded-2xl border border-border bg-surface p-6 shadow-sm fade-up-${i + 1}`}>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-calm-soft text-calm-deep">{c.icon}</div>
            <h2 className="mt-4 text-lg font-semibold text-ink">{c.title}</h2>
            <p className="mt-2 text-sm text-ink-2">{c.body}</p>
            <dl className="mt-4 space-y-3">
              {c.rows.map((r) => (
                <div key={r.label}>
                  <dt className="text-xs font-semibold uppercase tracking-widest text-muted">{r.label}</dt>
                  <dd className="mt-0.5 text-sm text-ink">
                    {r.href ? (
                      <a href={r.href} target="_blank" rel="noreferrer" className="text-calm-deep hover:underline">{r.value}</a>
                    ) : r.value}
                  </dd>
                </div>
              ))}
            </dl>
            {c.footer && (
              <p className="mt-4 text-sm text-ink-2">
                {c.footer.text.split(c.footer.linkText)[0]}
                <a href={c.footer.href} target="_blank" rel="noreferrer" className="font-medium text-calm-deep hover:underline">{c.footer.linkText}</a>
                {c.footer.text.split(c.footer.linkText)[1]}
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}

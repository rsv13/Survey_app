// Partner logos are displayed with permission. Each sits on a white tile so it
// renders correctly in both light and dark mode (several logos contain dark
// elements that would disappear on the dark footer otherwise).
const partners = [
  { name: 'University of South Wales', url: 'https://www.southwales.ac.uk/', logo: '/logos/USW.png' },
  { name: 'PRIME Centre Wales', url: 'https://www.primecentre.wales/', logo: '/logos/PrimeCentreWales.png' },
  { name: 'Wales School for Social Prescribing Research', url: 'https://www.wsspr.wales', logo: '/logos/WSSPR.png' },
  { name: 'Health and Care Research Wales', url: 'https://healthandcareresearchwales.org/', logo: '/logos/HealthCareWales.png' },
]

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">In partnership with</p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {partners.map((p) => (
            <a
              key={p.name}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              title={p.name}
              className="flex h-24 items-center justify-center rounded-xl border border-border bg-white p-4 transition hover:border-calm"
            >
              <img src={p.logo} alt={p.name} loading="lazy"
                className="max-h-full w-auto object-contain" />
            </a>
          ))}
        </div>

        <p className="mt-5 text-xs text-muted">
          The SWSWBS is used with the permission of the University of South Wales. Partner logos are used with permission.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-xs text-muted">
          <span>{'©'} {new Date().getFullYear()} University of South Wales {'·'} SWSWBS</span>
          <span className="italic text-calm-deep">Well-being today for a stronger tomorrow</span>
        </div>
      </div>
    </footer>
  )
}

const partners = [
  { name: 'University of South Wales', url: 'https://www.southwales.ac.uk/' },
  { name: 'Prime Centre Wales', url: 'https://www.primecentre.wales/' },
  { name: 'WSSPR', url: 'https://www.wsspr.wales' },
  { name: 'Health & Care Research Wales', url: 'https://healthandcareresearchwales.org/' },
]

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-wrap gap-3">
          {partners.map((p) => (
            <a
              key={p.name}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-[160px] flex-1 rounded-xl border border-border bg-plane px-4 py-3 text-sm font-semibold text-ink hover:border-calm"
            >
              {p.name}
            </a>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted">
          The SWSWBS is used with the permission of the University of South Wales.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-xs text-muted">
          <span>{'©'} {new Date().getFullYear()} University of South Wales {'·'} SWSWBS</span>
          <span className="italic text-calm-deep">Well-being today for a stronger tomorrow</span>
        </div>
      </div>
    </footer>
  )
}

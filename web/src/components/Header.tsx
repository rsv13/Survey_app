import { NavLink, Link } from 'react-router-dom'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'

const nav = [
  { to: '/', label: 'Home', end: true },
  { to: '/survey', label: 'Survey' },
  { to: '/about', label: 'About' },
  { to: '/resources', label: 'Resources' },
]

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-plane/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo size={36} />
          <span className="leading-none">
            <span className="block font-semibold">SWSWBS</span>
            <span className="block text-xs text-muted">South Wales Social Well-being Scale</span>
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-5 md:flex">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `text-sm font-semibold ${isActive ? 'text-calm-deep' : 'text-ink-2 hover:text-calm-deep'}`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-6">
          <ThemeToggle />
          <Link
            to="/sign-in"
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-ink hover:border-calm"
          >
            Sign in
          </Link>
          <Link
            to="/survey"
            className="hidden rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-strong sm:inline-block"
          >
            Take the survey
          </Link>
        </div>
      </div>
    </header>
  )
}

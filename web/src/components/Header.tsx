import { NavLink, Link, useNavigate } from 'react-router-dom'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'
import { useAuth } from '../auth-context'

const nav = [
  { to: '/', label: 'Home', end: true },
  { to: '/survey', label: 'Survey' },
  { to: '/about', label: 'About' },
  { to: '/resources', label: 'Resources' },
]

export function Header() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function onSignOut() {
    await signOut()
    navigate('/')
  }

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
          {user && (
            <NavLink to="/results"
              className={({ isActive }) =>
                `text-sm font-semibold ${isActive ? 'text-calm-deep' : 'text-ink-2 hover:text-calm-deep'}`
              }>
              My results
            </NavLink>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-6">
          <ThemeToggle />

          {user ? (
            // Signed in: show the name and a sign-out button.
            <>
              <span className="hidden text-sm text-ink-2 sm:inline">
                Hi, <span className="font-semibold text-ink">{user.username}</span>
              </span>
              <button
                onClick={onSignOut}
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-ink hover:border-calm"
              >
                Sign out
              </button>
            </>
          ) : (
            // Signed out: show the sign-in link and the survey call-to-action.
            <>
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
            </>
          )}
        </div>
      </div>
    </header>
  )
}

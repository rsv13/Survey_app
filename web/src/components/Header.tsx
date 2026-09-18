import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'
import { useAuth } from '../auth-context'

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}
function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}
function PersonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  )
}
function Avatar({ avatar }: { avatar: string }) {
  const custom = avatar && avatar !== 'default'
  return <span className="text-lg leading-none text-calm-deep">{custom ? avatar : <PersonIcon />}</span>
}

// Public (signed-out) top nav.
const publicNav = [
  { to: '/', label: 'Home', end: true },
  { to: '/survey', label: 'Survey' },
  { to: '/about', label: 'About' },
  { to: '/resources', label: 'Resources' },
]

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false) // signed-out mobile dropdown

  const deskClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-semibold ${isActive ? 'text-calm-deep' : 'text-ink-2 hover:text-calm-deep'}`

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-plane/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-3">
        {/* Left: sidebar toggle (signed in) + logo */}
        {user && (
          <button onClick={onMenuClick} aria-label="Toggle menu"
            className="rounded-lg border border-border p-2 text-ink hover:border-calm">
            <MenuIcon />
          </button>
        )}
        <Link to="/" className="flex items-center gap-2.5">
          <Logo size={36} />
          <span className="leading-none">
            <span className="block font-semibold">SWSWBS</span>
            <span className="block text-xs text-muted">South Wales Social Well-being Scale</span>
          </span>
        </Link>

        {/* Right */}
        <div className="ml-auto flex items-center gap-2">
          {!user && (
            <nav className="hidden items-center gap-5 md:flex">
              {publicNav.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end} className={deskClass}>{n.label}</NavLink>
              ))}
            </nav>
          )}
          <ThemeToggle />

          {user ? (
            <Link to="/profile" title="Your account"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-calm-soft transition hover:ring-2 hover:ring-calm">
              <Avatar avatar={user.avatar} />
            </Link>
          ) : (
            <>
              <Link to="/sign-in"
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-ink hover:border-calm">
                Sign in
              </Link>
              <Link to="/survey"
                className="hidden rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-strong sm:inline-block">
                Take the survey
              </Link>
              <button onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}
                className="rounded-lg border border-border p-2 text-ink hover:border-calm md:hidden">
                {open ? <XIcon /> : <MenuIcon />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Signed-out mobile dropdown */}
      {!user && open && (
        <div className="border-t border-border bg-plane md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-3">
            {publicNav.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? 'bg-surface-2 text-calm-deep' : 'text-ink-2 hover:bg-surface-2'}`
                }>
                {n.label}
              </NavLink>
            ))}
            <Link to="/sign-in" onClick={() => setOpen(false)}
              className="mt-2 rounded-lg border border-border px-3 py-2 text-center text-sm font-semibold text-ink hover:border-calm">
              Sign in
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}

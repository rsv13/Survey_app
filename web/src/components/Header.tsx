import { useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
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
// The person's chosen avatar emoji, or a generic person icon.
function Avatar({ avatar }: { avatar: string }) {
  const custom = avatar && avatar !== 'default'
  return <span className="text-lg leading-none text-calm-deep">{custom ? avatar : <PersonIcon />}</span>
}

export function Header() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  async function onSignOut() {
    setOpen(false)
    await signOut()
    navigate('/')
  }

  // One source of truth for the links, including the role-gated ones.
  const links: { to: string; label: string; end?: boolean }[] = [
    { to: '/', label: 'Home', end: true },
    { to: '/survey', label: 'Survey' },
    { to: '/about', label: 'About' },
    { to: '/resources', label: 'Resources' },
    ...(user ? [{ to: '/results', label: 'My results' }, { to: '/groups', label: 'Groups' }] : []),
    ...(user?.role === 'GROUP_ADMIN' || user?.role === 'ADMIN' ? [{ to: '/analytics', label: 'Analytics' }] : []),
  ]

  const deskClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-semibold ${isActive ? 'text-calm-deep' : 'text-ink-2 hover:text-calm-deep'}`
  const mobileClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? 'bg-surface-2 text-calm-deep' : 'text-ink-2 hover:bg-surface-2'}`

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-plane/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3">
        <Link to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <Logo size={36} />
          <span className="leading-none">
            <span className="block font-semibold">SWSWBS</span>
            <span className="block text-xs text-muted">South Wales Social Well-being Scale</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="ml-auto hidden items-center gap-5 md:flex">
          {links.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={deskClass}>{n.label}</NavLink>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 md:ml-6 md:flex">
          <ThemeToggle />
          {user ? (
            <>
              <Link to="/profile" title="Your account"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-calm-soft transition hover:ring-2 hover:ring-calm">
                <Avatar avatar={user.avatar} />
              </Link>
              <button onClick={onSignOut}
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-ink hover:border-calm">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/sign-in"
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-ink hover:border-calm">
                Sign in
              </Link>
              <Link to="/survey"
                className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-strong">
                Take the survey
              </Link>
            </>
          )}
        </div>

        {/* Mobile: theme + hamburger */}
        <div className="ml-auto flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}
            className="rounded-lg border border-border p-2 text-ink hover:border-calm">
            {open ? <XIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="border-t border-border bg-plane md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-3">
            {links.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)} className={mobileClass}>
                {n.label}
              </NavLink>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
              {user ? (
                <>
                  <Link to="/profile" onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-ink">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-calm-soft">
                      <Avatar avatar={user.avatar} />
                    </span>
                    Your account
                  </Link>
                  <button onClick={onSignOut}
                    className="rounded-lg border border-border px-3 py-2 text-left text-sm font-semibold text-ink hover:border-calm">
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/sign-in" onClick={() => setOpen(false)}
                    className="rounded-lg border border-border px-3 py-2 text-center text-sm font-semibold text-ink hover:border-calm">
                    Sign in
                  </Link>
                  <Link to="/survey" onClick={() => setOpen(false)}
                    className="rounded-lg bg-brand px-3 py-2 text-center text-sm font-semibold text-white hover:bg-brand-strong">
                    Take the survey
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

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
function Avatar({ avatar }: { avatar: string }) {
  const custom = avatar && avatar !== 'default'
  return <span className="text-lg leading-none text-calm-deep">{custom ? avatar : <PersonIcon />}</span>
}

const siteNav = [
  { to: '/', label: 'Home', end: true },
  { to: '/survey', label: 'Survey' },
  { to: '/about', label: 'About' },
  { to: '/resources', label: 'Resources' },
  { to: '/contact', label: 'Contact us' },
]

// Extra links shown to signed-in users in the mobile menu (desktop uses the sidebar).
const appNav = [
  { to: '/results', label: 'My results' },
  { to: '/groups', label: 'Groups' },
  { to: '/profile', label: 'Profile' },
]

export function Header() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const deskClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-semibold ${isActive ? 'text-calm-deep' : 'text-ink-2 hover:text-calm-deep'}`
  const mobClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? 'bg-surface-2 text-calm-deep' : 'text-ink-2 hover:bg-surface-2'}`

  const isAdmin = user?.role === 'GROUP_ADMIN' || user?.role === 'ADMIN'
  const mobileAppNav = isAdmin ? [...appNav.slice(0, 2), { to: '/analytics', label: 'Analytics' }, appNav[2]] : appNav

  async function onSignOut() {
    setOpen(false)
    await signOut()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-plane/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-3">
        <Link to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <Logo size={36} />
          <span className="leading-none">
            <span className="block font-semibold">SWSWBS</span>
            <span className="block text-xs text-muted">South Wales Social Well-being Scale</span>
          </span>
        </Link>

        {/* Site nav (everyone, desktop) */}
        <nav className="ml-auto hidden items-center gap-5 md:flex">
          {siteNav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={deskClass}>{n.label}</NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-6">
          <ThemeToggle />
          {user ? (
            <Link to="/profile" title="Your account"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-calm-soft transition hover:ring-2 hover:ring-calm">
              <Avatar avatar={user.avatar} />
            </Link>
          ) : (
            <Link to="/sign-in"
              className="hidden rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-ink hover:border-calm sm:inline-block">
              Sign in
            </Link>
          )}
          {/* Mobile menu button (everyone) */}
          <button onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}
            className="rounded-lg border border-border p-2 text-ink hover:border-calm md:hidden">
            {open ? <XIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* Mobile menu: site nav for all; app links + sign out when signed in; sign in otherwise */}
      {open && (
        <div className="border-t border-border bg-plane md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-3">
            {siteNav.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)} className={mobClass}>
                {n.label}
              </NavLink>
            ))}
            {user ? (
              <>
                <div className="my-1 border-t border-border" />
                {mobileAppNav.map((n) => (
                  <NavLink key={n.to} to={n.to} onClick={() => setOpen(false)} className={mobClass}>
                    {n.label}
                  </NavLink>
                ))}
                <button onClick={onSignOut}
                  className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-brand-strong hover:bg-surface-2">
                  Sign out
                </button>
              </>
            ) : (
              <Link to="/sign-in" onClick={() => setOpen(false)}
                className="mt-2 rounded-lg border border-border px-3 py-2 text-center text-sm font-semibold text-ink hover:border-calm">
                Sign in
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}

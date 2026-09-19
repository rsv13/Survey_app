import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth-context'

// Desktop-only dashboard rail (shown by RootLayout only on dashboard pages).
// On mobile, these links live in the header menu instead.
export function Sidebar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  if (!user) return null

  const isAdmin = user.role === 'GROUP_ADMIN' || user.role === 'ADMIN'
  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `block rounded-lg px-3 py-2 text-sm font-semibold ${
      isActive ? 'bg-calm-soft text-calm-deep' : 'text-ink-2 hover:bg-surface-2'}`
  const heading = 'px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-widest text-muted'

  async function onSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <aside className="hidden w-56 shrink-0 px-4 py-6 lg:sticky lg:top-16 lg:block lg:self-start">
      <nav className="flex flex-col gap-1">
        <p className={heading}>Dashboard</p>
        <NavLink to="/results" className={linkCls}>My results</NavLink>
        <NavLink to="/groups" className={linkCls}>Groups</NavLink>
        {isAdmin && <NavLink to="/analytics" className={linkCls}>Analytics</NavLink>}

        <p className={heading}>Account</p>
        <NavLink to="/profile" className={linkCls}>Profile</NavLink>
        <button onClick={onSignOut}
          className="mt-1 block rounded-lg px-3 py-2 text-left text-sm font-semibold text-brand-strong hover:bg-surface-2">
          Sign out
        </button>
      </nav>
    </aside>
  )
}

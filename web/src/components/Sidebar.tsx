import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth-context'

// Left-hand app navigation for signed-in users. Persistent column on desktop,
// slide-out drawer (with backdrop) on mobile. Rendered only when `open`.
export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  if (!open || !user) return null

  const isAdmin = user.role === 'GROUP_ADMIN' || user.role === 'ADMIN'
  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `block rounded-lg px-3 py-2 text-sm font-semibold ${
      isActive ? 'bg-calm-soft text-calm-deep' : 'text-ink-2 hover:bg-surface-2'}`
  const heading = 'px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-widest text-muted'

  async function onSignOut() {
    onClose()
    await signOut()
    navigate('/')
  }

  return (
    <>
      {/* Mobile-only backdrop; on desktop the sidebar is a static column. */}
      <div onClick={onClose} className="fixed inset-0 z-30 bg-black/30 lg:hidden" />
      <aside className="fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto border-r border-border bg-surface p-4 lg:static lg:z-auto lg:w-56 lg:shrink-0">
        <nav className="flex flex-col gap-1">
          <p className={heading}>Survey</p>
          <NavLink to="/survey" onClick={onClose} className={linkCls}>Take the survey</NavLink>
          <NavLink to="/results" onClick={onClose} className={linkCls}>My results</NavLink>
          <NavLink to="/groups" onClick={onClose} className={linkCls}>Groups</NavLink>
          {isAdmin && (
            <NavLink to="/analytics" onClick={onClose} className={linkCls}>Analytics</NavLink>
          )}

          <p className={heading}>Information</p>
          <NavLink to="/" end onClick={onClose} className={linkCls}>Home</NavLink>
          <NavLink to="/about" onClick={onClose} className={linkCls}>About</NavLink>
          <NavLink to="/resources" onClick={onClose} className={linkCls}>Resources</NavLink>

          <p className={heading}>Account</p>
          <NavLink to="/profile" onClick={onClose} className={linkCls}>Profile</NavLink>
          <button onClick={onSignOut}
            className="mt-1 block rounded-lg px-3 py-2 text-left text-sm font-semibold text-brand-strong hover:bg-surface-2">
            Sign out
          </button>
        </nav>
      </aside>
    </>
  )
}

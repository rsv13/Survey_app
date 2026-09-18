import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth-context'

// Wraps any page that should only be seen when signed in. If the visitor
// isn't signed in, we send them to the sign-up page instead.
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  // While we're still checking for a saved session on first load, don't decide
  // yet — otherwise a signed-in user refreshing the page would be bounced out.
  if (loading) {
    return <div className="mx-auto max-w-md px-5 py-16 text-ink-2">Loading…</div>
  }

  if (!user) {
    // Remember where they were headed so we could return them here later.
    return <Navigate to="/sign-up" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}

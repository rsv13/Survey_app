import { Outlet, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { Sidebar } from './Sidebar'
import { useAuth } from '../auth-context'

// The sidebar only appears in the signed-in dashboard/account area — not on the
// public pages (Home, Survey, About, Resources, Contact).
const DASHBOARD_PREFIXES = ['/profile', '/results', '/groups', '/analytics']

export function RootLayout() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const showSidebar =
    !!user && DASHBOARD_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="mx-auto flex w-full max-w-7xl flex-1">
        {showSidebar && <Sidebar />}
        <main className="min-w-0 flex-1"><Outlet /></main>
      </div>
      <Footer />
    </div>
  )
}

import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { Sidebar } from './Sidebar'
import { useAuth } from '../auth-context'

export function RootLayout() {
  const { user } = useAuth()
  // Start open on desktop (persistent column), closed on phones (drawer).
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return typeof window !== 'undefined' && window.innerWidth >= 1024 } catch { return false }
  })

  return (
    <div className="flex min-h-screen flex-col">
      <Header onMenuClick={() => setSidebarOpen((o) => !o)} />
      <div className="flex flex-1">
        {user && <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1"><Outlet /></main>
          <Footer />
        </div>
      </div>
    </div>
  )
}

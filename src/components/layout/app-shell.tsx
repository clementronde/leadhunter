'use client'

import { useAuth } from '@/components/auth/auth-provider'
import { usePathname } from 'next/navigation'
import { Sidebar } from './sidebar'
import { useUIStore } from '@/lib/store'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const isLoginPage = pathname === '/login'

  // Show sidebar only if user is logged in and not on login page
  const showSidebar = !!user && !isLoginPage

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!showSidebar) {
    return <main className="min-h-screen">{children}</main>
  }

  return (
    <>
      <Sidebar />
      <main className={`${sidebarOpen ? 'ml-64' : 'ml-20'} min-h-screen transition-all duration-300`}>
        {children}
      </main>
    </>
  )
}

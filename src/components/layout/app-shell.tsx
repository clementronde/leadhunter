'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/auth-provider'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { Sidebar } from './sidebar'
import { CommandPalette } from '@/components/ui/command-palette'
import { LogoMark } from '@/components/ui/logo'
import { useUIStore } from '@/lib/store'
import { cn } from '@/lib/utils'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const isLoginPage = pathname === '/login'
  const [cmdOpen, setCmdOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const showSidebar = !!user && !isLoginPage

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (showSidebar) setCmdOpen((o) => !o)
      }
      if (e.key === 'Escape') setMobileNavOpen(false)
    }
    const openHandler = () => { if (showSidebar) setCmdOpen(true) }
    window.addEventListener('keydown', handler)
    window.addEventListener('open-cmd', openHandler)
    return () => {
      window.removeEventListener('keydown', handler)
      window.removeEventListener('open-cmd', openHandler)
    }
  }, [showSidebar])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Chargement">
        <LogoMark size={28} className="animate-pulse" />
      </div>
    )
  }

  if (!showSidebar) {
    return <main className="min-h-screen">{children}</main>
  }

  return (
    <>
      <Sidebar mobileOpen={mobileNavOpen} onNavigate={() => setMobileNavOpen(false)} />
      {mobileNavOpen && (
        <button
          aria-label="Fermer le menu"
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
        />
      )}
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-hairline bg-canvas px-3 md:hidden">
        <button
          onClick={() => setMobileNavOpen(true)}
          aria-label="Ouvrir le menu"
          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-300 hover:bg-white/[0.05]"
        >
          <Menu className="h-4 w-4" />
        </button>
        <LogoMark size={18} />
        <span className="text-[14px] font-semibold text-white">LeadHunter</span>
      </div>

      <main
        className={cn(
          'min-h-screen transition-[padding] duration-200 ease-out',
          sidebarOpen ? 'md:pl-60' : 'md:pl-[60px]'
        )}
      >
        <div key={pathname} className="animate-fade-up">
          {children}
        </div>
      </main>
    </>
  )
}

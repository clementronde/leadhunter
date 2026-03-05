'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/auth-provider'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Sidebar } from './sidebar'
import { CommandPalette } from '@/components/ui/command-palette'
import { useUIStore } from '@/lib/store'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const isLoginPage = pathname === '/login'
  const [cmdOpen, setCmdOpen] = useState(false)

  const showSidebar = !!user && !isLoginPage

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (showSidebar) setCmdOpen((o) => !o)
      }
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!showSidebar) {
    return (
      <main className="min-h-screen">
        <motion.div
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </main>
    )
  }

  return (
    <>
      <Sidebar />
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <main className={`${sidebarOpen ? 'ml-64' : 'ml-20'} min-h-screen transition-all duration-300`}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </main>
    </>
  )
}

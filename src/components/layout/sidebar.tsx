'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/lib/store'
import { useAuth } from '@/components/auth/auth-provider'
import { usePlan } from '@/hooks/usePlan'
import {
  LayoutDashboard,
  Users,
  Radar,
  Kanban,
  Settings,
  ChevronLeft,
  ChevronRight,
  Target,
  LogOut,
  Zap,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Leads', href: '/leads', icon: Users },
  { name: 'Scanner', href: '/scanner', icon: Radar },
  { name: 'Pipeline', href: '/pipeline', icon: Kanban },
  { name: 'Parametres', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { user, signOut } = useAuth()
  const { isPro } = usePlan()

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-zinc-950/90 backdrop-blur-xl border-r border-zinc-800/40 transition-all duration-300 ease-in-out',
        sidebarOpen ? 'w-64' : 'w-20'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-zinc-800/40">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
            <Target className="h-6 w-6 text-white" />
          </div>
          {sidebarOpen && (
            <span className="text-xl font-bold text-white">
              Lead<span className="text-amber-500">Hunter</span>
            </span>
          )}
        </Link>

        <button
          onClick={toggleSidebar}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-3 mt-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-amber-500/15 backdrop-blur-sm text-amber-500'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              )}
              title={!sidebarOpen ? item.name : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-amber-500 rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-amber-500')} />
              {sidebarOpen && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer with user info */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-zinc-800/40 p-4 space-y-3">
        {/* Upgrade CTA for free users (sidebar open only) */}
        {!isPro && sidebarOpen && (
          <button
            onClick={() => router.push('/upgrade')}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90 transition-opacity"
          >
            <Zap className="h-3.5 w-3.5" />
            Passer à Pro
          </button>
        )}

        <div className={cn(
          'flex items-center gap-3',
          !sidebarOpen && 'justify-center'
        )}>
          {/* Avatar with plan badge */}
          <div className="relative flex-shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/20 text-amber-500 text-xs font-bold">
              {user?.email?.charAt(0).toUpperCase() || '?'}
            </div>
            {/* Plan badge on avatar when sidebar is closed */}
            {!sidebarOpen && (
              <span
                className={cn(
                  'absolute -bottom-1 -right-1 text-[9px] font-bold px-1 rounded-full border border-zinc-950',
                  isPro
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white'
                    : 'bg-zinc-700 text-zinc-300'
                )}
              >
                {isPro ? 'PRO' : 'FREE'}
              </span>
            )}
          </div>

          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-white truncate">
                  {user?.email || 'Utilisateur'}
                </p>
                {/* Plan badge next to email */}
                <span
                  className={cn(
                    'shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                    isPro
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white'
                      : 'bg-zinc-700 text-zinc-400'
                  )}
                >
                  {isPro ? 'PRO' : 'FREE'}
                </span>
              </div>
              <button
                onClick={signOut}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-red-400 transition-colors"
              >
                <LogOut className="h-3 w-3" />
                Deconnexion
              </button>
            </div>
          )}
          {!sidebarOpen && (
            <button
              onClick={signOut}
              className="absolute -right-0 bottom-14 flex h-8 w-8 items-center justify-center"
              title="Deconnexion"
            >
              <LogOut className="h-4 w-4 text-zinc-500 hover:text-red-400 transition-colors" />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}

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
  Shield,
  Send,
} from 'lucide-react'

const navigationGroups = [
  {
    label: null,
    items: [{ name: 'Dashboard', href: '/', icon: LayoutDashboard }],
  },
  {
    label: 'Prospection',
    items: [
      { name: 'Leads', href: '/leads', icon: Users },
      { name: 'Campagnes', href: '/campaigns', icon: Send },
      { name: 'Scanner', href: '/scanner', icon: Radar },
      { name: 'Pipeline', href: '/pipeline', icon: Kanban },
    ],
  },
  {
    label: null,
    items: [{ name: 'Paramètres', href: '/settings', icon: Settings }],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { user, signOut, isAdmin } = useAuth()
  const { isPro } = usePlan()

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen flex flex-col',
        'bg-[#0a0a0c] border-r border-white/[0.06]',
        'transition-all duration-300 ease-in-out',
        sidebarOpen ? 'w-64' : 'w-[72px]'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-white/[0.05] shrink-0">
        <Link href="/" className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30">
            <Target className="h-5 w-5 text-white" />
          </div>
          {sidebarOpen && (
            <span className="text-lg font-bold text-white truncate">
              Lead<span className="text-amber-500">Hunter</span>
            </span>
          )}
        </Link>

        <button
          onClick={toggleSidebar}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-600 hover:bg-white/[0.05] hover:text-zinc-400 transition-colors"
        >
          {sidebarOpen ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-0.5 p-3 pt-4 overflow-y-auto">
        {navigationGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
            {group.label && sidebarOpen && (
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                {group.label}
              </p>
            )}
            {!group.label && gi > 0 && !sidebarOpen && (
              <div className="mx-3 mb-2 h-px bg-white/[0.05]" />
            )}
            {group.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href))

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-amber-500/[0.12] text-amber-400'
                      : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200'
                  )}
                  title={!sidebarOpen ? item.name : undefined}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-amber-500 rounded-r-full"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <item.icon
                    className={cn(
                      'h-[18px] w-[18px] shrink-0',
                      isActive ? 'text-amber-400' : 'text-zinc-600'
                    )}
                  />
                  {sidebarOpen && <span>{item.name}</span>}
                </Link>
              )
            })}
          </div>
        ))}

        {/* Admin navigation */}
        {isAdmin && (
          <div className="mt-4">
            {sidebarOpen && (
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                Admin
              </p>
            )}
            {(() => {
              const isActive = pathname.startsWith('/admin')
              return (
                <Link
                  href="/admin"
                  className={cn(
                    'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-violet-500/[0.12] text-violet-400'
                      : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200'
                  )}
                  title={!sidebarOpen ? 'Administration' : undefined}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-violet-500 rounded-r-full"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <Shield
                    className={cn(
                      'h-[18px] w-[18px] shrink-0',
                      isActive ? 'text-violet-400' : 'text-zinc-600'
                    )}
                  />
                  {sidebarOpen && <span>Administration</span>}
                </Link>
              )
            })()}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-white/[0.05] p-3 space-y-2">
        {/* Upgrade CTA */}
        {!isPro && !isAdmin && sidebarOpen && (
          <button
            onClick={() => router.push('/upgrade')}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-400 hover:to-orange-500 shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98]"
          >
            <Zap className="h-3.5 w-3.5" />
            Passer à Pro
          </button>
        )}

        {/* User */}
        <div
          className={cn(
            'flex items-center gap-3 rounded-xl p-2 hover:bg-white/[0.03] transition-colors',
            !sidebarOpen && 'justify-center'
          )}
        >
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/30 to-orange-600/20 text-amber-400 text-xs font-bold border border-amber-500/20">
              {user?.email?.charAt(0).toUpperCase() || '?'}
            </div>
            {!sidebarOpen && (
              <span
                className={cn(
                  'absolute -bottom-1 -right-1 text-[8px] font-bold px-1 py-px rounded-full border border-[#0a0a0c]',
                  isAdmin
                    ? 'bg-violet-600 text-white'
                    : isPro
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white'
                    : 'bg-zinc-700 text-zinc-400'
                )}
              >
                {isAdmin ? 'ADM' : isPro ? 'PRO' : 'FREE'}
              </span>
            )}
          </div>

          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-xs font-medium text-zinc-300 truncate">
                  {user?.email?.split('@')[0] || 'Utilisateur'}
                </p>
                <span
                  className={cn(
                    'shrink-0 text-[9px] font-bold px-1.5 py-px rounded-full',
                    isAdmin
                      ? 'bg-violet-500/20 text-violet-400 border border-violet-500/20'
                      : isPro
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20'
                      : 'bg-zinc-700/60 text-zinc-500 border border-zinc-700'
                  )}
                >
                  {isAdmin ? 'ADMIN' : isPro ? 'PRO' : 'FREE'}
                </span>
              </div>
              <button
                onClick={signOut}
                className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-red-400 transition-colors"
              >
                <LogOut className="h-3 w-3" />
                Déconnexion
              </button>
            </div>
          )}

          {!sidebarOpen && (
            <button
              onClick={signOut}
              title="Déconnexion"
              className="absolute left-[72px] bottom-[14px] flex h-7 w-7 items-center justify-center rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/5 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}

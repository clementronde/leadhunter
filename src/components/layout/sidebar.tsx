'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/lib/store'
import { useAuth } from '@/components/auth/auth-provider'
import { usePlan } from '@/hooks/usePlan'
import { LogoMark } from '@/components/ui/logo'
import {
  LayoutDashboard,
  Users,
  Radar,
  Kanban,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Shield,
  Send,
  Inbox,
  Combine,
  CalendarCheck,
  ListChecks,
  Map as MapIcon,
  Search,
  ArrowUpRight,
  type LucideIcon,
} from 'lucide-react'

type NavItem = { name: string; href: string; icon: LucideIcon; hint?: string }
type NavGroup = { label: string | null; items: NavItem[] }

const navigationGroups: NavGroup[] = [
  {
    label: null,
    items: [
      { name: "Aujourd'hui", href: '/today', icon: CalendarCheck, hint: 'Relances du jour' },
      { name: 'Tri', href: '/triage', icon: ListChecks, hint: 'Valider les nouveaux leads' },
      { name: "Vue d'ensemble", href: '/', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Trouver',
    items: [
      { name: 'Scanner', href: '/scanner', icon: Radar, hint: 'Chercher des entreprises' },
      { name: 'Carte', href: '/map', icon: MapIcon },
    ],
  },
  {
    label: 'Suivre',
    items: [
      { name: 'Leads', href: '/leads', icon: Users },
      { name: 'Pipeline', href: '/pipeline', icon: Kanban },
      { name: 'Doublons', href: '/duplicates', icon: Combine },
    ],
  },
  {
    label: 'Contacter',
    items: [
      { name: 'Campagnes', href: '/campaigns', icon: Send },
      { name: 'Inbox', href: '/inbox', icon: Inbox },
    ],
  },
]

function isActivePath(pathname: string, href: string) {
  return pathname === href || (href !== '/' && pathname.startsWith(href))
}

export function Sidebar({ mobileOpen = false, onNavigate }: { mobileOpen?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { user, signOut, isAdmin } = useAuth()
  const { isPro } = usePlan()

  // On mobile the drawer is always shown expanded
  const expanded = sidebarOpen || mobileOpen
  const plan = isAdmin ? 'Admin' : isPro ? 'Pro' : 'Gratuit'

  return (
    <aside
      aria-label="Navigation principale"
      className={cn(
        'fixed left-0 top-0 z-50 flex h-dvh flex-col border-r border-hairline bg-[#0b0c0d]',
        'transition-[width,transform] duration-200 ease-out',
        expanded ? 'w-60' : 'w-[60px]',
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}
    >
      {/* Brand + collapse */}
      <div className={cn('flex h-14 shrink-0 items-center gap-2 px-3', !expanded && 'justify-center px-0')}>
        <Link href="/today" onClick={onNavigate} className="flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1">
          <LogoMark size={20} />
          {expanded && <span className="truncate text-[14px] font-semibold tracking-[-0.01em] text-white">LeadHunter</span>}
        </Link>
        {expanded && (
          <button
            onClick={toggleSidebar}
            aria-label="Réduire la barre latérale"
            className="ml-auto hidden h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-zinc-200 md:flex"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search */}
      <div className={cn('px-3 pb-2', !expanded && 'px-2')}>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-cmd'))}
          aria-label="Rechercher (Ctrl K)"
          title={!expanded ? 'Rechercher (Ctrl K)' : undefined}
          className={cn(
            'flex h-8 w-full items-center gap-2 rounded-md border border-hairline bg-surface-1 text-[13px] text-zinc-500 transition-colors hover:border-hairline-strong hover:text-zinc-300',
            expanded ? 'px-2.5' : 'justify-center'
          )}
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          {expanded && (
            <>
              <span className="flex-1 text-left">Rechercher…</span>
              <kbd className="rounded border border-hairline px-1 font-mono text-[10px] text-zinc-500">Ctrl K</kbd>
            </>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col overflow-y-auto px-2 pb-3">
        {navigationGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-4' : 'mt-1'}>
            {group.label && expanded && (
              <p className="px-2.5 pb-1 text-[11px] font-medium text-zinc-600">{group.label}</p>
            )}
            {group.label && !expanded && <div className="mx-2 mb-2 h-px bg-hairline" />}
            <ul className="flex flex-col gap-px">
              {group.items.map((item) => (
                <li key={item.href}>
                  <NavLink item={item} active={isActivePath(pathname, item.href)} expanded={expanded} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="mt-4">
          <NavLink
            item={{ name: 'Paramètres', href: '/settings', icon: Settings }}
            active={isActivePath(pathname, '/settings')}
            expanded={expanded}
            onNavigate={onNavigate}
          />
          {isAdmin && (
            <NavLink
              item={{ name: 'Administration', href: '/admin', icon: Shield }}
              active={isActivePath(pathname, '/admin')}
              expanded={expanded}
              onNavigate={onNavigate}
            />
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-hairline p-2">
        {!isPro && !isAdmin && expanded && (
          <Link
            href="/upgrade"
            onClick={onNavigate}
            className="group mb-2 flex items-center justify-between rounded-md border border-hairline bg-surface-1 px-2.5 py-2 transition-colors hover:border-amber-500/40"
          >
            <span>
              <span className="block text-[13px] font-medium text-zinc-100">Passer à Pro</span>
              <span className="block text-[11px] text-zinc-500">Scans illimités, audits, export</span>
            </span>
            <ArrowUpRight className="h-4 w-4 text-zinc-500 transition-colors group-hover:text-amber-400" />
          </Link>
        )}

        <div className={cn('flex items-center gap-2 rounded-md p-1.5', !expanded && 'flex-col')}>
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[12px] font-semibold text-zinc-200 ring-1 ring-hairline-strong"
            title={!expanded ? `${user?.email ?? ''} · ${plan}` : undefined}
          >
            {user?.email?.charAt(0).toUpperCase() || '?'}
          </div>
          {expanded && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] text-zinc-200">{user?.email?.split('@')[0] || 'Utilisateur'}</p>
              <p className={cn('text-[11px]', isPro || isAdmin ? 'text-amber-400' : 'text-zinc-500')}>Plan {plan}</p>
            </div>
          )}
          <button
            onClick={signOut}
            aria-label="Se déconnecter"
            title="Se déconnecter"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-zinc-200"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>

        {!expanded && (
          <button
            onClick={toggleSidebar}
            aria-label="Déplier la barre latérale"
            className="mx-auto mt-1 hidden h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-zinc-200 md:flex"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}
      </div>
    </aside>
  )
}

function NavLink({
  item,
  active,
  expanded,
  onNavigate,
}: {
  item: NavItem
  active: boolean
  expanded: boolean
  onNavigate?: () => void
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      title={!expanded ? item.name : item.hint}
      className={cn(
        'flex h-8 items-center gap-2.5 rounded-md text-[13px] font-medium transition-colors duration-100',
        expanded ? 'px-2.5' : 'justify-center',
        active ? 'bg-white/[0.07] text-white' : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100'
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-amber-400' : 'text-zinc-500')} />
      {expanded && <span className="truncate">{item.name}</span>}
    </Link>
  )
}

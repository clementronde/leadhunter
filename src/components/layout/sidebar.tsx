'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/lib/store'
import { 
  LayoutDashboard, 
  Users, 
  Radar, 
  Kanban, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  Target,
  Building2
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Leads', href: '/leads', icon: Users },
  { name: 'Scanner', href: '/scanner', icon: Radar },
  { name: 'Pipeline', href: '/pipeline', icon: Kanban },
  { name: 'Paramètres', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  
  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-zinc-950 transition-all duration-300 ease-in-out',
        sidebarOpen ? 'w-64' : 'w-20'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-zinc-800">
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
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
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
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-amber-500/10 text-amber-500'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
              )}
              title={!sidebarOpen ? item.name : undefined}
            >
              <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-amber-500')} />
              {sidebarOpen && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>
      
      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-zinc-800 p-4">
        <div className={cn(
          'flex items-center gap-3',
          !sidebarOpen && 'justify-center'
        )}>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800">
            <Building2 className="h-4 w-4 text-zinc-400" />
          </div>
          {sidebarOpen && (
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white">Artichaud Studio</span>
              <span className="text-xs text-zinc-500">Mode développement</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

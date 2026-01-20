'use client'

import { Bell, Search, Plus, Radar } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useUIStore } from '@/lib/store'

interface HeaderProps {
  title: string
  subtitle?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function Header({ title, subtitle, action }: HeaderProps) {
  const { sidebarOpen, setShowScanModal } = useUIStore()
  
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-200 bg-white/80 backdrop-blur-sm px-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">{title}</h1>
        {subtitle && (
          <p className="text-sm text-zinc-500">{subtitle}</p>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="hidden md:block w-64">
          <Input
            placeholder="Rechercher..."
            icon={<Search size={16} />}
            className="h-9"
          />
        </div>
        
        {/* Quick Scan Button */}
        <Button
          size="sm"
          onClick={() => setShowScanModal(true)}
          className="hidden sm:flex"
        >
          <Radar className="h-4 w-4 mr-1" />
          Scanner
        </Button>
        
        {/* Action Button */}
        {action && (
          <Button onClick={action.onClick} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            {action.label}
          </Button>
        )}
        
        {/* Notifications */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 transition-colors">
          <Bell size={18} />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-medium text-white">
            3
          </span>
        </button>
      </div>
    </header>
  )
}

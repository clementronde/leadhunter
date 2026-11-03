'use client'

import { Bell, Search, Plus, Radar, X, ChevronRight, Zap } from 'lucide-react'
import { Button } from '@/components/ui'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { getScoreColor } from '@/lib/utils'

interface HeaderProps {
  title: string
  subtitle?: string
  action?: {
    label: string
    onClick: () => void
    icon?: React.ReactNode
  }
}

interface HotLead {
  id: string
  name: string
  city: string
  prospect_score: number
  priority: string
}

export function Header({ title, subtitle, action }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifLeads, setNotifLeads] = useState<HotLead[]>([])
  const [notifCount, setNotifCount] = useState(0)
  const [loadingNotifs, setLoadingNotifs] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase
      .from('companies')
      .select('id', { count: 'exact', head: true })
      .in('priority', ['hot', 'warm'])
      .eq('status', 'new')
      .then(({ count }) => setNotifCount(count || 0))
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleNotifToggle = async () => {
    const opening = !showNotifications
    setShowNotifications(opening)
    if (opening && notifLeads.length === 0) {
      setLoadingNotifs(true)
      const { data } = await supabase
        .from('companies')
        .select('id, name, city, prospect_score, priority')
        .in('priority', ['hot', 'warm'])
        .eq('status', 'new')
        .order('prospect_score', { ascending: false })
        .limit(6)
      setNotifLeads((data as HotLead[]) || [])
      setLoadingNotifs(false)
    }
  }

  const isOnScanner = pathname === '/scanner'

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[0.05] bg-[#09090b]/95 backdrop-blur-xl px-5">
      {/* Left: title */}
      <div className="min-w-0 flex-1 mr-4">
        <h1 className="text-base sm:text-lg font-semibold text-white truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs sm:text-sm text-zinc-500 truncate">{subtitle}</p>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Search — opens command palette */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-cmd'))}
          aria-label="Ouvrir la recherche"
          className="hidden md:flex items-center gap-2 w-52 h-8 pl-2.5 pr-2 text-xs bg-zinc-900 border border-white/[0.07] text-zinc-500 rounded-lg hover:border-white/[0.14] hover:text-zinc-400 transition-all"
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-left">Rechercher...</span>
          <kbd className="flex items-center gap-0.5 px-1 py-px rounded border border-white/[0.07] text-[9px] font-mono bg-zinc-950/80 text-zinc-600">
            ⌘K
          </kbd>
        </button>

        {/* Quick Scanner button — masqué si déjà sur /scanner */}
        {!isOnScanner && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push('/scanner')}
            className="hidden sm:flex h-8 text-xs px-3"
          >
            <Radar className="h-3.5 w-3.5" />
            Scanner
          </Button>
        )}

        {/* Custom action button */}
        {action && (
          <Button onClick={action.onClick} size="sm" className="h-8 text-xs px-3">
            {action.icon ?? <Plus className="h-3.5 w-3.5" />}
            {action.label}
          </Button>
        )}

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={handleNotifToggle}
            className={`relative flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
              showNotifications
                ? 'bg-white/[0.07] text-white'
                : 'text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-300'
            }`}
          >
            <Bell size={16} />
            {notifCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-[9px] font-bold text-white px-0.5 shadow-sm shadow-amber-500/40">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-10 w-76 rounded-xl shadow-2xl shadow-black/60 border border-white/[0.07] bg-zinc-900/98 backdrop-blur-2xl overflow-hidden z-50">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
                <div>
                  <h3 className="font-semibold text-white text-sm">Leads à contacter</h3>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Priorités haute et tiède non contactés</p>
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="h-7 w-7 flex items-center justify-center rounded-lg text-zinc-500 hover:bg-white/[0.06] hover:text-white transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {loadingNotifs ? (
                <div className="p-6 text-center text-sm text-zinc-600">Chargement...</div>
              ) : notifLeads.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="h-10 w-10 rounded-full bg-zinc-800/60 flex items-center justify-center mx-auto mb-3">
                    <Zap className="h-5 w-5 text-zinc-600" />
                  </div>
                  <p className="text-sm text-zinc-400 font-medium">Tout est à jour</p>
                  <p className="text-xs text-zinc-600 mt-1">Tous vos leads chauds ont été contactés 🎉</p>
                </div>
              ) : (
                <div>
                  {notifLeads.map((lead) => (
                    <Link
                      key={lead.id}
                      href={`/leads/${lead.id}`}
                      onClick={() => setShowNotifications(false)}
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.04] transition-colors border-b border-white/[0.03] last:border-0 group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-200 group-hover:text-white truncate transition-colors">
                          {lead.name}
                        </p>
                        <p className="text-[11px] text-zinc-600">
                          {lead.city} · {lead.priority === 'hot' ? '🔥 Chaud' : '🌤️ Tiède'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 ml-3 shrink-0">
                        <span className={`text-sm font-bold tabular-nums ${getScoreColor(lead.prospect_score)}`}>
                          {lead.prospect_score}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                      </div>
                    </Link>
                  ))}
                  <div className="px-4 py-2.5 border-t border-white/[0.04]">
                    <Link
                      href="/leads?priority=hot&status=new"
                      onClick={() => setShowNotifications(false)}
                      className="block text-center text-xs font-medium text-amber-500 hover:text-amber-400 transition-colors"
                    >
                      Voir tous les leads chauds →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

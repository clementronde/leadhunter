'use client'

import { Bell, Search, Plus, Radar, X, ChevronRight, Zap } from 'lucide-react'
import { Button } from '@/components/ui'
import { useRouter } from 'next/navigation'
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

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl px-6">
      <div>
        <h1 className="text-xl font-bold text-white">{title}</h1>
        {subtitle && (
          <p className="text-sm text-zinc-500">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Search — opens command palette */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-cmd'))}
          className="hidden md:flex items-center gap-2 w-64 h-9 pl-3 pr-2 text-sm bg-zinc-800/60 border border-white/[0.08] text-zinc-500 rounded-lg hover:border-white/20 hover:text-zinc-400 transition-colors"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Rechercher...</span>
          <kbd className="flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-white/[0.08] text-[10px] font-mono bg-zinc-900/60">
            ⌘K
          </kbd>
        </button>

        {/* Quick Scan Button */}
        <Button
          size="sm"
          onClick={() => router.push('/scanner')}
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
        <div ref={notifRef} className="relative">
          <button
            onClick={handleNotifToggle}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <Bell size={18} />
            {notifCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 text-[10px] font-medium text-white px-0.5">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-11 w-80 rounded-xl shadow-2xl shadow-black/50 border border-white/[0.08] bg-zinc-900/95 backdrop-blur-xl overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                <div>
                  <h3 className="font-semibold text-white text-sm">Leads à contacter</h3>
                  <p className="text-xs text-zinc-500">Priorités haute et tiède non contactés</p>
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-1 rounded hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {loadingNotifs ? (
                <div className="p-6 text-center text-sm text-zinc-500">Chargement...</div>
              ) : notifLeads.length === 0 ? (
                <div className="p-6 text-center">
                  <Zap className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-sm text-zinc-400">Aucun lead prioritaire en attente</p>
                  <p className="text-xs text-zinc-600 mt-1">Tous vos leads chauds ont été contactés 🎉</p>
                </div>
              ) : (
                <div>
                  {notifLeads.map((lead) => (
                    <Link
                      key={lead.id}
                      href={`/leads/${lead.id}`}
                      onClick={() => setShowNotifications(false)}
                      className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/[0.04] last:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{lead.name}</p>
                        <p className="text-xs text-zinc-500">
                          {lead.city} · {lead.priority === 'hot' ? '🔥 Chaud' : '🌤️ Tiède'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 ml-2 shrink-0">
                        <span className={`text-sm font-bold ${getScoreColor(lead.prospect_score)}`}>
                          {lead.prospect_score}
                        </span>
                        <ChevronRight className="h-4 w-4 text-zinc-600" />
                      </div>
                    </Link>
                  ))}
                  <div className="px-4 py-3 border-t border-white/[0.06]">
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

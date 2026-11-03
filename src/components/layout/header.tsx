'use client'

import { Bell, Plus, Radar, X, ChevronRight, Zap } from 'lucide-react'
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
    <header className="sticky top-12 z-20 flex min-h-14 items-center justify-between gap-4 border-b border-hairline bg-canvas/95 px-4 py-2.5 md:top-0 md:px-6">
      {/* Left: title */}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-white">{title}</h1>
        {subtitle && (
          <p className="truncate text-[13px] text-zinc-500">{subtitle}</p>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Quick Scanner button — masqué si déjà sur /scanner */}
        {!isOnScanner && (
          <Button
            variant="outline"
            onClick={() => router.push('/scanner')}
            size="sm" className="hidden sm:inline-flex"
          >
            <Radar className="h-3.5 w-3.5" />
            Scanner
          </Button>
        )}

        {/* Custom action button */}
        {action && (
          <Button onClick={action.onClick} size="sm">
            {action.icon ?? <Plus className="h-3.5 w-3.5" />}
            {action.label}
          </Button>
        )}

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={handleNotifToggle}
            aria-label="Leads à contacter" aria-expanded={showNotifications} className={`relative flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
              showNotifications
                ? 'bg-white/[0.07] text-white'
                : 'text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-300'
            }`}
          >
            <Bell size={16} />
            {notifCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-on-accent px-0.5">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-10 z-50 w-80 overflow-hidden rounded-xl border border-hairline-strong bg-surface-2 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.7)]">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-hairline">
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
                  <div className="h-10 w-10 rounded-full bg-surface-2 flex items-center justify-center mx-auto mb-3">
                    <Zap className="h-5 w-5 text-zinc-600" />
                  </div>
                  <p className="text-sm text-zinc-400 font-medium">Tout est à jour</p>
                  <p className="text-xs text-zinc-600 mt-1">Tous vos leads chauds ont été contactés.</p>
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
                          {lead.city} · {lead.priority === 'hot' ? 'Chaud' : 'Tiède'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 ml-3 shrink-0">
                        <span className={`font-mono text-[13px] font-medium tabular-nums ${getScoreColor(lead.prospect_score)}`}>
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
                      Voir tous les leads chauds
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

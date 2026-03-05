'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { leadsApi } from '@/lib/api'
import { Company } from '@/types'
import {
  Search,
  LayoutDashboard,
  Users,
  Radar,
  Kanban,
  Settings,
  Globe2,
  Globe,
  X,
  ArrowRight,
} from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard, description: 'Vue d\'ensemble' },
  { label: 'Leads', href: '/leads', icon: Users, description: 'Gérer vos prospects' },
  { label: 'Scanner', href: '/scanner', icon: Radar, description: 'Lancer un scan' },
  { label: 'Pipeline', href: '/pipeline', icon: Kanban, description: 'Pipeline CRM' },
  { label: 'Paramètres', href: '/settings', icon: Settings, description: 'Configuration' },
]

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [leads, setLeads] = useState<Company[]>([])
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredNav = query
    ? NAV_ITEMS.filter(
        (n) =>
          n.label.toLowerCase().includes(query.toLowerCase()) ||
          n.description.toLowerCase().includes(query.toLowerCase())
      )
    : NAV_ITEMS

  const allResults = [
    ...filteredNav.map((n) => ({ type: 'nav' as const, ...n })),
    ...leads.map((l) => ({ type: 'lead' as const, label: l.name, href: `/leads/${l.id}`, description: `${l.city} · ${l.has_website ? 'Avec site' : 'Sans site'}`, has_website: l.has_website })),
  ]

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setLeads([])
      setSelectedIndex(0)
    }
  }, [open])

  useEffect(() => {
    setSelectedIndex(0)
    if (!query.trim()) { setLeads([]); return }
    const timeout = setTimeout(async () => {
      setLoadingLeads(true)
      try {
        const res = await leadsApi.getAll({ search: query }, 1, 6)
        setLeads(res.data)
      } catch {}
      setLoadingLeads(false)
    }, 250)
    return () => clearTimeout(timeout)
  }, [query])

  const navigate = useCallback((href: string) => {
    router.push(href)
    onClose()
  }, [router, onClose])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, allResults.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)) }
      if (e.key === 'Enter' && allResults[selectedIndex]) { navigate(allResults[selectedIndex].href) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, allResults, selectedIndex, navigate, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-lg rounded-2xl border border-white/[0.1] bg-zinc-900/95 backdrop-blur-xl shadow-2xl shadow-black/70 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06]">
          <Search className="h-4 w-4 text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un lead, une page..."
            className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-zinc-600 hover:text-zinc-400">
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-white/[0.08] text-[10px] text-zinc-600 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {allResults.length === 0 && !loadingLeads && (
            <p className="px-4 py-8 text-center text-sm text-zinc-600">
              Aucun résultat pour &quot;{query}&quot;
            </p>
          )}

          {/* Nav group */}
          {filteredNav.length > 0 && (
            <div>
              {query === '' && (
                <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                  Navigation
                </p>
              )}
              {filteredNav.map((item, i) => {
                const isSelected = selectedIndex === i
                return (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      isSelected ? 'bg-amber-500/15 text-amber-400' : 'text-zinc-300 hover:bg-white/5'
                    }`}
                  >
                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${isSelected ? 'bg-amber-500/20' : 'bg-zinc-800'}`}>
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-zinc-500 truncate">{item.description}</p>
                    </div>
                    {isSelected && <ArrowRight className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                  </button>
                )
              })}
            </div>
          )}

          {/* Leads group */}
          {(leads.length > 0 || loadingLeads) && (
            <div>
              <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                Leads
              </p>
              {loadingLeads && leads.length === 0 && (
                <p className="px-4 py-3 text-sm text-zinc-600">Recherche...</p>
              )}
              {leads.map((lead, i) => {
                const idx = filteredNav.length + i
                const isSelected = selectedIndex === idx
                return (
                  <button
                    key={lead.id}
                    onClick={() => navigate(`/leads/${lead.id}`)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      isSelected ? 'bg-amber-500/15 text-amber-400' : 'text-zinc-300 hover:bg-white/5'
                    }`}
                  >
                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${isSelected ? 'bg-amber-500/20' : 'bg-zinc-800'}`}>
                      {lead.has_website
                        ? <Globe className="h-4 w-4 text-zinc-400" />
                        : <Globe2 className="h-4 w-4 text-amber-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{lead.name}</p>
                      <p className="text-xs text-zinc-500 truncate">{lead.city} · {lead.has_website ? 'Avec site' : 'Sans site'}</p>
                    </div>
                    {isSelected && <ArrowRight className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/[0.06] px-4 py-2 flex items-center gap-4 text-[10px] text-zinc-600">
          <span><kbd className="font-mono">↑↓</kbd> naviguer</span>
          <span><kbd className="font-mono">↵</kbd> ouvrir</span>
          <span><kbd className="font-mono">ESC</kbd> fermer</span>
        </div>
      </div>
    </div>
  )
}

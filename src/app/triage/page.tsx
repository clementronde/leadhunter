'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, type PanInfo } from 'framer-motion'
import { Header } from '@/components/layout'
import { Card, CardContent, Button, Skeleton } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { leadsApi } from '@/lib/api'
import { cn, getScoreColor, pickAudit, sectorLabels } from '@/lib/utils'
import { webPresenceLabels } from '@/lib/web-presence'
import type { Company, UpdateCompanyInput } from '@/types'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  ExternalLink,
  Flame,
  Globe,
  Mail,
  MapPin,
  Phone,
  Star,
  Undo2,
} from 'lucide-react'

type Decision = 'keep' | 'hot' | 'reject' | 'skip'

interface HistoryEntry {
  lead: Company
  decision: Decision
  previous: UpdateCompanyInput
}

const BATCH_SIZE = 40

const DECISIONS: Record<Exclude<Decision, 'skip'>, (lead: Company) => UpdateCompanyInput> = {
  keep: () => ({ triaged_at: new Date().toISOString() }),
  hot: () => ({ triaged_at: new Date().toISOString(), priority: 'hot' }),
  reject: () => ({ triaged_at: new Date().toISOString(), status: 'lost' }),
}

// Direction de sortie de la carte selon la décision
const EXIT: Record<Decision, { x: number; y: number }> = {
  keep: { x: 500, y: 0 },
  hot: { x: 0, y: -500 },
  reject: { x: -500, y: 0 },
  skip: { x: 0, y: 500 },
}

// La carte qui sort reçoit la décision via le `custom` d'AnimatePresence
const cardVariants = {
  enter: { opacity: 0, scale: 0.96 },
  center: { opacity: 1, scale: 1, x: 0, y: 0 },
  exit: (decision: Decision) => ({ opacity: 0, ...EXIT[decision], transition: { duration: 0.2 } }),
}

function toCompany(row: Record<string, unknown>): Company {
  const audit = pickAudit(row.website_audits as Company['audit'] | Company['audit'][] | undefined)
  return { ...(row as unknown as Company), audit, notes: [] }
}

export default function TriagePage() {
  const router = useRouter()
  const [queue, setQueue] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [lastDecision, setLastDecision] = useState<Decision>('keep')
  const [sessionCount, setSessionCount] = useState({ kept: 0, rejected: 0 })
  const seenIds = useRef(new Set<string>())

  const load = useCallback(async () => {
    const { data, count } = await supabase
      .from('companies')
      .select('*, website_audits(*)', { count: 'exact' })
      .eq('status', 'new')
      .eq('do_not_contact', false)
      .is('triaged_at', null)
      .order('prospect_score', { ascending: false })
      .limit(BATCH_SIZE)

    const fresh = (data ?? []).map(toCompany).filter((lead) => !seenIds.current.has(lead.id))
    fresh.forEach((lead) => seenIds.current.add(lead.id))
    setQueue((current) => [...current, ...fresh])
    setRemaining(count ?? null)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const current = queue[0]

  const decide = useCallback(
    async (decision: Decision) => {
      if (!current) return
      setLastDecision(decision)
      setQueue((items) => {
        const [first, ...rest] = items
        // "Passer" remet le lead en fin de file pour cette session
        return decision === 'skip' ? [...rest, first] : rest
      })
      if (decision === 'skip') return

      const update = DECISIONS[decision](current)
      const previous: UpdateCompanyInput = {
        triaged_at: current.triaged_at ?? null,
        status: current.status,
        priority: current.priority,
      }
      setHistory((entries) => [...entries.slice(-19), { lead: current, decision, previous }])
      setSessionCount((counts) =>
        decision === 'reject' ? { ...counts, rejected: counts.rejected + 1 } : { ...counts, kept: counts.kept + 1 }
      )
      setRemaining((count) => (count === null ? null : Math.max(0, count - 1)))
      await leadsApi.update(current.id, update)

      if (queue.length <= 5) load()
    },
    [current, queue.length, load]
  )

  const undo = useCallback(async () => {
    const entry = history[history.length - 1]
    if (!entry) return
    setHistory((entries) => entries.slice(0, -1))
    setLastDecision('skip')
    setQueue((items) => [entry.lead, ...items.filter((lead) => lead.id !== entry.lead.id)])
    setSessionCount((counts) =>
      entry.decision === 'reject' ? { ...counts, rejected: counts.rejected - 1 } : { ...counts, kept: counts.kept - 1 }
    )
    setRemaining((count) => (count === null ? null : count + 1))
    await leadsApi.update(entry.lead.id, entry.previous)
  }, [history])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (event.metaKey || event.altKey) return

      if ((event.ctrlKey && event.key.toLowerCase() === 'z') || event.key === 'Backspace') {
        event.preventDefault()
        undo()
        return
      }
      if (event.ctrlKey) return

      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault()
          decide('keep')
          break
        case 'ArrowLeft':
          event.preventDefault()
          decide('reject')
          break
        case 'ArrowUp':
          event.preventDefault()
          decide('hot')
          break
        case 'ArrowDown':
        case ' ':
          event.preventDefault()
          decide('skip')
          break
        case 'Enter':
          if (current) router.push(`/leads/${current.id}`)
          break
        case 'o':
        case 'O': {
          const link = current?.website || current?.social_url || current?.google_maps_url
          if (link) window.open(link, '_blank', 'noopener')
          break
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [decide, undo, current, router])

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 120) decide('keep')
    else if (info.offset.x < -120) decide('reject')
    else if (info.offset.y < -120) decide('hot')
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Tri des leads"
        subtitle="Validez les nouveaux leads un par un, au clavier ou en glissant la carte"
      />

      <div className="p-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-400">
            <span>
              {remaining === null ? '…' : `${remaining} lead${remaining > 1 ? 's' : ''} à trier`}
            </span>
            <span>
              Cette session : <span className="text-emerald-400">{sessionCount.kept} gardé(s)</span> ·{' '}
              <span className="text-red-400">{sessionCount.rejected} écarté(s)</span>
            </span>
          </div>

          <div className="relative min-h-[420px]">
            {loading ? (
              <Skeleton className="h-[420px]" />
            ) : !current ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
                  <p className="font-semibold text-white">Tous les nouveaux leads sont triés</p>
                  <p className="mt-1 text-sm text-zinc-500">Les leads gardés sont prêts dans « Aujourd&apos;hui ».</p>
                  <div className="mt-4 flex justify-center gap-2">
                    <Link href="/today"><Button>Voir mes actions du jour</Button></Link>
                    <Link href="/scanner"><Button variant="outline">Lancer un scan</Button></Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <AnimatePresence mode="popLayout" custom={lastDecision}>
                <motion.div
                  key={current.id}
                  custom={lastDecision}
                  variants={cardVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  drag
                  dragSnapToOrigin
                  dragElastic={0.6}
                  onDragEnd={onDragEnd}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <LeadCard lead={current} />
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {current && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Button variant="outline" onClick={() => decide('reject')} className="text-red-400">
                <ArrowLeft className="h-4 w-4" /> Écarter
              </Button>
              <Button variant="outline" onClick={() => decide('skip')}>
                <ArrowDown className="h-4 w-4" /> Passer
              </Button>
              <Button variant="outline" onClick={() => decide('hot')} className="text-amber-400">
                <ArrowUp className="h-4 w-4" /> Prioritaire
              </Button>
              <Button onClick={() => decide('keep')}>
                Garder <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-zinc-500">
            <Shortcut keys="→">garder</Shortcut>
            <Shortcut keys="←">écarter</Shortcut>
            <Shortcut keys="↑">prioritaire</Shortcut>
            <Shortcut keys="↓ / Espace">passer</Shortcut>
            <Shortcut keys="O">ouvrir le site</Shortcut>
            <Shortcut keys="Entrée">fiche</Shortcut>
            <button
              onClick={undo}
              disabled={history.length === 0}
              className="inline-flex items-center gap-1 hover:text-zinc-300 disabled:opacity-40"
            >
              <Undo2 className="h-3 w-3" /> <kbd className="font-mono">Ctrl+Z</kbd> annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Shortcut({ keys, children }: { keys: string; children: React.ReactNode }) {
  return (
    <span>
      <kbd className="rounded border border-white/[0.1] bg-zinc-800 px-1.5 py-0.5 font-mono text-zinc-300">{keys}</kbd>{' '}
      {children}
    </span>
  )
}

function LeadCard({ lead }: { lead: Company }) {
  const audit = lead.audit
  const presence = lead.web_presence ?? (lead.has_website ? 'website' : 'unknown')
  const siteLink = lead.website || lead.social_url

  return (
    <Card className="select-none">
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold text-white">{lead.name}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-400">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {[lead.address, lead.postal_code, lead.city].filter(Boolean).join(' · ')}
            </p>
            {lead.sector && <p className="mt-1 text-xs text-zinc-500">{sectorLabels[lead.sector]}</p>}
          </div>
          <div className="text-right">
            <p className={cn('text-3xl font-bold', getScoreColor(lead.prospect_score))}>{lead.prospect_score}</p>
            <p className="text-xs text-zinc-500">score</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className={cn(
            'rounded-full border px-2.5 py-1',
            presence === 'website' ? 'border-white/[0.1] text-zinc-300' : 'border-amber-500/30 text-amber-400'
          )}>
            <Globe className="mr-1 inline h-3 w-3" />
            {webPresenceLabels[presence]}
          </span>
          {lead.google_reviews_count != null && (
            <span className="rounded-full border border-white/[0.1] px-2.5 py-1 text-zinc-300">
              <Star className="mr-1 inline h-3 w-3 text-amber-400" />
              {lead.google_rating ?? '–'} · {lead.google_reviews_count} avis
            </span>
          )}
          {lead.priority === 'hot' && (
            <span className="rounded-full border border-red-500/30 px-2.5 py-1 text-red-400">
              <Flame className="mr-1 inline h-3 w-3" /> Chaud
            </span>
          )}
        </div>

        {lead.score_reasons && lead.score_reasons.length > 0 && (
          <ul className="space-y-1 text-sm text-zinc-300">
            {lead.score_reasons.map((reason) => (
              <li key={reason} className="flex gap-2">
                <span className="text-amber-500">•</span> {reason}
              </li>
            ))}
          </ul>
        )}

        {audit && (audit.screenshot_url || audit.design_verdict) && (
          <div className="flex gap-3 rounded-lg bg-zinc-800/60 p-3">
            {audit.screenshot_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={audit.screenshot_url}
                alt=""
                draggable={false}
                className="max-h-40 w-24 rounded border border-white/[0.08] object-cover object-top"
              />
            )}
            <div className="min-w-0 text-sm">
              {audit.design_score ? (
                <p className="font-medium text-white">Design {audit.design_score}/10</p>
              ) : null}
              {audit.design_verdict && <p className="mt-1 text-zinc-400">{audit.design_verdict}</p>}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-white/[0.05] pt-3 text-sm text-zinc-400">
          {lead.phone && <span><Phone className="mr-1 inline h-3.5 w-3.5" />{lead.phone}</span>}
          {lead.email && <span><Mail className="mr-1 inline h-3.5 w-3.5" />{lead.email}</span>}
          {siteLink && (
            <a
              href={siteLink}
              target="_blank"
              rel="noreferrer"
              onPointerDown={(event) => event.stopPropagation()}
              className="truncate text-amber-400 hover:underline"
            >
              <ExternalLink className="mr-1 inline h-3.5 w-3.5" />
              {siteLink.replace(/^https?:\/\/(www\.)?/, '')}
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

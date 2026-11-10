'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { Header } from '@/components/layout'
import { Card, CardContent, Button, Skeleton } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { leadsApi } from '@/lib/api'
import { buildPersonalizedReason } from '@/lib/email-templates'
import { cn, getScoreColor, pickAudit, sectorLabels, timeAgo } from '@/lib/utils'
import { webPresenceLabels } from '@/lib/web-presence'
import type { CallOutcome, Company, LeadStatus, UpdateCompanyInput } from '@/types'
import {
  CalendarCheck,
  CheckCircle2,
  Copy,
  ExternalLink,
  MapPin,
  Phone,
  PhoneMissed,
  PhoneOff,
  RotateCcw,
  SkipForward,
  Star,
  ThumbsDown,
  ThumbsUp,
  Undo2,
  Clock,
} from 'lucide-react'

// ============================================
// Résultats d'appel
// ============================================
const DAY = 24 * 60 * 60 * 1000

function at9h(daysFromNow: number): string {
  const d = new Date(Date.now() + daysFromNow * DAY)
  d.setHours(9, 0, 0, 0)
  return d.toISOString()
}

interface OutcomeDef {
  id: CallOutcome
  label: string
  key: string
  icon: React.ComponentType<{ className?: string }>
  tone: string // classes du bouton
  pill: string // classes de la pastille
}

const OUTCOMES: OutcomeDef[] = [
  { id: 'meeting', label: 'RDV pris', key: '1', icon: CalendarCheck, tone: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20', pill: 'bg-emerald-500/15 text-emerald-300' },
  { id: 'interested', label: 'Intéressé', key: '2', icon: ThumbsUp, tone: 'border-sky-500/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20', pill: 'bg-sky-500/15 text-sky-300' },
  { id: 'callback', label: 'À rappeler', key: '3', icon: Clock, tone: 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20', pill: 'bg-amber-500/15 text-amber-300' },
  { id: 'no_answer', label: 'Pas de réponse', key: '4', icon: PhoneMissed, tone: 'border-white/[0.12] bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]', pill: 'bg-zinc-700/60 text-zinc-300' },
  { id: 'not_interested', label: 'Pas intéressé', key: '5', icon: ThumbsDown, tone: 'border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20', pill: 'bg-red-500/15 text-red-300' },
  { id: 'wrong_number', label: 'Faux numéro', key: '6', icon: PhoneOff, tone: 'border-white/[0.12] bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08]', pill: 'bg-zinc-800 text-zinc-400' },
]
const OUTCOME = Object.fromEntries(OUTCOMES.map((o) => [o.id, o])) as Record<CallOutcome, OutcomeDef>

const CALLBACK_CHOICES = [
  { label: 'Demain', key: '1', days: 1 },
  { label: 'Dans 3 jours', key: '2', days: 3 },
  { label: 'Dans 1 semaine', key: '3', days: 7 },
]

// Au bout de 3 appels sans réponse, on arrête de le remettre dans la file
const MAX_NO_ANSWER = 3
// Colonnes du tableau (comme un tableur : une colonne par étape)
type BoardColumn = 'todo' | 'waiting' | 'callback' | 'meeting' | 'done'

const COLUMNS: { id: BoardColumn; label: string; accent: string; button: string }[] = [
  { id: 'todo', label: 'À appeler', accent: 'border-t-amber-500', button: 'À appeler' },
  { id: 'waiting', label: 'En attente', accent: 'border-t-sky-500', button: 'En attente' },
  { id: 'callback', label: 'À rappeler', accent: 'border-t-orange-400', button: 'À rappeler' },
  { id: 'meeting', label: 'RDV pris', accent: 'border-t-emerald-500', button: 'RDV' },
  { id: 'done', label: 'Pas intéressé', accent: 'border-t-zinc-600', button: 'Non' },
]

const COLUMN_OUTCOME: Record<Exclude<BoardColumn, 'todo'>, CallOutcome> = {
  waiting: 'interested',
  callback: 'callback',
  meeting: 'meeting',
  done: 'not_interested',
}

function columnOf(lead: Company): BoardColumn {
  switch (lead.last_call_outcome) {
    case 'interested':
      return 'waiting'
    case 'callback':
    case 'no_answer':
      return 'callback'
    case 'meeting':
      return 'meeting'
    case 'not_interested':
    case 'wrong_number':
      return 'done'
    default:
      return 'todo'
  }
}

const REACHED: CallOutcome[] =['meeting', 'interested', 'callback', 'not_interested']
const BATCH = 40
const LEAD_SELECT = '*, website_audits(*)'
const ACTIVE_STATUSES: LeadStatus[] = ['new', 'contacted']

// ============================================
// Utilitaires
// ============================================
function toCompany(row: Record<string, unknown>): Company {
  const audit = pickAudit(row.website_audits as Company['audit'] | Company['audit'][] | undefined)
  return { ...(row as unknown as Company), audit, notes: [] }
}

function normPhone(phone: string | null | undefined): string {
  let digits = (phone ?? '').replace(/\D/g, '')
  if (digits.startsWith('0033')) digits = '0' + digits.slice(4)
  else if (digits.startsWith('33') && digits.length === 11) digits = '0' + digits.slice(2)
  return digits
}

function formatPhone(phone: string | null | undefined): string {
  const digits = normPhone(phone)
  if (/^0\d{9}$/.test(digits)) return digits.replace(/(\d{2})(?=\d)/g, '$1 ')
  return phone ?? ''
}

function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

function callFields(lead: Company): UpdateCompanyInput {
  return {
    status: lead.status,
    last_contacted_at: lead.last_contacted_at,
    call_count: lead.call_count ?? 0,
    last_call_at: lead.last_call_at ?? null,
    last_call_outcome: lead.last_call_outcome ?? null,
    callback_at: lead.callback_at ?? null,
  }
}

function buildUpdate(lead: Company, outcome: CallOutcome, callbackDays?: number): UpdateCompanyInput {
  const now = new Date().toISOString()
  const count = (lead.call_count ?? 0) + 1
  const base: UpdateCompanyInput = { call_count: count, last_call_at: now, last_call_outcome: outcome }
  const reached = lead.status === 'new' ? 'contacted' : lead.status

  switch (outcome) {
    case 'meeting':
      return { ...base, status: 'meeting', last_contacted_at: now, callback_at: null }
    case 'interested':
      return { ...base, status: reached, last_contacted_at: now, callback_at: at9h(2) }
    case 'callback':
      return { ...base, status: reached, last_contacted_at: now, callback_at: at9h(callbackDays ?? 1) }
    case 'no_answer':
      return { ...base, callback_at: count < MAX_NO_ANSWER ? at9h(1) : null }
    case 'not_interested':
      return { ...base, status: 'lost', last_contacted_at: now, callback_at: null }
    case 'wrong_number':
      return { ...base, callback_at: null }
  }
}

interface HistoryEntry {
  lead: Company
  previous: UpdateCompanyInput
  noteId: string | null
}

// ============================================
// Page
// ============================================
export default function CallsPage() {
  const [queue, setQueue] = useState<Company[]>([])
  const [called, setCalled] = useState<Company[]>([])
  const [remaining, setRemaining] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [skippedDuplicates, setSkippedDuplicates] = useState(0)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [note, setNote] = useState('')
  const [choosingCallback, setChoosingCallback] = useState(false)
  const [panel, setPanel] = useState<'queue' | 'called'>('called')
  const [filter, setFilter] = useState<CallOutcome | 'all'>('all')
  const [copied, setCopied] = useState(false)
  const [view, setView] = useState<'board' | 'session'>('board')

  const seenIds = useRef(new Set<string>())
  const calledPhones = useRef(new Set<string>())
  const userId = useRef<string | null>(null)
  const noteRef = useRef<HTMLTextAreaElement>(null)
  const busy = useRef(false)

  const current = queue[0]

  // ---------- chargement ----------
  const loadCalled = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('companies')
      .select(LEAD_SELECT)
      .not('last_call_at', 'is', null)
      .order('last_call_at', { ascending: false })
      .limit(200)
    if (err) throw err
    const rows = (data ?? []).map(toCompany)
    rows.forEach((lead) => {
      const phone = normPhone(lead.phone)
      if (phone.length >= 6) calledPhones.current.add(phone)
    })
    setCalled(rows)
  }, [])

  const loadQueue = useCallback(async () => {
    const nowIso = new Date().toISOString()
    const [due, fresh] = await Promise.all([
      // Rappels arrivés à échéance
      supabase
        .from('companies')
        .select(LEAD_SELECT)
        .lte('callback_at', nowIso)
        .eq('do_not_contact', false)
        .in('status', ACTIVE_STATUSES)
        .order('callback_at', { ascending: true })
        .limit(BATCH),
      // Jamais appelés, les meilleurs scores d'abord
      supabase
        .from('companies')
        .select(LEAD_SELECT, { count: 'exact' })
        .is('last_call_at', null)
        .not('phone', 'is', null)
        .eq('do_not_contact', false)
        .in('status', ACTIVE_STATUSES)
        .order('prospect_score', { ascending: false })
        .limit(BATCH),
    ])
    if (due.error) throw due.error
    if (fresh.error) throw fresh.error

    let duplicates = 0
    const queuedPhones = new Set<string>()
    const next: Company[] = []
    for (const lead of [...(due.data ?? []), ...(fresh.data ?? [])].map(toCompany)) {
      if (seenIds.current.has(lead.id)) continue
      const phone = normPhone(lead.phone)
      const isFresh = !lead.last_call_at
      // Même numéro qu'un prospect déjà appelé ou déjà dans la file : on ne l'appelle pas deux fois
      if (phone.length >= 6 && (queuedPhones.has(phone) || (isFresh && calledPhones.current.has(phone)))) {
        duplicates++
        continue
      }
      if (phone.length >= 6) queuedPhones.add(phone)
      seenIds.current.add(lead.id)
      next.push(lead)
    }
    setQueue((items) => [...items, ...next])
    setRemaining((fresh.count ?? 0) + (due.data?.length ?? 0))
    setSkippedDuplicates((n) => n + duplicates)
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await supabase.auth.getUser()
        userId.current = data.user?.id ?? null
        await loadCalled()
        await loadQueue()
      } catch (err) {
        const message = err instanceof Error ? err.message : String((err as { message?: string })?.message ?? err)
        setError(
          message.includes('last_call_at') || message.includes('callback_at') || message.includes('call_count')
            ? "La base n'a pas encore les colonnes d'appel. Exécutez supabase-migration-2026-11-10.sql dans l'éditeur SQL Supabase, puis rechargez la page."
            : `Chargement impossible : ${message}`
        )
      } finally {
        setLoading(false)
      }
    })()
  }, [loadCalled, loadQueue])

  // ---------- actions ----------
  // Enregistre le résultat d'un appel pour n'importe quel prospect (session ou tableau)
  const applyOutcome = useCallback(
    async (lead: Company, outcome: CallOutcome, callbackDays?: number, text = '') => {
      const update = buildUpdate(lead, outcome, callbackDays)
      const previous = callFields(lead)
      const wasQueued = !lead.last_call_outcome

      setQueue((items) => items.filter((l) => l.id !== lead.id))
      if (wasQueued) setRemaining((n) => (n === null ? null : Math.max(0, n - 1)))
      setCalled((items) => [{ ...lead, ...update } as Company, ...items.filter((l) => l.id !== lead.id)])
      const phone = normPhone(lead.phone)
      if (phone.length >= 6) calledPhones.current.add(phone)

      try {
        await leadsApi.update(lead.id, update)
        // Les statuts RDV / perdu stoppent les relances email programmées
        if (update.status && update.status !== lead.status && (update.status === 'meeting' || update.status === 'lost')) {
          await leadsApi.updateStatus(lead.id, update.status)
        }
        let noteId: string | null = null
        if (userId.current) {
          const { data } = await supabase
            .from('notes')
            .insert({
              user_id: userId.current,
              company_id: lead.id,
              content: `Appel · ${OUTCOME[outcome].label}${text ? ` — ${text}` : ''}`,
            })
            .select('id')
            .single()
          noteId = (data?.id as string | undefined) ?? null
        }
        setHistory((entries) => [...entries.slice(-19), { lead, previous, noteId }])
      } catch {
        setError("L'appel n'a pas pu être enregistré. Vérifiez votre connexion puis réessayez.")
        if (wasQueued) setQueue((items) => [lead, ...items])
        setCalled((items) => (wasQueued ? items.filter((l) => l.id !== lead.id) : items.map((l) => (l.id === lead.id ? lead : l))))
      }
    },
    []
  )

  const record = useCallback(
    async (outcome: CallOutcome, callbackDays?: number) => {
      if (!current || busy.current) return
      busy.current = true
      const text = note.trim()
      setNote('')
      setChoosingCallback(false)
      await applyOutcome(current, outcome, callbackDays, text)
      busy.current = false
      if (queue.length <= 5) loadQueue().catch(() => {})
    },
    [current, note, queue.length, loadQueue, applyOutcome]
  )

  // Remet un prospect dans la colonne « À appeler » (son historique d'appels est gardé)
  const backToTodo = useCallback(async (lead: Company) => {
    const update: UpdateCompanyInput = { last_call_outcome: null, callback_at: null }
    setCalled((items) => items.filter((l) => l.id !== lead.id))
    setQueue((items) => [...items.filter((l) => l.id !== lead.id), { ...lead, ...update }])
    seenIds.current.add(lead.id)
    await leadsApi.update(lead.id, update)
  }, [])

  const moveTo = useCallback(
    (lead: Company, column: BoardColumn) => {
      if (columnOf(lead) === column) return
      if (column === 'todo') backToTodo(lead)
      else applyOutcome(lead, COLUMN_OUTCOME[column], column === 'callback' ? 1 : undefined)
    },
    [applyOutcome, backToTodo]
  )

  const skip = useCallback(() => {
    setQueue((items) => (items.length > 1 ? [...items.slice(1), items[0]] : items))
    setNote('')
    setChoosingCallback(false)
  }, [])

  const undo = useCallback(async () => {
    const entry = history[history.length - 1]
    if (!entry) return
    setHistory((entries) => entries.slice(0, -1))
    setQueue((items) => [entry.lead, ...items.filter((l) => l.id !== entry.lead.id)])
    setCalled((items) => items.filter((l) => l.id !== entry.lead.id))
    setRemaining((n) => (n === null ? null : n + 1))
    await leadsApi.update(entry.lead.id, entry.previous)
    if (entry.noteId) await supabase.from('notes').delete().eq('id', entry.noteId)
  }, [history])

  const requeue = useCallback(async (lead: Company) => {
    const update: UpdateCompanyInput = { callback_at: new Date().toISOString() }
    setCalled((items) => items.map((l) => (l.id === lead.id ? { ...l, ...update } : l)))
    setQueue((items) => [...items.slice(0, 1), { ...lead, ...update }, ...items.slice(1).filter((l) => l.id !== lead.id)])
    seenIds.current.add(lead.id)
    await leadsApi.update(lead.id, update)
  }, [])

  const copyPhone = useCallback(async () => {
    if (!current?.phone) return
    try {
      await navigator.clipboard.writeText(normPhone(current.phone) || current.phone)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      // le numéro reste sélectionnable à la main
    }
  }, [current])

  // ---------- clavier ----------
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        if (event.key === 'Escape') target.blur()
        return
      }
      if (event.metaKey || event.altKey) return
      if (event.ctrlKey && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        undo()
        return
      }
      if (event.ctrlKey || !current || view !== 'session') return

      if (choosingCallback) {
        const choice = CALLBACK_CHOICES.find((c) => c.key === event.key)
        if (choice) {
          event.preventDefault()
          record('callback', choice.days)
        } else if (event.key === 'Escape') setChoosingCallback(false)
        return
      }

      const outcome = OUTCOMES.find((o) => o.key === event.key)
      if (outcome) {
        event.preventDefault()
        if (outcome.id === 'callback') setChoosingCallback(true)
        else record(outcome.id)
        return
      }
      switch (event.key.toLowerCase()) {
        case 'a':
        case 'enter':
          if (current.phone) window.location.href = telHref(current.phone)
          break
        case 's':
        case ' ':
          event.preventDefault()
          skip()
          break
        case 'n':
          event.preventDefault()
          noteRef.current?.focus()
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, choosingCallback, record, skip, undo, view])

  // ---------- chiffres du jour ----------
  const today = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const list = called.filter((l) => l.last_call_at && new Date(l.last_call_at) >= start)
    return {
      calls: list.length,
      reached: list.filter((l) => l.last_call_outcome && REACHED.includes(l.last_call_outcome)).length,
      meetings: list.filter((l) => l.last_call_outcome === 'meeting').length,
    }
  }, [called])

  const filteredCalled = filter === 'all' ? called : called.filter((l) => l.last_call_outcome === filter)

  return (
    <div className="min-h-screen">
      <Header title="Appels" subtitle="Un prospect à la fois : appelez, notez le résultat, passez au suivant" />

      <div className="p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-white/[0.06] bg-zinc-900 p-1 text-sm">
            {(['board', 'session'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'rounded-md px-3 py-1.5 font-medium transition-colors',
                  view === v ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                )}
              >
                {v === 'board' ? 'Tableau' : 'Session d’appels'}
              </button>
            ))}
          </div>
          <span className="text-sm text-zinc-500">
            {view === 'board'
              ? 'Cliquez sur une étape en bas de la carte, ou glissez la carte dans une colonne.'
              : 'Un prospect à la fois, au clavier.'}
          </span>
        </div>

        {view === 'board' && (
          <>
            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
            )}
            <Board
              leads={[...queue.filter((q) => !called.some((c) => c.id === q.id)), ...called]}
              loading={loading}
              onMove={moveTo}
              onLoadMore={() => loadQueue().catch(() => {})}
              hasMore={remaining !== null && queue.filter((l) => !l.last_call_outcome).length < remaining}
            />
          </>
        )}

        {view === 'session' && (
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* ---------- Colonne principale : le prospect à appeler ---------- */}
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Stat label="appels aujourd'hui" value={today.calls} />
              <Stat label="joints" value={today.reached} />
              <Stat label="RDV" value={today.meetings} accent />
              <span className="ml-auto text-zinc-500">
                {remaining === null ? '' : `${remaining} dans la file`}
                {skippedDuplicates > 0 && ` · ${skippedDuplicates} doublon${skippedDuplicates > 1 ? 's' : ''} écarté${skippedDuplicates > 1 ? 's' : ''}`}
              </span>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            {loading ? (
              <Skeleton className="h-[460px]" />
            ) : !current ? (
              !error && (
                <Card>
                  <CardContent className="py-16 text-center">
                    <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
                    <p className="font-semibold text-white">Plus personne à appeler</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Tous vos prospects avec un numéro ont été appelés. Les rappels reviendront ici à leur date.
                    </p>
                    <Link href="/scanner" className="mt-4 inline-block">
                      <Button>Trouver de nouveaux prospects</Button>
                    </Link>
                  </CardContent>
                </Card>
              )
            ) : (
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.18 }}
                >
                  <CallCard
                    lead={current}
                    note={note}
                    setNote={setNote}
                    noteRef={noteRef}
                    copied={copied}
                    onCopy={copyPhone}
                    choosingCallback={choosingCallback}
                    onOutcome={(o) => (o === 'callback' ? setChoosingCallback(true) : record(o))}
                    onCallback={(days) => record('callback', days)}
                    onCancelCallback={() => setChoosingCallback(false)}
                    onSkip={skip}
                  />
                </motion.div>
              </AnimatePresence>
            )}

            <div className="hidden flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-zinc-500 sm:flex">
              <Shortcut keys="A">appeler</Shortcut>
              <Shortcut keys="1 à 6">résultat</Shortcut>
              <Shortcut keys="N">note</Shortcut>
              <Shortcut keys="S">passer</Shortcut>
              <button
                onClick={undo}
                disabled={history.length === 0}
                className="inline-flex items-center gap-1 hover:text-zinc-300 disabled:opacity-40"
              >
                <Undo2 className="h-3 w-3" /> <kbd className="font-mono">Ctrl+Z</kbd> annuler le dernier
              </button>
            </div>
          </div>

          {/* ---------- Colonne latérale : appelés / file ---------- */}
          <aside className="min-w-0 space-y-3">
            <div className="inline-flex rounded-lg border border-white/[0.06] bg-zinc-900 p-1 text-sm">
              {(['called', 'queue'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPanel(p)}
                  className={cn(
                    'rounded-md px-3 py-1.5 font-medium transition-colors',
                    panel === p ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  {p === 'called' ? `Appelés · ${called.length}` : `À appeler · ${queue.length}`}
                </button>
              ))}
            </div>

            {panel === 'called' ? (
              <>
                <div className="flex flex-wrap gap-1.5">
                  <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
                    Tous
                  </FilterChip>
                  {OUTCOMES.map((o) => {
                    const count = called.filter((l) => l.last_call_outcome === o.id).length
                    if (!count) return null
                    return (
                      <FilterChip key={o.id} active={filter === o.id} onClick={() => setFilter(o.id)}>
                        {o.label} · {count}
                      </FilterChip>
                    )
                  })}
                </div>
                <div className="divide-y divide-white/[0.04] rounded-xl border border-white/[0.06] bg-zinc-900/60">
                  {filteredCalled.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-zinc-500">
                      {loading ? 'Chargement…' : 'Les prospects appelés apparaîtront ici avec leur résultat.'}
                    </p>
                  ) : (
                    filteredCalled.slice(0, 80).map((lead) => (
                      <CalledRow key={lead.id} lead={lead} onRequeue={() => requeue(lead)} inQueue={queue.some((q) => q.id === lead.id)} />
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="divide-y divide-white/[0.04] rounded-xl border border-white/[0.06] bg-zinc-900/60">
                {queue.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-zinc-500">La file est vide.</p>
                ) : (
                  queue.slice(0, 50).map((lead, index) => (
                    <div key={lead.id} className={cn('flex items-center gap-3 px-4 py-2.5 text-sm', index === 0 && 'bg-amber-500/[0.06]')}>
                      <span className={cn('w-7 shrink-0 text-right font-bold tabular-nums', getScoreColor(lead.prospect_score))}>
                        {lead.prospect_score}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-zinc-200">{lead.name}</p>
                        <p className="truncate text-xs text-zinc-500">
                          {lead.callback_at ? 'Rappel prévu' : lead.city}
                        </p>
                      </div>
                      {index === 0 && <span className="text-xs font-medium text-amber-400">En cours</span>}
                    </div>
                  ))
                )}
              </div>
            )}
          </aside>
        </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// Tableau en colonnes
// ============================================
function Board({
  leads,
  loading,
  onMove,
  onLoadMore,
  hasMore,
}: {
  leads: Company[]
  loading: boolean
  onMove: (lead: Company, column: BoardColumn) => void
  onLoadMore: () => void
  hasMore: boolean
}) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState<BoardColumn | null>(null)
  const byId = useMemo(() => new Map(leads.map((l) => [l.id, l])), [leads])

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((c) => (
          <Skeleton key={c.id} className="h-96 w-72 shrink-0" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const items = leads.filter((l) => columnOf(l) === col.id)
        return (
          <div
            key={col.id}
            className="w-72 shrink-0"
            onDragOver={(e) => {
              e.preventDefault()
              setOver(col.id)
            }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => {
              e.preventDefault()
              const lead = byId.get(e.dataTransfer.getData('leadId'))
              if (lead) onMove(lead, col.id)
              setOver(null)
              setDragId(null)
            }}
          >
            <div className={cn('flex items-center gap-2 rounded-t-xl border border-b-0 border-t-2 border-white/[0.08] bg-zinc-900/60 px-3 py-2.5', col.accent)}>
              <h3 className="text-sm font-semibold text-white">{col.label}</h3>
              <span className="rounded-full bg-zinc-800 px-1.5 text-xs font-medium text-zinc-400">{items.length}</span>
            </div>
            <div
              className={cn(
                'min-h-[420px] space-y-2 rounded-b-xl border border-t-0 border-white/[0.08] bg-zinc-900/30 p-2 transition-colors',
                over === col.id && dragId && 'border-amber-500/30 bg-amber-500/5'
              )}
            >
              {items.map((lead) => (
                <BoardCard
                  key={lead.id}
                  lead={lead}
                  column={col.id}
                  dragging={dragId === lead.id}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('leadId', lead.id)
                    setDragId(lead.id)
                  }}
                  onDragEnd={() => setDragId(null)}
                  onMove={(c) => onMove(lead, c)}
                />
              ))}
              {items.length === 0 && <p className="py-8 text-center text-sm text-zinc-700">Vide</p>}
              {col.id === 'todo' && hasMore && (
                <button onClick={onLoadMore} className="w-full rounded-lg py-2 text-xs text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300">
                  Afficher plus de prospects
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BoardCard({
  lead,
  column,
  dragging,
  onDragStart,
  onDragEnd,
  onMove,
}: {
  lead: Company
  column: BoardColumn
  dragging: boolean
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
  onMove: (column: BoardColumn) => void
}) {
  const outcome = lead.last_call_outcome ? OUTCOME[lead.last_call_outcome] : null
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'cursor-grab space-y-2 rounded-xl border border-white/[0.06] bg-zinc-900/80 p-3 transition-all hover:border-white/[0.12] active:cursor-grabbing',
        dragging && 'opacity-40'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link href={`/leads/${lead.id}`} className="line-clamp-1 text-sm font-medium text-zinc-200 hover:text-amber-400">
          {lead.name}
        </Link>
        <span className={cn('shrink-0 text-sm font-bold tabular-nums', getScoreColor(lead.prospect_score))}>{lead.prospect_score}</span>
      </div>
      <p className="text-xs text-zinc-500">
        {lead.city}
        {outcome && column === 'callback' && ` · ${outcome.label}`}
        {lead.callback_at && column !== 'todo' && column !== 'done' && column !== 'meeting' &&
          ` · le ${new Date(lead.callback_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`}
      </p>
      {lead.phone && (
        <a
          href={telHref(lead.phone)}
          className="flex items-center gap-1.5 font-mono text-sm text-amber-400 hover:text-amber-300"
          onClick={(e) => e.stopPropagation()}
        >
          <Phone className="h-3.5 w-3.5" /> {formatPhone(lead.phone)}
        </a>
      )}
      <div className="flex flex-wrap gap-1 border-t border-white/[0.05] pt-2">
        {COLUMNS.filter((c) => c.id !== column).map((c) => (
          <button
            key={c.id}
            onClick={() => onMove(c.id)}
            className="rounded-md border border-white/[0.08] px-2 py-1 text-[11px] font-medium text-zinc-400 hover:border-amber-500/40 hover:text-amber-300"
          >
            {c.button}
          </button>
        ))}
      </div>
    </div>
  )
}

// ============================================
// Carte d'appel
// ============================================
function CallCard({
  lead,
  note,
  setNote,
  noteRef,
  copied,
  onCopy,
  choosingCallback,
  onOutcome,
  onCallback,
  onCancelCallback,
  onSkip,
}: {
  lead: Company
  note: string
  setNote: (v: string) => void
  noteRef: React.RefObject<HTMLTextAreaElement | null>
  copied: boolean
  onCopy: () => void
  choosingCallback: boolean
  onOutcome: (o: CallOutcome) => void
  onCallback: (days: number) => void
  onCancelCallback: () => void
  onSkip: () => void
}) {
  const presence = lead.web_presence ?? (lead.has_website ? 'website' : 'unknown')
  const reasons = lead.score_reasons?.slice(0, 3) ?? []
  const pitch = buildPersonalizedReason(lead)
  const siteLink = lead.website || lead.social_url
  const lastOutcome = lead.last_call_outcome ? OUTCOME[lead.last_call_outcome] : null

  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
        {/* Qui */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link href={`/leads/${lead.id}`} className="block truncate text-2xl font-bold text-white hover:text-amber-400">
              {lead.name}
            </Link>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-400">
              {lead.sector && <span>{sectorLabels[lead.sector]}</span>}
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {lead.city}
              </span>
              {lead.google_reviews_count != null && (
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-amber-400" /> {lead.google_rating ?? '–'} · {lead.google_reviews_count} avis
                </span>
              )}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className={cn('text-3xl font-bold tabular-nums', getScoreColor(lead.prospect_score))}>{lead.prospect_score}</p>
            <p className="text-xs text-zinc-500">score</p>
          </div>
        </div>

        {lastOutcome && (
          <p className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-sm text-amber-300">
            {lead.call_count && lead.call_count > 0 ? `${lead.call_count + 1}e appel` : 'Rappel'} · dernier résultat :{' '}
            <strong>{lastOutcome.label}</strong>
            {lead.last_call_at && ` ${timeAgo(lead.last_call_at).toLowerCase()}`}
          </p>
        )}

        {/* Le numéro */}
        {lead.phone ? (
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={telHref(lead.phone)}
              className="inline-flex h-14 items-center gap-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 text-xl font-bold text-white shadow-lg shadow-amber-500/20 transition hover:from-amber-400 hover:to-orange-500 active:scale-[0.98]"
            >
              <Phone className="h-5 w-5" />
              <span className="font-mono tracking-wide">{formatPhone(lead.phone)}</span>
            </a>
            <Button variant="outline" onClick={onCopy}>
              <Copy className="h-4 w-4" /> {copied ? 'Copié' : 'Copier'}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Pas de numéro sur cette fiche.</p>
        )}

        {/* Quoi dire */}
        <div className="space-y-2 rounded-lg bg-zinc-800/50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Votre argument</p>
          <p className="text-sm text-zinc-200">{pitch}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span
              className={cn(
                'rounded-full border px-2.5 py-1',
                presence === 'website' ? 'border-white/[0.1] text-zinc-300' : 'border-amber-500/30 text-amber-400'
              )}
            >
              {webPresenceLabels[presence]}
            </span>
            {reasons.map((reason) => (
              <span key={reason} className="rounded-full border border-white/[0.08] px-2.5 py-1 text-zinc-400">
                {reason}
              </span>
            ))}
          </div>
          {lead.audit?.design_verdict && <p className="text-sm text-zinc-400">{lead.audit.design_verdict}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs">
            {siteLink && (
              <a href={siteLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-amber-400 hover:underline">
                <ExternalLink className="h-3 w-3" /> {siteLink.replace(/^https?:\/\/(www\.)?/, '').slice(0, 40)}
              </a>
            )}
            {lead.google_maps_url && (
              <a href={lead.google_maps_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-200">
                <ExternalLink className="h-3 w-3" /> Fiche Google
              </a>
            )}
          </div>
        </div>

        {/* Note */}
        <textarea
          id="call-note"
          ref={noteRef}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Note sur l'appel (facultatif) : nom du gérant, objection, créneau…"
          className="w-full resize-none rounded-lg border border-white/[0.08] bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none"
        />

        {/* Résultat */}
        {choosingCallback ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-amber-300">Rappeler quand ?</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CALLBACK_CHOICES.map((c) => (
                <button
                  key={c.key}
                  onClick={() => onCallback(c.days)}
                  className="flex h-12 items-center justify-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 text-sm font-semibold text-amber-300 hover:bg-amber-500/20"
                >
                  <kbd className="font-mono text-xs opacity-60">{c.key}</kbd> {c.label}
                </button>
              ))}
              <button onClick={onCancelCallback} className="h-12 rounded-lg text-sm text-zinc-500 hover:text-zinc-300">
                Retour
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {OUTCOMES.map((o) => (
                <button
                  key={o.id}
                  onClick={() => onOutcome(o.id)}
                  className={cn(
                    'flex h-12 items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition active:scale-[0.98]',
                    o.tone
                  )}
                >
                  <kbd className="hidden font-mono text-xs opacity-60 sm:inline">{o.key}</kbd>
                  <o.icon className="h-4 w-4" />
                  {o.label}
                </button>
              ))}
            </div>
            <button onClick={onSkip} className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300">
              <SkipForward className="h-3.5 w-3.5" /> Passer pour l&apos;instant
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// Petits composants
// ============================================
function CalledRow({ lead, onRequeue, inQueue }: { lead: Company; onRequeue: () => void; inQueue: boolean }) {
  const outcome = lead.last_call_outcome ? OUTCOME[lead.last_call_outcome] : null
  return (
    <div className="flex items-start gap-3 px-4 py-3 text-sm">
      <div className="min-w-0 flex-1 space-y-1">
        <Link href={`/leads/${lead.id}`} className="block truncate font-medium text-zinc-200 hover:text-amber-400">
          {lead.name}
        </Link>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
          {outcome && <span className={cn('rounded-full px-2 py-0.5 font-semibold', outcome.pill)}>{outcome.label}</span>}
          {lead.last_call_at && <span>{timeAgo(lead.last_call_at)}</span>}
          {(lead.call_count ?? 0) > 1 && <span>· {lead.call_count} appels</span>}
          {lead.callback_at && !inQueue && (
            <span>· rappel {new Date(lead.callback_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</span>
          )}
        </div>
      </div>
      {inQueue ? (
        <span className="shrink-0 text-xs text-amber-400">Dans la file</span>
      ) : (
        <button
          onClick={onRequeue}
          title="Remettre dans la file d'appels"
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-white/[0.05] hover:text-white"
        >
          <RotateCcw className="h-3 w-3" /> Rappeler
        </button>
      )}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <span className="rounded-lg border border-white/[0.06] bg-zinc-900 px-3 py-1.5">
      <strong className={cn('mr-1 tabular-nums', accent ? 'text-emerald-400' : 'text-white')}>{value}</strong>
      <span className="text-zinc-500">{label}</span>
    </span>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
        active ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-white/[0.08] text-zinc-500 hover:text-zinc-300'
      )}
    >
      {children}
    </button>
  )
}

function Shortcut({ keys, children }: { keys: string; children: React.ReactNode }) {
  return (
    <span>
      <kbd className="rounded border border-white/[0.1] bg-zinc-800 px-1.5 py-0.5 font-mono text-zinc-300">{keys}</kbd> {children}
    </span>
  )
}

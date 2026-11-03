'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle, Button, Skeleton } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { leadsApi } from '@/lib/api'
import { buildPersonalizedReason } from '@/lib/email-templates'
import { cn, getScoreColor, sectorLabels, timeAgo } from '@/lib/utils'
import { webPresenceLabels } from '@/lib/web-presence'
import type { Company, LeadStatus } from '@/types'
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Mail,
  MapPin,
  MessageSquareReply,
  Phone,
  PhoneCall,
  Send,
  XCircle,
} from 'lucide-react'

type SectionKey = 'replies' | 'engaged' | 'toCall' | 'toEmail' | 'toFollowUp'

type Sections = Record<SectionKey, Company[]>

const EMPTY_SECTIONS: Sections = { replies: [], engaged: [], toCall: [], toEmail: [], toFollowUp: [] }

const LEAD_SELECT = '*, website_audits(*)'

function toCompany(row: Record<string, unknown>): Company {
  const audits = row.website_audits as Company['audit'][] | undefined
  return { ...(row as unknown as Company), audit: audits?.[0] ?? null, notes: [] }
}

export default function TodayPage() {
  const [sections, setSections] = useState<Sections>(EMPTY_SECTIONS)
  const [dueCount, setDueCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [sendingDue, setSendingDue] = useState(false)
  const [sendResult, setSendResult] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    const [replies, engagedMessages, toCall, toEmail, toFollowUp, due] = await Promise.all([
      // Ont répondu mais pas encore de RDV
      supabase
        .from('companies')
        .select(LEAD_SELECT)
        .not('replied_at', 'is', null)
        .in('status', ['new', 'contacted'])
        .order('replied_at', { ascending: false })
        .limit(20),
      // Ont ouvert ou cliqué un email récemment : c'est le moment d'appeler
      supabase
        .from('email_messages')
        .select('company_id, opened_at, clicked_at')
        .eq('status', 'sent')
        .not('company_id', 'is', null)
        .or(`opened_at.gte.${threeDaysAgo},clicked_at.gte.${threeDaysAgo}`)
        .order('updated_at', { ascending: false })
        .limit(50),
      // Pas d'email mais un téléphone : à appeler
      supabase
        .from('companies')
        .select(LEAD_SELECT)
        .eq('status', 'new')
        .eq('do_not_contact', false)
        .is('email', null)
        .not('phone', 'is', null)
        .gte('prospect_score', 50)
        .order('prospect_score', { ascending: false })
        .limit(10),
      // Email connu, jamais contacté
      supabase
        .from('companies')
        .select(LEAD_SELECT)
        .eq('status', 'new')
        .eq('do_not_contact', false)
        .not('email', 'is', null)
        .order('prospect_score', { ascending: false })
        .limit(10),
      // Contactés il y a plus de 7 jours, sans réponse
      supabase
        .from('companies')
        .select(LEAD_SELECT)
        .eq('status', 'contacted')
        .eq('do_not_contact', false)
        .is('replied_at', null)
        .lt('last_contacted_at', sevenDaysAgo)
        .order('prospect_score', { ascending: false })
        .limit(10),
      supabase
        .from('email_messages')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'scheduled')
        .lte('scheduled_at', endOfDay.toISOString()),
    ])

    const engagedIds = Array.from(
      new Set((engagedMessages.data ?? []).map((message) => message.company_id as string))
    ).slice(0, 10)
    const engaged = engagedIds.length
      ? await supabase
          .from('companies')
          .select(LEAD_SELECT)
          .in('id', engagedIds)
          .eq('status', 'contacted')
          .is('replied_at', null)
      : { data: [] }

    setSections({
      replies: (replies.data ?? []).map(toCompany),
      engaged: (engaged.data ?? []).map(toCompany),
      toCall: (toCall.data ?? []).map(toCompany),
      toEmail: (toEmail.data ?? []).map(toCompany),
      toFollowUp: (toFollowUp.data ?? []).map(toCompany),
    })
    setDueCount(due.count ?? 0)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const removeLead = (id: string) => {
    setSections((current) => {
      const next = { ...current }
      for (const key of Object.keys(next) as SectionKey[]) {
        next[key] = next[key].filter((lead) => lead.id !== id)
      }
      return next
    })
  }

  const handleStatus = async (lead: Company, status: LeadStatus, note?: string) => {
    removeLead(lead.id)
    await leadsApi.updateStatus(lead.id, status)
    if (note) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await supabase.from('notes').insert({ user_id: user.id, company_id: lead.id, content: note })
    }
  }

  const handleReplied = async (lead: Company) => {
    removeLead(lead.id)
    await leadsApi.markReplied(lead.id)
    load()
  }

  const handleSendDue = async () => {
    setSendingDue(true)
    setSendResult(null)
    try {
      const res = await fetch('/api/outreach/due', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur envoi')
      setSendResult(`${data.sent} envoyé(s), ${data.failed} en erreur, ${data.cancelled} annulé(s)`)
      load()
    } catch (err) {
      setSendResult(err instanceof Error ? err.message : 'Erreur envoi')
    } finally {
      setSendingDue(false)
    }
  }

  const total = Object.values(sections).reduce((sum, list) => sum + list.length, 0)

  return (
    <div className="min-h-screen">
      <Header title="Aujourd'hui" subtitle="Vos actions de prospection du jour, par ordre d'importance" />

      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Counter icon={<MessageSquareReply className="h-5 w-5 text-emerald-400" />} label="Réponses à traiter" value={sections.replies.length} loading={loading} />
          <Counter icon={<Flame className="h-5 w-5 text-red-400" />} label="Prospects chauds" value={sections.engaged.length} loading={loading} />
          <Counter icon={<PhoneCall className="h-5 w-5 text-amber-400" />} label="À appeler" value={sections.toCall.length} loading={loading} />
          <Counter icon={<Mail className="h-5 w-5 text-blue-400" />} label="À contacter par email" value={sections.toEmail.length} loading={loading} />
          <Counter icon={<Send className="h-5 w-5 text-violet-400" />} label="Emails programmés aujourd'hui" value={dueCount} loading={loading} />
        </div>

        {dueCount > 0 && (
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
              <div>
                <p className="font-semibold text-white">{dueCount} email{dueCount > 1 ? 's' : ''} prévu{dueCount > 1 ? 's' : ''} aujourd&apos;hui</p>
                <p className="text-sm text-zinc-500">
                  Ils partent automatiquement chaque matin. Vous pouvez aussi envoyer ceux qui sont déjà dus maintenant.
                </p>
                {sendResult && <p className="mt-1 text-sm text-zinc-400">{sendResult}</p>}
              </div>
              <Button onClick={handleSendDue} loading={sendingDue} disabled={sendingDue}>
                <Send className="h-4 w-4" />
                Envoyer maintenant
              </Button>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, index) => (
              <Skeleton key={index} className="h-28" />
            ))}
          </div>
        ) : total === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
              <p className="font-semibold text-white">Rien en attente pour aujourd&apos;hui</p>
              <p className="mt-1 text-sm text-zinc-500">Lancez un scan pour trouver de nouveaux prospects.</p>
              <Link href="/scanner" className="mt-4 inline-block">
                <Button>Lancer un scan</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <Section
              title="Ils ont répondu"
              hint="Proposez un rendez-vous dans l'heure."
              icon={<MessageSquareReply className="h-5 w-5 text-emerald-400" />}
              leads={sections.replies}
              renderActions={(lead) => (
                <>
                  <Button size="sm" variant="success" onClick={() => handleStatus(lead, 'meeting', 'RDV planifié')}>
                    <CalendarCheck className="h-4 w-4" /> RDV pris
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleStatus(lead, 'lost', 'Pas intéressé (après réponse)')}>
                    <XCircle className="h-4 w-4" /> Pas intéressé
                  </Button>
                </>
              )}
            />

            <Section
              title="Prospects chauds"
              hint="Ils ont ouvert ou cliqué votre email ces 3 derniers jours : appelez-les maintenant."
              icon={<Flame className="h-5 w-5 text-red-400" />}
              leads={sections.engaged}
              renderActions={(lead) => (
                <CallActions lead={lead} onStatus={handleStatus} onReplied={handleReplied} />
              )}
            />

            <Section
              title="À appeler"
              hint="Les meilleurs prospects sans email connu. Le téléphone reste le canal qui convertit le mieux."
              icon={<PhoneCall className="h-5 w-5 text-amber-400" />}
              leads={sections.toCall}
              renderActions={(lead) => (
                <CallActions lead={lead} onStatus={handleStatus} onReplied={handleReplied} />
              )}
            />

            <Section
              title="À contacter par email"
              hint="Email connu, jamais contactés. Ouvrez la fiche pour envoyer l'email personnalisé."
              icon={<Mail className="h-5 w-5 text-blue-400" />}
              leads={sections.toEmail}
              renderActions={(lead) => (
                <Link href={`/leads/${lead.id}`}>
                  <Button size="sm">
                    <Mail className="h-4 w-4" /> Écrire
                  </Button>
                </Link>
              )}
            />

            <Section
              title="À relancer"
              hint="Contactés il y a plus de 7 jours, sans réponse."
              icon={<Clock className="h-5 w-5 text-zinc-400" />}
              leads={sections.toFollowUp}
              renderActions={(lead) => (
                <CallActions lead={lead} onStatus={handleStatus} onReplied={handleReplied} />
              )}
            />
          </>
        )}
      </div>
    </div>
  )
}

function CallActions({
  lead,
  onStatus,
  onReplied,
}: {
  lead: Company
  onStatus: (lead: Company, status: LeadStatus, note?: string) => void
  onReplied: (lead: Company) => void
}) {
  return (
    <>
      {lead.phone && (
        <a href={`tel:${lead.phone.replace(/\s/g, '')}`}>
          <Button size="sm">
            <Phone className="h-4 w-4" /> {lead.phone}
          </Button>
        </a>
      )}
      <Button size="sm" variant="success" onClick={() => onStatus(lead, 'meeting', 'RDV pris par téléphone')}>
        <CalendarCheck className="h-4 w-4" /> RDV
      </Button>
      <Button size="sm" variant="secondary" onClick={() => onReplied(lead)}>
        <MessageSquareReply className="h-4 w-4" /> Intéressé
      </Button>
      <Button size="sm" variant="outline" onClick={() => onStatus(lead, 'contacted', 'Appel : pas de réponse / à rappeler')}>
        Pas joignable
      </Button>
      <Button size="sm" variant="ghost" onClick={() => onStatus(lead, 'lost', 'Pas intéressé')}>
        <XCircle className="h-4 w-4" /> Non
      </Button>
    </>
  )
}

function Section({
  title,
  hint,
  icon,
  leads,
  renderActions,
}: {
  title: string
  hint: string
  icon: React.ReactNode
  leads: Company[]
  renderActions: (lead: Company) => React.ReactNode
}) {
  if (leads.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-bold text-zinc-400">{leads.length}</span>
        </CardTitle>
        <p className="text-sm text-zinc-500">{hint}</p>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-white/[0.04]">
          {leads.map((lead) => (
            <LeadRow key={lead.id} lead={lead} actions={renderActions(lead)} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function LeadRow({ lead, actions }: { lead: Company; actions: React.ReactNode }) {
  const reasons = lead.score_reasons?.length ? lead.score_reasons.slice(0, 3) : null
  const presence = lead.web_presence && lead.web_presence !== 'website' ? webPresenceLabels[lead.web_presence] : null

  return (
    <div className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/leads/${lead.id}`} className="font-semibold text-white hover:text-amber-400">
            {lead.name}
          </Link>
          <span className={cn('text-sm font-bold', getScoreColor(lead.prospect_score))}>{lead.prospect_score}</span>
          {lead.sector && <span className="text-xs text-zinc-500">{sectorLabels[lead.sector]}</span>}
          {presence && (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">{presence}</span>
          )}
        </div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {lead.city}
          </span>
          {lead.google_reviews_count != null && (
            <span>
              {lead.google_rating ?? '–'}★ · {lead.google_reviews_count} avis
            </span>
          )}
          {lead.last_contacted_at && <span>Contacté {timeAgo(lead.last_contacted_at).toLowerCase()}</span>}
          {lead.google_maps_url && (
            <a href={lead.google_maps_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-zinc-300">
              Fiche Google <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {(lead.website || lead.social_url) && (
            <a href={lead.website || lead.social_url || '#'} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-zinc-300">
              {lead.website ? 'Site' : 'Page'} <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </p>
        <p className="text-sm text-zinc-400">
          {reasons ? reasons.join(' · ') : buildPersonalizedReason(lead)}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
    </div>
  )
}

function Counter({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode
  label: string
  value: number
  loading: boolean
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <p className="text-2xl font-bold text-white">{loading ? '–' : value}</p>
            <p className="text-xs text-zinc-500">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

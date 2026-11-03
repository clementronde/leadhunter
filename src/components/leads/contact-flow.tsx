'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, Loader2, Mail, Phone, RefreshCw, Search, Send, Sparkles } from 'lucide-react'
import { Company, LeadStatus, OutreachSettings } from '@/types'
import { usePlan } from '@/hooks/usePlan'
import { Button, Card } from '@/components/ui'

interface ContactFlowProps {
  lead: Company
  onLeadUpdate: (patch: Partial<Company>) => void
  onStatusChange: (status: LeadStatus) => void
  onUpgrade?: () => void
}

/**
 * Le parcours de contact d'un lead, en une carte :
 * coordonnées → (recherche IA si manquantes) → message rédigé par l'IA → envoyer
 */
export function ContactFlow({ lead, onLeadUpdate, onStatusChange, onUpgrade }: ContactFlowProps) {
  const { isPro, isAdmin } = usePlan()
  const hasFullAccess = isPro || isAdmin

  const [settings, setSettings] = useState<OutreachSettings | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchInfo, setSearchInfo] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null)
  const [drafting, setDrafting] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [followups, setFollowups] = useState(true)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/outreach/settings')
      .then((r) => r.json())
      .then((data) => setSettings(data.settings ?? null))
      .catch(() => {})
  }, [])

  const missingContacts = !lead.email || !lead.phone
  const senderEmail = settings?.sender_email
  const alreadyContacted = lead.status !== 'new' || !!lead.last_contacted_at

  const handleFindContacts = async () => {
    if (!hasFullAccess) return onUpgrade?.()
    setSearching(true)
    setSearchInfo(null)
    setError(null)
    try {
      const res = await fetch(`/api/leads/${lead.id}/find-contacts`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Recherche impossible')
      if (Object.keys(data.found ?? {}).length > 0) onLeadUpdate(data.found)
      setSearchInfo({ tone: data.found?.email ? 'ok' : 'warn', text: data.message })
    } catch (err) {
      setSearchInfo({ tone: 'warn', text: err instanceof Error ? err.message : 'Recherche impossible' })
    } finally {
      setSearching(false)
    }
  }

  const handleDraft = async () => {
    if (!hasFullAccess) return onUpgrade?.()
    setDrafting(true)
    setError(null)
    try {
      const res = await fetch(`/api/leads/${lead.id}/draft-message`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Rédaction impossible')
      setSubject(data.subject)
      setBody(data.body)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rédaction impossible')
    } finally {
      setDrafting(false)
    }
  }

  const handleSend = async () => {
    if (!lead.email || !subject.trim() || !body.trim()) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/outreach/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: lead.id,
          recipientEmail: lead.email,
          subject: subject.trim(),
          body: body.trim(),
          templateId: 'ia',
          followupDelays: followups ? [3, 7] : [],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Envoi impossible')
      setSent(true)
      onStatusChange('contacted')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible')
    } finally {
      setSending(false)
    }
  }

  return (
    <Card className="p-5 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white">Contacter</h2>
        {alreadyContacted && !sent && (
          <span className="text-xs text-zinc-500">Déjà contacté</span>
        )}
      </div>

      {/* 1. Coordonnées */}
      <div className="grid gap-3 sm:grid-cols-2">
        <ContactLine
          icon={<Phone className="h-4 w-4" />}
          label="Téléphone"
          value={lead.phone}
          href={lead.phone ? `tel:${lead.phone}` : undefined}
        />
        <ContactLine
          icon={<Mail className="h-4 w-4" />}
          label="Email"
          value={lead.email}
          href={lead.email ? `mailto:${lead.email}` : undefined}
        />
      </div>

      {missingContacts && (
        <div className="space-y-2">
          <Button variant="secondary" onClick={handleFindContacts} disabled={searching} className="w-full sm:w-auto">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {searching ? 'Recherche sur le web… (jusqu’à 1 min)' : 'Trouver les contacts manquants'}
          </Button>
          {searchInfo && (
            <p className={`text-sm ${searchInfo.tone === 'ok' ? 'text-emerald-400' : 'text-amber-400'}`}>{searchInfo.text}</p>
          )}
        </div>
      )}

      {/* 2. Message */}
      {lead.email && !sent && (
        <div className="space-y-3 border-t border-white/[0.06] pt-5">
          {!body ? (
            <Button onClick={handleDraft} disabled={drafting} className="w-full sm:w-auto">
              {drafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {drafting ? 'Rédaction du message…' : 'Rédiger le message avec l’IA'}
            </Button>
          ) : (
            <>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                aria-label="Objet"
                className="w-full rounded-lg border border-white/[0.08] bg-zinc-800/60 px-3 py-2.5 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                aria-label="Message"
                rows={12}
                className="w-full rounded-lg border border-white/[0.08] bg-zinc-800/60 p-3 text-sm leading-relaxed text-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={handleSend} disabled={sending || !senderEmail}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sending ? 'Envoi…' : 'Envoyer'}
                </Button>
                <button
                  type="button"
                  onClick={handleDraft}
                  disabled={drafting}
                  className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${drafting ? 'animate-spin' : ''}`} />
                  Réécrire
                </button>
                <label className="flex items-center gap-2 text-sm text-zinc-400 sm:ml-auto">
                  <input
                    type="checkbox"
                    checked={followups}
                    onChange={(e) => setFollowups(e.target.checked)}
                    className="h-4 w-4 accent-amber-500"
                  />
                  Relancer à J+3 et J+7 sans réponse
                </label>
              </div>
              <p className="text-xs text-zinc-500">
                {senderEmail ? (
                  <>Envoyé depuis <span className="text-zinc-300">{senderEmail}</span> vers <span className="text-zinc-300">{lead.email}</span></>
                ) : (
                  <>Ajoutez votre adresse email pro dans <a href="/settings" className="text-amber-400 underline underline-offset-2">Paramètres</a> pour envoyer.</>
                )}
              </p>
            </>
          )}
        </div>
      )}

      {sent && (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-sm font-medium text-emerald-300">
          <CheckCircle className="h-4 w-4" />
          Email envoyé à {lead.email}{followups ? ' · relances prévues à J+3 et J+7' : ''}
        </p>
      )}

      {!lead.email && searchInfo && lead.phone && (
        <p className="text-sm text-zinc-400">Pas d&apos;email : appelez le {lead.phone}, puis changez le statut du lead.</p>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {!hasFullAccess && (
        <p className="text-xs text-amber-400">
          La recherche de contacts, la rédaction par l&apos;IA et l&apos;envoi sont inclus dans le plan Pro.
        </p>
      )}
    </Card>
  )
}

function ContactLine({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string | null; href?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-zinc-800/40 px-3 py-2.5">
      <span className={value ? 'text-amber-400' : 'text-zinc-600'}>{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-zinc-500">{label}</p>
        {value && href ? (
          <a href={href} className="block truncate text-sm font-medium text-white hover:text-amber-400">{value}</a>
        ) : (
          <p className="text-sm text-zinc-500">Inconnu</p>
        )}
      </div>
    </div>
  )
}

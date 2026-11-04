'use client'

import { useEffect, useState } from 'react'
import { Check, CheckCircle, FlaskConical, Loader2, Mail, MessageCircle, Pencil, Phone, RefreshCw, Search, Send, Smartphone, Sparkles } from 'lucide-react'
import { Company, LeadStatus, OutreachSettings } from '@/types'
import { usePlan } from '@/hooks/usePlan'
import { Button, Card } from '@/components/ui'
import { leadsApi } from '@/lib/api'

interface ContactFlowProps {
  lead: Company
  onLeadUpdate: (patch: Partial<Company>) => void
  onStatusChange: (status: LeadStatus) => void
  onUpgrade?: () => void
}

/** Numéro français en format international sans "+" (33612345678), et s'il s'agit d'un mobile */
function toInternational(phone: string | null): { intl: string; mobile: boolean } | null {
  if (!phone) return null
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0033')) digits = digits.slice(2)
  if (digits.startsWith('0') && digits.length === 10) digits = `33${digits.slice(1)}`
  if (!digits.startsWith('33') || digits.length !== 11) return null
  return { intl: digits, mobile: /^33[67]/.test(digits) }
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
  const [testing, setTesting] = useState(false)
  const [testInfo, setTestInfo] = useState<string | null>(null)
  const [shortDrafting, setShortDrafting] = useState(false)
  const [shortText, setShortText] = useState('')
  const [shortSent, setShortSent] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [savingContacts, setSavingContacts] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const startEditing = () => {
    setEditPhone(lead.phone ?? '')
    setEditEmail(lead.email ?? '')
    setEditError(null)
    setEditing(true)
  }

  // Saisie manuelle : coordonnées trouvées par vous (appel, carte de visite, réseaux…)
  const handleSaveContacts = async () => {
    const email = editEmail.trim().toLowerCase()
    const phone = editPhone.trim()
    if (email && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) {
      setEditError('Adresse email invalide')
      return
    }
    setSavingContacts(true)
    setEditError(null)
    try {
      const patch = { email: email || null, phone: phone || null }
      await leadsApi.update(lead.id, patch)
      onLeadUpdate(patch)
      setEditing(false)
    } catch {
      setEditError('Enregistrement impossible')
    } finally {
      setSavingContacts(false)
    }
  }

  useEffect(() => {
    fetch('/api/outreach/settings')
      .then((r) => r.json())
      .then((data) => setSettings(data.settings ?? null))
      .catch(() => {})
  }, [])

  const missingContacts = !lead.email || !lead.phone
  const phoneIntl = toInternational(lead.phone)
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

  const handleTestSend = async () => {
    if (!subject.trim() || !body.trim()) return
    setTesting(true)
    setTestInfo(null)
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
          test: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Envoi du test impossible')
      setTestInfo(`Test envoyé à ${data.sentTo}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi du test impossible')
    } finally {
      setTesting(false)
    }
  }

  const handleDraftShort = async () => {
    if (!hasFullAccess) return onUpgrade?.()
    setShortDrafting(true)
    setError(null)
    try {
      const res = await fetch(`/api/leads/${lead.id}/draft-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: 'short' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Rédaction impossible')
      setShortText(data.body)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rédaction impossible')
    } finally {
      setShortDrafting(false)
    }
  }

  // WhatsApp / SMS s'ouvrent avec le message pré-rempli ; l'envoi se fait depuis votre téléphone ou WhatsApp
  const handleOpenShort = () => {
    setShortSent(true)
    if (lead.status === 'new') onStatusChange('contacted')
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
      {editing ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs text-zinc-500">Téléphone</span>
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="06 12 34 56 78"
                autoFocus
                className="w-full rounded-lg border border-white/[0.08] bg-zinc-800/60 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-zinc-500">Email</span>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveContacts() }}
                placeholder="contact@entreprise.fr"
                className="w-full rounded-lg border border-white/[0.08] bg-zinc-800/60 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </label>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={handleSaveContacts} disabled={savingContacts}>
              {savingContacts ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Enregistrer
            </Button>
            <button type="button" onClick={() => setEditing(false)} className="text-sm text-zinc-400 hover:text-white">
              Annuler
            </button>
            {editError && <p className="text-sm text-red-400">{editError}</p>}
          </div>
        </div>
      ) : (
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
      )}

      {!editing && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            {missingContacts && (
              <Button variant="secondary" onClick={handleFindContacts} disabled={searching} className="w-full sm:w-auto">
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {searching ? 'Recherche sur le web… (jusqu’à 1 min)' : 'Trouver les contacts manquants'}
              </Button>
            )}
            <button
              type="button"
              onClick={startEditing}
              className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white"
            >
              <Pencil className="h-3.5 w-3.5" />
              {missingContacts ? 'Saisir moi-même' : 'Modifier les coordonnées'}
            </button>
          </div>
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
                <Button variant="outline" onClick={handleTestSend} disabled={testing}>
                  {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
                  M&apos;envoyer un test
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
              {testInfo && <p className="text-sm text-emerald-400">{testInfo}</p>}
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

      {/* 3. WhatsApp / SMS (mobiles uniquement) */}
      {phoneIntl?.mobile && (
        <div className="space-y-3 border-t border-white/[0.06] pt-5">
          {!shortText ? (
            <Button variant="secondary" onClick={handleDraftShort} disabled={shortDrafting} className="w-full sm:w-auto">
              {shortDrafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
              {shortDrafting ? 'Rédaction…' : 'Écrire un message WhatsApp / SMS'}
            </Button>
          ) : (
            <>
              <textarea
                value={shortText}
                onChange={(e) => setShortText(e.target.value)}
                aria-label="Message WhatsApp / SMS"
                rows={4}
                className="w-full rounded-lg border border-white/[0.08] bg-zinc-800/60 p-3 text-sm leading-relaxed text-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={`https://wa.me/${phoneIntl.intl}?text=${encodeURIComponent(shortText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleOpenShort}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  <MessageCircle className="h-4 w-4" />
                  Ouvrir dans WhatsApp
                </a>
                <a
                  href={`sms:+${phoneIntl.intl}?&body=${encodeURIComponent(shortText)}`}
                  onClick={handleOpenShort}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] px-4 py-2 text-sm font-medium text-zinc-200 hover:border-white/[0.16]"
                >
                  <Smartphone className="h-4 w-4" />
                  Envoyer par SMS
                </a>
                <span className="text-xs text-zinc-500">{shortText.length} caractères</span>
              </div>
              <p className="text-xs text-zinc-500">
                {shortSent
                  ? 'Lead marqué comme contacté. Pensez à appuyer sur Envoyer dans WhatsApp ou Messages.'
                  : 'Le message s’ouvre pré-rempli : vous n’avez plus qu’à appuyer sur Envoyer. Le SMS s’ouvre sur téléphone (ou Mac / Lien avec Windows).'}
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

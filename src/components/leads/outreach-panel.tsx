'use client'

import { useEffect, useState } from 'react'
import { CalendarClock, CheckCircle, Loader2, Mail, Send } from 'lucide-react'
import { Company, LeadStatus, CreateNoteInput, OutreachSettings } from '@/types'
import { loadTemplates, applyTemplate, TemplateId } from '@/lib/email-templates'
import { usePlan } from '@/hooks/usePlan'

interface OutreachPanelProps {
  lead: Company
  onStatusChange: (status: LeadStatus) => void
  onNoteAdded: (input: CreateNoteInput) => void | Promise<void>
  compact?: boolean
}

export function OutreachPanel({ lead, onStatusChange, onNoteAdded, compact }: OutreachPanelProps) {
  const defaultTemplate: TemplateId = lead.has_website ? 'refonte' : 'sans-site'
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>(defaultTemplate)
  const [noteText, setNoteText] = useState('')
  const [markingContacted, setMarkingContacted] = useState(false)
  const [contacted, setContacted] = useState(false)
  const [settings, setSettings] = useState<OutreachSettings | null>(null)
  const [sending, setSending] = useState(false)
  const [sendStatus, setSendStatus] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [scheduledAt, setScheduledAt] = useState('')
  const [followupsEnabled, setFollowupsEnabled] = useState(true)

  const { isPro, isAdmin } = usePlan()
  const hasFullAccess = isPro || isAdmin

  const templates = loadTemplates()
  const template = templates[selectedTemplate]
  const { subject, body } = applyTemplate(template, lead, undefined, settings)

  const mailtoHref = `mailto:${lead.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

  useEffect(() => {
    fetch('/api/outreach/settings')
      .then((r) => r.json())
      .then((data) => setSettings(data.settings ?? null))
      .catch(() => {})
  }, [])

  const handleMarkContacted = async () => {
    setMarkingContacted(true)
    try {
      onStatusChange('contacted')
      if (noteText.trim()) {
        await onNoteAdded({ company_id: lead.id, content: noteText.trim() })
      }
      setContacted(true)
    } finally {
      setMarkingContacted(false)
    }
  }

  const handleSend = async () => {
    if (!lead.email) return
    setSending(true)
    setSendStatus(null)
    setSendError(null)
    try {
      const res = await fetch('/api/outreach/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: lead.id,
          recipientEmail: lead.email,
          subject,
          body,
          templateId: selectedTemplate,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
          followupDelays: followupsEnabled ? [3, 7] : [],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur envoi')
      setSendStatus(data.scheduled ? 'Email programmé' : 'Email envoyé')
      if (!data.scheduled) {
        onStatusChange('contacted')
        setContacted(true)
      }
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Erreur envoi')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {/* Template selector */}
      <div>
        {!compact && <p className="text-sm font-medium text-zinc-400 mb-2">Modèle d&apos;email</p>}
        <div className="flex gap-2 flex-wrap">
          {(Object.entries(templates) as [TemplateId, typeof template][]).map(([id, t]) => (
            <button
              key={id}
              onClick={() => setSelectedTemplate(id)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors border ${
                selectedTemplate === id
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-zinc-800/60 text-zinc-400 border-white/[0.08] hover:border-amber-500/40 hover:text-zinc-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div>
        {!compact && <p className="text-xs font-medium text-zinc-500 mb-1">Aperçu</p>}
        <div className="text-xs text-zinc-500 mb-1">
          <span className="font-medium">Objet :</span> {subject}
        </div>
        <textarea
          readOnly
          value={body}
          rows={compact ? 5 : 7}
          className="w-full text-xs text-zinc-300 bg-zinc-800/60 border border-white/[0.08] rounded-lg p-3 resize-none font-mono leading-relaxed"
        />
      </div>

      {/* Open in mail client */}
      {lead.email ? (
        <div className="space-y-2">
          {hasFullAccess ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
              <label className="relative">
                <CalendarClock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.08] bg-zinc-800/60 py-2.5 pl-9 pr-3 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </label>
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : scheduledAt ? <CalendarClock className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                {sending ? 'Traitement...' : scheduledAt ? 'Programmer' : 'Envoyer'}
              </button>
            </div>
          ) : (
            <a
              href={mailtoHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-700"
            >
              <Mail className="h-4 w-4" />
              Ouvrir dans ma messagerie
            </a>
          )}

          {hasFullAccess && (
            <label className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-zinc-800/40 px-3 py-2 text-xs text-zinc-400">
              Relances automatiques J+3 et J+7
              <input
                type="checkbox"
                checked={followupsEnabled}
                onChange={(e) => setFollowupsEnabled(e.target.checked)}
                className="h-4 w-4 accent-amber-500"
              />
            </label>
          )}

          {sendStatus && (
            <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300">
              {sendStatus}
            </p>
          )}
          {sendError && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              <p className="font-medium">{sendError}</p>
              <a href={mailtoHref} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-red-200 underline underline-offset-2">
                <Mail className="h-3 w-3" />
                Ouvrir en fallback dans ma messagerie
              </a>
            </div>
          )}

          {!hasFullAccess && (
            <p className="text-xs text-amber-400">
              Passez au plan Pro pour envoyer directement depuis LeadHunter avec suivi et relances automatiques.
            </p>
          )}
          {hasFullAccess && !settings?.sender_email && (
            <p className="text-xs text-amber-400">
              Ajoutez un email pro dans Paramètres pour envoyer depuis LeadHunter.
            </p>
          )}
        </div>
      ) : (
        <div className="text-xs text-zinc-500 bg-zinc-800/40 border border-white/[0.08] rounded-lg p-3">
          Pas d&apos;email connu — copiez le texte pour un envoi manuel.
        </div>
      )}

      {/* After sending */}
      <div className="border-t border-white/[0.06] pt-3">
        <p className="text-xs font-medium text-zinc-500 mb-2">Après l&apos;envoi</p>

        <textarea
          placeholder="Note optionnelle (ex: laissé un message vocal, relance prévue...)"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          rows={2}
          className="w-full text-sm text-zinc-300 bg-zinc-800/60 border border-white/[0.08] rounded-lg p-2.5 resize-none mb-3 placeholder:text-zinc-600"
        />

        {contacted ? (
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
            <CheckCircle className="h-4 w-4" />
            Statut mis à jour
          </div>
        ) : (
          <button
            onClick={handleMarkContacted}
            disabled={markingContacted}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-60"
          >
            {markingContacted ? (
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Marquer comme contacté
          </button>
        )}
      </div>
    </div>
  )
}

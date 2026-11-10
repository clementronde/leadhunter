'use client'

import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout'
import { LeadsTable, LeadsFilters, LeadCard, CsvImport } from '@/components/leads'
import { Card, Button, Skeleton, UpgradeModal, ProGate } from '@/components/ui'
import { leadsApi } from '@/lib/api'
import { exportLeadsToXLSX, exportLeadsToCSV, FREE_CSV_LIMIT } from '@/lib/export'
import { Company, LeadFilters, LeadSegment, LeadStatus, OutreachSettings } from '@/types'
import { usePlan } from '@/hooks/usePlan'
import { applyTemplate, CustomTemplate, loadTemplates, TemplateId } from '@/lib/email-templates'
import {
  Sparkles,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Upload,
  Loader2,
  Mail,
  X,
  Copy,
  Check,
  ExternalLink,
  Users,
  Bell,
  AtSign,
  Gauge,
  Send,
} from 'lucide-react'

// ============================================
// Bulk Contact Modal
// ============================================
function BulkContactModal({ filters, onClose }: { filters: LeadFilters; onClose: () => void }) {
  const [leads, setLeads] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [markedIds, setMarkedIds] = useState<Set<string>>(new Set())
  const [markingAll, setMarkingAll] = useState(false)

  useEffect(() => {
    leadsApi.getAll(filters, 1, 200).then((res) => {
      setLeads(res.data.filter((l) => l.email && !l.do_not_contact))
      setLoading(false)
    })
  }, [])

  const allEmails = leads.map((l) => l.email).join(', ')
  const leadsWithEmail = leads.filter((l) => !markedIds.has(l.id))

  const handleCopyEmails = () => {
    navigator.clipboard.writeText(allEmails)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleMarkAll = async () => {
    setMarkingAll(true)
    await Promise.all(leads.map((l) => leadsApi.updateStatus(l.id, 'contacted')))
    setMarkedIds(new Set(leads.map((l) => l.id)))
    setMarkingAll(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-white/[0.08] bg-zinc-900/95 backdrop-blur-xl shadow-2xl shadow-black/60 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15">
              <Users className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Contacter tous les leads</h2>
              {!loading && (
                <p className="text-sm text-zinc-500">
                  {leads.length} lead{leads.length > 1 ? 's' : ''} avec un email sur les filtres actifs
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:bg-white/5 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-400">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Chargement des leads...
          </div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center text-zinc-400">
            <Mail className="h-10 w-10 mx-auto mb-3 text-zinc-200" />
            <p className="font-medium">Aucun lead avec un email</p>
            <p className="text-sm mt-1">Ajoutez des emails depuis les fiches individuelles</p>
          </div>
        ) : (
          <>
            {/* Actions bar */}
            <div className="px-6 py-3 bg-zinc-800/40 border-b border-white/[0.06] flex items-center gap-3 flex-wrap">
              <button
                onClick={handleCopyEmails}
                className="flex items-center gap-1.5 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 border border-white/[0.08] rounded-lg px-3 py-1.5 transition-colors"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copié !' : 'Copier tous les emails'}
              </button>

              <a
                href={`mailto:?bcc=${encodeURIComponent(allEmails)}&subject=${encodeURIComponent('Proposition de services web')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-1.5 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Ouvrir en BCC dans ma messagerie
              </a>

              {markedIds.size < leads.length && (
                <button
                  onClick={handleMarkAll}
                  disabled={markingAll}
                  className="flex items-center gap-1.5 text-sm font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                >
                  {markingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Marquer tous comme contactés
                </button>
              )}
            </div>

            {/* Lead list */}
            <div className="overflow-y-auto flex-1 divide-y divide-white/[0.04]">
              {leads.map((lead) => (
                <div key={lead.id} className={`flex items-center justify-between px-6 py-3 ${markedIds.has(lead.id) ? 'opacity-40' : ''}`}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-200 truncate">{lead.name}</p>
                    <p className="text-xs text-zinc-500">{lead.city} · {lead.email}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    {markedIds.has(lead.id) ? (
                      <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" /> Contacté
                      </span>
                    ) : (
                      <>
                        <a
                          href={`mailto:${lead.email}?subject=${encodeURIComponent('Proposition de services web')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          Contacter
                        </a>
                        <button
                          onClick={async () => {
                            await leadsApi.updateStatus(lead.id, 'contacted')
                            setMarkedIds((prev) => new Set([...prev, lead.id]))
                          }}
                          className="text-xs text-zinc-500 hover:text-emerald-400 font-medium transition-colors"
                          title="Marquer comme contacté"
                        >
                          ✓
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-white/[0.06] bg-zinc-800/40 rounded-b-2xl">
              <p className="text-xs text-zinc-500 text-center">
                {markedIds.size > 0 ? `${markedIds.size} lead${markedIds.size > 1 ? 's' : ''} marqués comme contactés` : `${leads.length} email${leads.length > 1 ? 's' : ''} disponible${leads.length > 1 ? 's' : ''}`}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function CampaignModal({ filters, onClose }: { filters: LeadFilters; onClose: () => void }) {
  const [leads, setLeads] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('sans-site')
  const [scheduledAt, setScheduledAt] = useState('')
  const [followupsEnabled, setFollowupsEnabled] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<OutreachSettings | null>(null)
  const templates = loadTemplates(settings?.email_templates)
  // Mode IA : un email personnalisé par lead (fiche Google + audit), modifiable avant envoi
  const [mode, setMode] = useState<'template' | 'ai'>('template')
  const [drafts, setDrafts] = useState<Record<string, { subject: string; body: string }>>({})
  const [draftFailed, setDraftFailed] = useState<Set<string>>(new Set())
  const [drafting, setDrafting] = useState<{ done: number; total: number } | null>(null)
  const stopDrafting = useRef(false)

  useEffect(() => {
    Promise.all([
      leadsApi.getAll(filters, 1, 100),
      fetch('/api/outreach/settings').then((r) => r.json()).catch(() => ({ settings: null })),
    ])
      .then(([res, settingsData]) => {
        setLeads(res.data.filter((lead) => lead.email && !lead.do_not_contact))
        setSettings(settingsData.settings ?? null)
      })
      .catch(() => setError('Erreur chargement campagne'))
      .finally(() => setLoading(false))
  }, [filters])

  const renderedMessages = leads.map((lead) => {
    const templateId = lead.has_website ? selectedTemplate : 'sans-site'
    const template = templates[templateId]
    const rendered = applyTemplate(template, lead, undefined, settings)
    return { lead, templateId, ...rendered }
  })

  const aiMessages = leads
    .filter((lead) => drafts[lead.id])
    .map((lead) => ({ lead, templateId: 'ia', ...drafts[lead.id] }))
  const messagesToSend = mode === 'ai' ? aiMessages : renderedMessages

  const handleDraftAll = async () => {
    const queue = leads.filter((lead) => !drafts[lead.id]).map((lead) => lead.id)
    if (queue.length === 0) return
    stopDrafting.current = false
    setError(null)
    setDraftFailed(new Set())
    const total = queue.length
    let done = 0
    setDrafting({ done, total })
    const worker = async () => {
      while (queue.length > 0 && !stopDrafting.current) {
        const id = queue.shift()!
        try {
          const res = await fetch(`/api/leads/${id}/draft-message`, { method: 'POST' })
          if (res.status === 429) {
            queue.push(id)
            await new Promise((r) => setTimeout(r, 15_000))
            continue
          }
          const data = await res.json()
          if (!res.ok) throw new Error(data.error)
          setDrafts((prev) => ({ ...prev, [id]: { subject: data.subject, body: data.body } }))
        } catch {
          setDraftFailed((prev) => new Set(prev).add(id))
        }
        done++
        setDrafting({ done, total })
      }
    }
    await Promise.all([worker(), worker(), worker()])
    setDrafting(null)
  }

  const updateDraft = (id: string, patch: Partial<{ subject: string; body: string }>) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))

  const handleCreateCampaign = async () => {
    if (messagesToSend.length === 0) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/outreach/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Campagne${mode === 'ai' ? ' IA' : ''} ${new Date().toLocaleDateString('fr-FR')}`,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
          followupDelays: followupsEnabled ? [3, 7] : [],
          messages: messagesToSend.map((message) => ({
            companyId: message.lead.id,
            recipientEmail: message.lead.email,
            subject: message.subject,
            body: message.body,
            templateId: message.templateId,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur création campagne')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur création campagne')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm" />
      <div
        className="relative flex max-h-[88vh] w-full max-w-4xl flex-col rounded-2xl border border-white/[0.08] bg-zinc-900/95 shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-center gap-3">
            <Send className="h-5 w-5 text-blue-400" />
            <div>
              <h2 className="font-semibold text-white">Prévisualiser la campagne</h2>
              <p className="text-sm text-zinc-500">{renderedMessages.length} destinataire{renderedMessages.length > 1 ? 's' : ''} avec email</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 md:grid-cols-[280px_1fr]">
          <div className="space-y-4 border-b border-white/[0.06] p-5 md:border-b-0 md:border-r">
            <div>
              <p className="mb-2 text-xs font-medium text-zinc-500">Message</p>
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-white/[0.06] bg-zinc-800/40 p-1">
                {([['template', 'Modèle commun'], ['ai', 'IA, 1 par lead']] as const).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setMode(id)}
                    className={`rounded-md px-2 py-1.5 text-xs font-medium ${
                      mode === id ? 'bg-amber-500 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {mode === 'ai' ? (
              <div className="space-y-2">
                <p className="text-xs leading-relaxed text-zinc-500">
                  L&apos;IA écrit un email différent pour chaque lead à partir de sa fiche Google et de son audit. Relisez et corrigez avant de créer la campagne.
                </p>
                {drafting ? (
                  <Button variant="secondary" onClick={() => { stopDrafting.current = true }} className="w-full">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {drafting.done}/{drafting.total} rédigés · Arrêter
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={handleDraftAll}
                    disabled={loading || leads.every((lead) => drafts[lead.id])}
                    className="w-full"
                  >
                    <Sparkles className="h-4 w-4" />
                    {aiMessages.length === 0
                      ? `Rédiger ${leads.length} email${leads.length > 1 ? 's' : ''}`
                      : `Rédiger les ${leads.length - aiMessages.length} restants`}
                  </Button>
                )}
                {draftFailed.size > 0 && !drafting && (
                  <p className="text-xs text-amber-400">{draftFailed.size} échec{draftFailed.size > 1 ? 's' : ''} : relancez pour réessayer.</p>
                )}
              </div>
            ) : (
            <div>
              <p className="mb-2 text-xs font-medium text-zinc-500">Template pour leads avec site</p>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(templates) as [TemplateId, CustomTemplate][]).map(([id, template]) => (
                  <button
                    key={id}
                    onClick={() => setSelectedTemplate(id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                      selectedTemplate === id
                        ? 'border-amber-500 bg-amber-500 text-white'
                        : 'border-white/[0.08] bg-zinc-800/60 text-zinc-400'
                    }`}
                  >
                    {template.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-zinc-500">Les leads sans site reçoivent toujours le modèle « sans site ».</p>
            </div>
            )}

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-500">Programmer</span>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full rounded-lg border border-white/[0.08] bg-zinc-800/60 px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </label>

            <label className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-zinc-800/40 px-3 py-2 text-xs text-zinc-400">
              Relances J+3 et J+7
              <input
                type="checkbox"
                checked={followupsEnabled}
                onChange={(e) => setFollowupsEnabled(e.target.checked)}
                className="h-4 w-4 accent-amber-500"
              />
            </label>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button onClick={handleCreateCampaign} disabled={creating || loading || !!drafting || messagesToSend.length === 0} className="w-full">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {creating ? 'Création...' : `Créer la campagne (${messagesToSend.length})`}
            </Button>
          </div>

          <div className="min-h-0 overflow-y-auto p-5">
            {loading ? (
              <div className="p-10 text-center text-sm text-zinc-400">
                <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                Chargement des leads...
              </div>
            ) : renderedMessages.length === 0 ? (
              <div className="p-10 text-center text-sm text-zinc-500">Aucun lead avec email dans les filtres actifs.</div>
            ) : mode === 'ai' ? (
              <div className="space-y-4">
                {leads.map((lead) => {
                  const draft = drafts[lead.id]
                  return (
                    <div key={lead.id} className="rounded-xl border border-white/[0.06] bg-zinc-800/40 p-4">
                      <div className="mb-3">
                        <p className="font-medium text-zinc-200">{lead.name}</p>
                        <p className="text-xs text-zinc-500">{lead.email} · {lead.city}</p>
                      </div>
                      {draft ? (
                        <div className="space-y-2">
                          <input
                            value={draft.subject}
                            onChange={(e) => updateDraft(lead.id, { subject: e.target.value })}
                            aria-label={`Objet pour ${lead.name}`}
                            className="w-full rounded-lg border border-white/[0.06] bg-zinc-900/70 px-3 py-2 text-xs font-medium text-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <textarea
                            value={draft.body}
                            onChange={(e) => updateDraft(lead.id, { body: e.target.value })}
                            aria-label={`Message pour ${lead.name}`}
                            rows={8}
                            className="w-full rounded-lg border border-white/[0.06] bg-zinc-900/70 p-3 text-xs leading-relaxed text-zinc-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-500">
                          {draftFailed.has(lead.id) ? 'Rédaction échouée' : drafting ? 'En attente…' : 'Pas encore rédigé'}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="space-y-4">
                {renderedMessages.slice(0, 10).map((message) => (
                  <div key={message.lead.id} className="rounded-xl border border-white/[0.06] bg-zinc-800/40 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-zinc-200">{message.lead.name}</p>
                        <p className="text-xs text-zinc-500">{message.lead.email} · {message.lead.city}</p>
                      </div>
                      <span className="rounded-full bg-zinc-900 px-2 py-1 text-[10px] font-medium text-zinc-400">
                        {templates[message.templateId].label}
                      </span>
                    </div>
                    <p className="mb-2 text-xs text-zinc-400"><span className="font-medium text-zinc-300">Objet:</span> {message.subject}</p>
                    <textarea
                      readOnly
                      value={message.body}
                      rows={5}
                      className="w-full resize-none rounded-lg border border-white/[0.06] bg-zinc-900/70 p-3 text-xs leading-relaxed text-zinc-400"
                    />
                  </div>
                ))}
                {renderedMessages.length > 10 && (
                  <p className="text-center text-xs text-zinc-500">
                    + {renderedMessages.length - 10} autres messages seront créés avec le même modèle.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface DueEmailMessage {
  id: string
  recipient_email: string
  subject: string
  scheduled_at: string
  companies?: { name?: string | null } | null
}

function DueEmailsModal({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<DueEmailMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/outreach/due')
      .then((r) => r.json())
      .then((data) => setMessages(data.messages ?? []))
      .catch(() => setError('Erreur réseau'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleProcess = async () => {
    setProcessing(true)
    setError(null)
    try {
      const res = await fetch('/api/outreach/due', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur envoi')
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur envoi')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-white/[0.08] bg-zinc-900/95 shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-amber-400" />
            <div>
              <h2 className="font-semibold text-white">Emails à envoyer aujourd&apos;hui</h2>
              <p className="text-sm text-zinc-500">{messages.length} email{messages.length > 1 ? 's' : ''} programmé{messages.length > 1 ? 's' : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto divide-y divide-white/[0.04]">
          {loading ? (
            <div className="p-10 text-center text-sm text-zinc-400">
              <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
              Chargement...
            </div>
          ) : messages.length === 0 ? (
            <div className="p-10 text-center text-sm text-zinc-500">Aucun email dû aujourd&apos;hui.</div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="px-6 py-4">
                <p className="font-medium text-zinc-200">{message.subject}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {message.recipient_email} · {message.companies?.name ?? 'Lead'} · {new Date(message.scheduled_at).toLocaleString('fr-FR')}
                </p>
              </div>
            ))
          )}
        </div>

        {error && <p className="px-6 pt-3 text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-white/[0.06] px-6 py-4">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          <Button onClick={handleProcess} disabled={processing || messages.length === 0}>
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Envoyer les emails dus
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Sections : sans site / refonte / SEO / à auditer
// ============================================
const SEGMENTS: { id: LeadSegment | 'all'; label: string; hint: string }[] = [
  { id: 'all', label: 'Tous', hint: 'Tous vos leads' },
  { id: 'no_site', label: 'Sans site', hint: 'Création de site' },
  { id: 'redesign', label: 'Refonte', hint: 'Site vieux, daté ou pas mobile' },
  { id: 'seo', label: 'SEO / maintenance', hint: 'Site récent à référencer' },
  { id: 'to_audit', label: 'À auditer', hint: 'Site pas encore analysé' },
]

// ============================================
// Leads Content
// ============================================
function LeadsContent() {
  const searchParams = useSearchParams()
  const { canExport, canAudit, isPro } = usePlan()
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showBulkContact, setShowBulkContact] = useState(false)
  const [showDueEmails, setShowDueEmails] = useState(false)
  const [showCampaign, setShowCampaign] = useState(false)
  const [showCsvImport, setShowCsvImport] = useState(false)
  const [csvBanner, setCsvBanner] = useState<{ exported: number; total: number } | null>(null)

  const [leads, setLeads] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [contactSearch, setContactSearch] = useState<
    | { phase: 'confirm'; ids: string[] }
    | { phase: 'running'; total: number; done: number; found: number }
    | null
  >(null)
  const stopContactSearch = useRef(false)
  const [auditing, setAuditing] = useState<{ done: number; total: number } | null>(null)
  const [segmentCounts, setSegmentCounts] = useState<Record<LeadSegment, number> | null>(null)
  const [actionBanner, setActionBanner] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 20,
    total: 0,
    totalPages: 0,
  })

  const [filters, setFilters] = useState<LeadFilters>(() => {
    const initial: LeadFilters = {}
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const hasWebsite = searchParams.get('has_website')
    const search = searchParams.get('search')
    const sort = searchParams.get('sort')
    const segment = searchParams.get('segment')

    if (status) initial.status = status as LeadStatus
    if (priority) initial.priority = priority as LeadFilters['priority']
    if (hasWebsite) initial.has_website = hasWebsite === 'true'
    if (search) initial.search = search
    if (sort === 'score' || sort === 'recent') initial.sort = sort
    if (segment && SEGMENTS.some((s) => s.id === segment)) initial.segment = segment as LeadSegment

    return initial
  })

  const loadLeads = useCallback(
    async (page = 1) => {
      setLoading(true)
      try {
        const response = await leadsApi.getAll(filters, page, pagination.perPage)
        setLeads(response.data)
        setPagination({
          page: response.page,
          perPage: response.per_page,
          total: response.total,
          totalPages: response.total_pages,
        })
      } catch (error) {
        console.error('Error loading leads:', error)
        setLeads([])
        setPagination({ page: 1, perPage: 20, total: 0, totalPages: 0 })
      } finally {
        setLoading(false)
      }
    },
    [filters, pagination.perPage]
  )

  useEffect(() => {
    loadLeads(1)
  }, [filters, loadLeads])

  const loadSegmentCounts = useCallback(() => {
    leadsApi.getSegmentCounts().then(setSegmentCounts).catch(() => setSegmentCounts(null))
  }, [])

  useEffect(() => {
    loadSegmentCounts()
  }, [loadSegmentCounts])

  const handleStatusChange = async (id: string, status: LeadStatus) => {
    try {
      await leadsApi.updateStatus(id, status)
      setLeads(leads.map((l) => (l.id === id ? { ...l, status } : l)))
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  // Case « À appeler » : met le lead dans la colonne « À appeler » de la page Appels, ou l'en retire
  const handleToggleCallList = async (lead: Company, checked: boolean) => {
    const call_list_at = checked ? new Date().toISOString() : null
    setLeads((items) => items.map((l) => (l.id === lead.id ? { ...l, call_list_at } : l)))
    try {
      await leadsApi.update(lead.id, { call_list_at })
      setActionBanner({
        tone: 'success',
        message: checked ? `${lead.name} est dans « À appeler » (page Appels).` : `${lead.name} est retiré de « À appeler ».`,
      })
    } catch {
      setLeads((items) => items.map((l) => (l.id === lead.id ? { ...l, call_list_at: lead.call_list_at ?? null } : l)))
      setActionBanner({ tone: 'error', message: "Impossible de mettre à jour la liste d'appels. Réessayez." })
    }
  }

  const handlePageChange = (newPage: number) => {
    loadLeads(newPage)
  }

  const handleExportCSV = () => {
    if (leads.length === 0) return
    const result = exportLeadsToCSV(leads, 'leads-leadhunter', isPro)
    if (!isPro && result.total > FREE_CSV_LIMIT) {
      setCsvBanner(result)
    }
  }

  const handleExportXLSX = async () => {
    if (!canExport) {
      setShowUpgradeModal(true)
      return
    }
    if (leads.length === 0) return
    setExporting(true)
    try {
      await exportLeadsToXLSX(leads, 'leads-leadhunter')
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setExporting(false)
    }
  }

  // Recherche des contacts de tous les leads sans email (site, puis recherche web par l'IA)
  const SEARCHED_KEY = 'lh-contacts-searched'
  const readSearched = (): Set<string> => {
    try { return new Set(JSON.parse(localStorage.getItem(SEARCHED_KEY) || '[]')) } catch { return new Set() }
  }

  const handlePrepareContactSearch = async () => {
    if (!canAudit) {
      setShowUpgradeModal(true)
      return
    }
    setActionBanner(null)
    try {
      const searched = readSearched()
      const ids = (await leadsApi.getIdsMissingEmail()).filter((id) => !searched.has(id))
      if (ids.length === 0) {
        setActionBanner({ tone: 'success', message: 'Tous vos leads ont déjà un email ou ont déjà été recherchés.' })
        return
      }
      setContactSearch({ phase: 'confirm', ids })
    } catch {
      setActionBanner({ tone: 'error', message: 'Impossible de charger les leads sans email' })
    }
  }

  const handleRunContactSearch = async (ids: string[]) => {
    stopContactSearch.current = false
    let done = 0
    let found = 0
    setContactSearch({ phase: 'running', total: ids.length, done, found })
    const searched = readSearched()
    const queue = [...ids]

    const worker = async () => {
      while (queue.length > 0 && !stopContactSearch.current) {
        const id = queue.shift()!
        try {
          const res = await fetch(`/api/leads/${id}/find-contacts`, { method: 'POST' })
          const data = await res.json().catch(() => ({}))
          if (res.status === 429) {
            queue.push(id)
            await new Promise((r) => setTimeout(r, 15_000))
            continue
          }
          if (data?.found?.email) found++
          searched.add(id)
        } catch {
          // lead ignoré, on continue
        }
        done++
        setContactSearch({ phase: 'running', total: ids.length, done, found })
      }
    }

    await Promise.all([worker(), worker(), worker()])
    try { localStorage.setItem(SEARCHED_KEY, JSON.stringify([...searched])) } catch {}
    setContactSearch(null)
    setActionBanner({
      tone: 'success',
      message: `${found} email${found > 1 ? 's' : ''} trouvé${found > 1 ? 's' : ''} sur ${done} lead${done > 1 ? 's' : ''} recherché${done > 1 ? 's' : ''}${stopContactSearch.current ? ' (arrêté)' : ''}.`,
    })
    loadLeads(pagination.page)
  }

  // Audite les sites de la page affichée : PageSpeed + capture + avis design
  const handleAuditSites = async () => {
    if (!canAudit) {
      setShowUpgradeModal(true)
      return
    }
    const ids = leads.filter((lead) => lead.website && lead.has_website).map((lead) => lead.id)
    if (ids.length === 0) return
    setActionBanner(null)
    setAuditing({ done: 0, total: ids.length })
    let ok = 0
    let failed = 0
    try {
      const res = await fetch('/api/audit/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyIds: ids }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur audit')

      for (let round = 0; round < Math.ceil(ids.length / 4) + 3; round++) {
        const run = await fetch('/api/audit/queue', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: 4 }),
        })
        if (!run.ok) break
        const batch = await run.json() as { processed: number; results: { status: string }[] }
        if (!batch.processed) break
        ok += batch.results.filter((r) => r.status === 'completed').length
        failed += batch.results.filter((r) => r.status !== 'completed').length
        setAuditing({ done: Math.min(ok + failed, ids.length), total: ids.length })
      }
      setActionBanner({
        tone: ok > 0 || failed === 0 ? 'success' : 'error',
        message: `${ok} site${ok > 1 ? 's' : ''} audité${ok > 1 ? 's' : ''}${failed ? `, ${failed} en échec (site injoignable ou trop lent)` : ''}. Ouvrez une fiche pour voir la capture et l'avis design.`,
      })
      loadLeads(pagination.page)
      loadSegmentCounts()
    } catch (err) {
      setActionBanner({ tone: 'error', message: err instanceof Error ? err.message : 'Erreur audit' })
    } finally {
      setAuditing(null)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason="contact"
      />

      {showBulkContact && (
        <BulkContactModal
          filters={filters}
          onClose={() => setShowBulkContact(false)}
        />
      )}

      {showDueEmails && <DueEmailsModal onClose={() => setShowDueEmails(false)} />}

      {showCampaign && <CampaignModal filters={filters} onClose={() => setShowCampaign(false)} />}

      {showCsvImport && (
        <CsvImport
          onImported={(count) => { if (count > 0) loadLeads(1) }}
          onClose={() => setShowCsvImport(false)}
        />
      )}

      {/* CSV free-tier banner */}
      {csvBanner && (
        <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm">
          <FileText className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="text-amber-300 flex-1">
            <span className="font-semibold">{csvBanner.exported} leads exportés</span> sur {csvBanner.total} — passez en Pro pour tout exporter.
          </span>
          <a href="/upgrade" className="text-xs font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-2">
            Passer Pro
          </a>
          <button onClick={() => setCsvBanner(null)} className="text-amber-500 hover:text-amber-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {contactSearch?.phase === 'confirm' && (
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-sm">
          <span className="flex-1 text-amber-200">
            <span className="font-semibold">{contactSearch.ids.length} leads sans email.</span>{' '}
            L&apos;IA cherche sur leur site puis sur le web (Pages Jaunes, réseaux sociaux…).
            Environ {Math.max(1, Math.round(contactSearch.ids.length * 0.03))} € et {Math.max(1, Math.round(contactSearch.ids.length / 12))} min. Gardez la page ouverte.
          </span>
          <Button size="sm" onClick={() => handleRunContactSearch(contactSearch.ids)}>Lancer la recherche</Button>
          <Button size="sm" variant="outline" onClick={() => setContactSearch(null)}>Annuler</Button>
        </div>
      )}

      {contactSearch?.phase === 'running' && (
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
          <span className="flex-1 text-amber-200">
            Recherche des contacts : {contactSearch.done}/{contactSearch.total} · {contactSearch.found} email{contactSearch.found > 1 ? 's' : ''} trouvé{contactSearch.found > 1 ? 's' : ''}
          </span>
          <Button size="sm" variant="outline" onClick={() => { stopContactSearch.current = true }}>Arrêter</Button>
        </div>
      )}

      {actionBanner && (
        <div className={`flex items-center gap-3 p-3 rounded-xl border text-sm ${
          actionBanner.tone === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
            : 'bg-red-500/10 border-red-500/20 text-red-300'
        }`}>
          <Check className="h-4 w-4 shrink-0" />
          <span className="flex-1">{actionBanner.message}</span>
          <button onClick={() => setActionBanner(null)} className="opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Sections */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {SEGMENTS.map((segment) => {
          const active = (filters.segment ?? 'all') === segment.id
          const count = segment.id === 'all' ? null : segmentCounts?.[segment.id]
          return (
            <button
              key={segment.id}
              type="button"
              onClick={() => setFilters((f) => ({ ...f, segment: segment.id === 'all' ? undefined : segment.id, has_website: undefined }))}
              className={`text-left rounded-xl border p-4 transition-colors ${
                active
                  ? 'border-amber-500/50 bg-amber-500/10'
                  : 'border-white/[0.06] bg-zinc-900/70 hover:border-white/[0.12]'
              }`}
            >
              <p className={`text-sm font-semibold ${active ? 'text-amber-300' : 'text-zinc-200'}`}>{segment.label}</p>
              <p className="mt-2 text-2xl font-semibold text-white tabular-nums">
                {segment.id === 'all' ? (active && !loading ? pagination.total : '·') : count ?? '…'}
              </p>
              <p className="mt-1 text-xs text-zinc-500">{segment.hint}</p>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <LeadsFilters filters={filters} onChange={setFilters} onReset={() => setFilters({})} />
      </Card>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-zinc-500">
          {loading ? (
            'Chargement...'
          ) : (
            <>
              <span className="font-semibold text-zinc-200">{leads.length}</span> sur{' '}
              <span className="font-semibold text-zinc-200">{pagination.total}</span> resultats
            </>
          )}
        </p>

        <div className="flex items-center gap-2">
          {/* Follow-up filter */}
          <button
            onClick={() => setFilters((f) => ({ ...f, needs_followup: f.needs_followup ? undefined : true }))}
            className={`flex items-center gap-1.5 text-sm font-medium rounded-lg px-3 py-1.5 border transition-colors ${
              filters.needs_followup
                ? 'bg-orange-500/20 border-orange-500/30 text-orange-400'
                : 'border-white/[0.08] text-zinc-500 hover:text-amber-400'
            }`}
            title="Leads contactés il y a plus de 7 jours — à relancer"
          >
            <Bell className="h-4 w-4" />
            À relancer
          </button>

          <button
            onClick={() => setShowDueEmails(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-amber-400 border border-white/[0.08] rounded-lg px-3 py-1.5 transition-colors"
          >
            <Mail className="h-4 w-4" />
            À envoyer
          </button>

          {canExport ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCampaign(true)}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Campagne
            </Button>
          ) : (
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-amber-400 border border-white/[0.08] rounded-lg px-3 py-1.5 transition-colors"
            >
              <Send className="h-4 w-4" />
              Campagne
              <span className="bg-amber-500/20 text-amber-400 text-[9px] font-bold px-1 py-0.5 rounded-full leading-none">Pro</span>
            </button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrepareContactSearch}
            disabled={!!contactSearch || loading}
            className="flex items-center gap-2"
            title="L'IA cherche l'email et le téléphone de tous les leads qui n'en ont pas"
          >
            {contactSearch?.phase === 'running' ? <Loader2 className="h-4 w-4 animate-spin" /> : <AtSign className="h-4 w-4" />}
            Trouver tous les contacts
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAuditSites}
            disabled={!!auditing || loading || leads.every((lead) => !lead.website || !lead.has_website)}
            className="flex items-center gap-2"
            title="PageSpeed, capture d'écran et avis design pour les sites de cette page"
          >
            {auditing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gauge className="h-4 w-4" />}
            {auditing ? `Audit ${auditing.done}/${auditing.total}…` : 'Auditer les sites'}
          </Button>

          {/* Bulk contact */}
          {canExport ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBulkContact(true)}
              disabled={loading || leads.length === 0}
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              Contacter tous
            </Button>
          ) : (
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-amber-400 border border-white/[0.08] rounded-lg px-3 py-1.5 transition-colors"
            >
              <Mail className="h-4 w-4" />
              Contacter tous
              <span className="bg-amber-500/20 text-amber-400 text-[9px] font-bold px-1 py-0.5 rounded-full leading-none">Pro</span>
            </button>
          )}

          {/* CSV import */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCsvImport(true)}
            className="flex items-center gap-2"
            title="Importer des leads depuis un fichier CSV"
          >
            <Upload className="h-4 w-4" />
            Importer CSV
          </Button>

          {/* CSV export — gratuit (limité) */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={loading || leads.length === 0}
            className="flex items-center gap-2"
            title={isPro ? 'Exporter en CSV' : `Exporter les ${FREE_CSV_LIMIT} premiers leads en CSV (gratuit)`}
          >
            <FileText className="h-4 w-4" />
            {isPro ? `CSV (${leads.length})` : `CSV (${Math.min(leads.length, FREE_CSV_LIMIT)})`}
          </Button>

          <ProGate
            isPro={canExport}
            reason="export"
            variant="badge"
            onUpgrade={() => setShowUpgradeModal(true)}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportXLSX}
              disabled={exporting || loading || leads.length === 0}
              className="flex items-center gap-2"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {exporting ? 'Export...' : `Exporter XLSX (${leads.length})`}
            </Button>
          </ProGate>

          <div className="flex items-center gap-0.5 bg-zinc-800/60 p-1 rounded-lg border border-white/[0.06]">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'table' ? 'bg-zinc-700 shadow-sm text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
              }`}
              title="Vue tableau"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'cards' ? 'bg-zinc-700 shadow-sm text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
              }`}
              title="Vue cartes"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        viewMode === 'table' ? (
          <Card>
            <div className="p-4 space-y-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-24 ml-auto" />
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-8 w-12" />
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </Card>
            ))}
          </div>
        )
      ) : leads.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            {Object.keys(filters).length > 0 ? (
              <>
                <p className="text-zinc-400 text-lg mb-2">Aucun résultat</p>
                <p className="text-zinc-500 text-sm mb-4">
                  Aucun lead ne correspond à vos filtres actifs.
                </p>
                <button
                  onClick={() => setFilters({})}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors"
                >
                  Réinitialiser les filtres
                </button>
              </>
            ) : (
              <>
                <p className="text-zinc-400 text-lg mb-2">Aucun lead</p>
                <p className="text-zinc-500 text-sm mb-4">
                  Vous n&apos;avez pas encore de prospects. Lancez un scan pour en trouver.
                </p>
                <a
                  href="/scanner"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors"
                >
                  Lancer un scan
                </a>
              </>
            )}
          </div>
        </Card>
      ) : viewMode === 'table' ? (
        <Card>
          <LeadsTable leads={leads} onStatusChange={handleStatusChange} onToggleCallList={handleToggleCallList} />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            Page {pagination.page} sur {pagination.totalPages}
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Precedent
            </Button>

            <div className="flex items-center gap-1">
              {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                const pageNum = i + 1
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                      pageNum === pagination.page
                        ? 'bg-amber-500 text-white'
                        : 'text-zinc-400 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
            >
              Suivant
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LeadsPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen">
      <Header
        title="Leads"
        subtitle="Gérez vos prospects, trouvez les emails et passez à l'action"
      />

      <Suspense fallback={<div className="p-6"><Skeleton className="h-96" /></div>}>
        <LeadsContent />
      </Suspense>
    </div>
  )
}

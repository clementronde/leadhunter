'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout'
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, Skeleton } from '@/components/ui'
import { OutreachPanel } from '@/components/leads'
import { leadsApi } from '@/lib/api'
import { Company, LeadStatus, Note, WebsiteAudit } from '@/types'
import {
  priorityLabels,
  priorityColors,
  statusLabels,
  statusColors,
  sectorLabels,
  getScoreColor,
  getLighthouseColor,
  formatDate,
  formatDateTime,
  timeAgo,
  severityColors
} from '@/lib/utils'
import {
  ArrowLeft,
  Globe,
  Globe2,
  Phone,
  Mail,
  MapPin,
  Building2,
  ExternalLink,
  Gauge,
  Shield,
  Smartphone,
  Clock,
  AlertTriangle,
  CheckCircle,
  Info,
  Send,
  Trash2,
  Edit,
  FileDown,
  TrendingUp,
  TrendingDown,
  Minus,
  History,
} from 'lucide-react'
import { generateAuditPDF } from '@/lib/audit-pdf'

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [lead, setLead] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [submittingNote, setSubmittingNote] = useState(false)
  const [auditing, setAuditing] = useState(false)
  const [auditError, setAuditError] = useState<string | null>(null)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [auditHistory, setAuditHistory] = useState<WebsiteAudit[]>([])
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    async function loadLead() {
      try {
        const data = await leadsApi.getById(params.id as string)
        setLead(data)
        const history = await leadsApi.getAuditHistory(params.id as string)
        setAuditHistory(history)
      } catch (error) {
        console.error('Error loading lead:', error)
        setLead(null)
      } finally {
        setLoading(false)
      }
    }
    
    if (params.id) {
      loadLead()
    }
  }, [params.id])

  const handleDelete = async () => {
    if (!lead) return
    setDeleting(true)
    try {
      await leadsApi.delete(lead.id)
      router.push('/leads')
    } catch {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleStatusChange = async (status: LeadStatus) => {
    if (!lead) return
    try {
      const updated = await leadsApi.updateStatus(lead.id, status)
      setLead(updated)
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const handleLaunchAudit = async () => {
    if (!lead?.website) {
      setAuditError('Aucune URL de site web enregistrée pour ce lead.')
      return
    }
    setAuditing(true)
    setAuditError(null)
    try {
      let data: Record<string, unknown> | null = null

      // Jusqu'à 3 tentatives avec backoff
      for (let attempt = 1; attempt <= 3; attempt++) {
        if (attempt > 1) {
          await new Promise((r) => setTimeout(r, 3000 * (attempt - 1)))
        }
        try {
          const res = await fetch('/api/audit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: lead.website, companyId: lead.id }),
          })
          const text = await res.text()
          let parsed: Record<string, unknown>
          try {
            parsed = JSON.parse(text)
          } catch {
            if (attempt === 3) throw new Error(`Erreur serveur (${res.status})`)
            continue
          }
          if (!res.ok || !parsed.success) {
            if (attempt === 3) throw new Error((parsed.error as string) || 'Échec de l\'audit')
            continue
          }
          data = parsed
          break
        } catch (e) {
          if (attempt === 3) throw e
        }
      }

      if (!data) throw new Error('Échec de l\'audit après 3 tentatives')

      const responseData = data.data as { audit: unknown; prospect_score: number; priority: string }

      // Mettre à jour l'état local directement (visible immédiatement, sans attendre la DB)
      setLead((prev) =>
        prev
          ? {
              ...prev,
              audit: responseData.audit as Company['audit'],
              prospect_score: responseData.prospect_score,
              priority: responseData.priority as Company['priority'],
            }
          : null
      )

      // Recharger depuis la DB en arrière-plan — seulement si l'audit est bien présent
      // (évite d'écraser l'état local si la propagation Supabase est légèrement différée)
      leadsApi.getById(lead.id).then((updated) => {
        if (updated?.audit) setLead(updated)
      }).catch(() => {/* garder les données de la réponse */})

      // Recharger l'historique des audits
      leadsApi.getAuditHistory(lead.id).then(setAuditHistory).catch(() => {})

    } catch (err) {
      setAuditError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setAuditing(false)
    }
  }

  const handleAddNote = async () => {
    if (!lead || !newNote.trim()) return
    setSubmittingNote(true)
    try {
      const note = await leadsApi.addNote({
        company_id: lead.id,
        content: newNote.trim()
      })
      setLead({
        ...lead,
        notes: [note, ...lead.notes]
      })
      setNewNote('')
    } catch (error) {
      console.error('Error adding note:', error)
    } finally {
      setSubmittingNote(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header title="Chargement..." />
        <div className="p-6 space-y-6">
          <Skeleton className="h-48" />
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-64 lg:col-span-2" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="min-h-screen">
        <Header title="Lead non trouvé" />
        <div className="p-6">
          <Card className="p-12 text-center">
            <Building2 className="h-16 w-16 mx-auto mb-4 text-zinc-300" />
            <h2 className="text-xl font-semibold mb-2">Lead introuvable</h2>
            <p className="text-zinc-500 mb-6">Ce lead n'existe pas ou a été supprimé.</p>
            <Link href="/leads">
              <Button>
                <ArrowLeft className="h-4 w-4" />
                Retour aux leads
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    )
  }

  const audit = lead.audit

  return (
    <div className="min-h-screen">
      <Header 
        title={lead.name}
        subtitle={`${lead.city} • ${lead.postal_code}`}
      />
      
      <div className="p-6 space-y-6">
        {/* Back link + delete */}
        <div className="flex items-center justify-between">
          <Link
            href="/leads"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux leads
          </Link>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-red-400 border border-white/[0.05] hover:border-red-500/20 rounded-lg px-2.5 py-1.5 transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Supprimer
            </button>
          ) : (
            <div className="flex items-center gap-2 p-1.5 rounded-xl border border-red-500/20 bg-red-500/5">
              <span className="text-xs text-red-400 px-1">Confirmer la suppression ?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg px-3 py-1 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Suppression...' : 'Oui, supprimer'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                Annuler
              </button>
            </div>
          )}
        </div>
        
        {/* Main info card */}
        <Card>
          <div className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
              {/* Left: Company info */}
              <div className="flex items-start gap-4">
                <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${
                  lead.has_website ? 'bg-zinc-800/80' : 'bg-amber-500/10'
                }`}>
                  {lead.has_website ? (
                    <Globe className="h-8 w-8 text-zinc-400" />
                  ) : (
                    <Globe2 className="h-8 w-8 text-amber-500" />
                  )}
                </div>
                
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold text-white">{lead.name}</h1>
                    <Badge className={priorityColors[lead.priority]} variant="outline">
                      {priorityLabels[lead.priority]}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-zinc-400" />
                      {lead.address || lead.city}, {lead.postal_code}
                    </span>
                    {lead.sector && (
                      <span className="flex items-center gap-1.5">
                        <Building2 className="h-4 w-4 text-zinc-400" />
                        {sectorLabels[lead.sector]}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 mt-3">
                    {lead.phone && (
                      <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-amber-400">
                        <Phone className="h-4 w-4" />
                        {lead.phone}
                      </a>
                    )}
                    {lead.email ? (
                      <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-amber-400">
                        <Mail className="h-4 w-4" />
                        {lead.email}
                      </a>
                    ) : lead.website ? (
                      <EnrichEmailButton
                        website={lead.website}
                        companyId={lead.id}
                        onFound={(email) => setLead((l) => l ? { ...l, email } : l)}
                      />
                    ) : null}
                    {lead.website && (
                      <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700">
                        <ExternalLink className="h-4 w-4" />
                        {lead.website.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Right: Score and status */}
              <div className="flex items-center gap-6">
                {/* Score */}
                <div className="text-center">
                  <p className={`text-4xl font-bold ${getScoreColor(lead.prospect_score)}`}>
                    {lead.prospect_score}
                  </p>
                  <p className="text-sm text-zinc-500">Score prospect</p>
                </div>
                
                {/* Status selector */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-zinc-500">Statut</label>
                  <select
                    value={lead.status}
                    onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
                    className={`text-sm font-medium rounded-lg px-3 py-2 border-0 cursor-pointer ${statusColors[lead.status]}`}
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </Card>
        
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column: Audit & Issues */}
          <div className="lg:col-span-2 space-y-6">
            {/* Audit history comparison */}
            {auditHistory.length >= 2 && (
              <AuditComparison audits={auditHistory} />
            )}

            {/* Audit results */}
            {audit ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Audit du site web</CardTitle>
                  <button
                    onClick={async () => {
                      if (!lead) return
                      setGeneratingPdf(true)
                      try { await generateAuditPDF(lead) } finally { setGeneratingPdf(false) }
                    }}
                    disabled={generatingPdf}
                    className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-amber-400 border border-white/[0.08] rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-50"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    {generatingPdf ? 'Génération...' : 'Télécharger PDF'}
                  </button>
                </CardHeader>
                <CardContent>
                  {/* Lighthouse scores */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <ScoreBox
                      label="Performance"
                      score={audit.performance_score}
                      icon={<Gauge className="h-5 w-5" />}
                    />
                    <ScoreBox
                      label="SEO"
                      score={audit.seo_score}
                      icon={<Globe className="h-5 w-5" />}
                    />
                    <ScoreBox
                      label="Accessibilité"
                      score={audit.accessibility_score}
                      icon={<CheckCircle className="h-5 w-5" />}
                    />
                    <ScoreBox
                      label="Bonnes pratiques"
                      score={audit.best_practices_score}
                      icon={<Shield className="h-5 w-5" />}
                    />
                  </div>
                  
                  {/* Technical info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-zinc-800/60 rounded-lg mb-6">
                    <TechItem
                      label="HTTPS"
                      value={audit.is_https}
                      icon={<Shield className="h-4 w-4" />}
                    />
                    <TechItem
                      label="Mobile-friendly"
                      value={audit.is_mobile_friendly}
                      icon={<Smartphone className="h-4 w-4" />}
                    />
                    <div className="text-center">
                      <Clock className="h-4 w-4 mx-auto text-zinc-400 mb-1" />
                      <p className={`font-semibold ${(audit.load_time_ms || 0) > 3000 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {audit.load_time_ms ? `${(audit.load_time_ms / 1000).toFixed(1)}s` : '-'}
                      </p>
                      <p className="text-xs text-zinc-500">Chargement</p>
                    </div>
                    <div className="text-center">
                      <Building2 className="h-4 w-4 mx-auto text-zinc-400 mb-1" />
                      <p className="font-semibold text-white">
                        {audit.cms || 'N/A'}
                      </p>
                      <p className="text-xs text-zinc-500">CMS</p>
                    </div>
                  </div>
                  
                  {/* Issues */}
                  {audit.issues.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">Problèmes détectés ({audit.issues.length})</h4>
                      <div className="space-y-3">
                        {audit.issues.map((issue, i) => (
                          <div
                            key={i}
                            className={`p-4 rounded-lg border ${severityColors[issue.severity]}`}
                          >
                            <div className="flex items-start gap-3">
                              {issue.severity === 'critical' && <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />}
                              {issue.severity === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />}
                              {issue.severity === 'info' && <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />}
                              <div>
                                <p className="font-medium">{issue.title}</p>
                                <p className="text-sm text-zinc-600 mt-1">{issue.message}</p>
                                <p className="text-sm mt-2">
                                  <span className="font-medium">Recommandation:</span> {issue.recommendation}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-zinc-400 mt-4">
                    Dernière analyse: {formatDateTime(audit.audited_at)}
                  </p>
                </CardContent>
              </Card>
            ) : lead.has_website ? (
              <Card className="p-8 text-center">
                <Gauge className="h-12 w-12 mx-auto mb-4 text-zinc-300" />
                <h3 className="font-semibold mb-2">Aucun audit disponible</h3>
                <p className="text-sm text-zinc-500 mb-4">
                  Ce site n'a pas encore été analysé.
                </p>
                {auditError && (
                  <p className="text-sm text-red-600 mb-3">{auditError}</p>
                )}
                <Button onClick={handleLaunchAudit} loading={auditing} disabled={auditing}>
                  {auditing ? 'Analyse en cours...' : 'Lancer un audit'}
                </Button>
              </Card>
            ) : (
              <Card className="p-8 text-center bg-amber-500/[0.08] border-amber-500/20">
                <Globe2 className="h-12 w-12 mx-auto mb-4 text-amber-500" />
                <h3 className="font-semibold text-amber-300 mb-2">Pas de site web</h3>
                <p className="text-sm text-amber-400">
                  Cette entreprise n'a pas de site internet. C'est un prospect idéal pour une création de site !
                </p>
              </Card>
            )}
          </div>
          
          {/* Right column: Notes & Timeline */}
          <div className="space-y-6">
            {/* Outreach panel */}
            <Card>
              <CardHeader>
                <CardTitle>Contacter</CardTitle>
              </CardHeader>
              <CardContent>
                <OutreachPanel
                  lead={lead}
                  onStatusChange={handleStatusChange}
                  onNoteAdded={async (input) => {
                    const note = await leadsApi.addNote(input)
                    setLead(prev => prev ? { ...prev, notes: [note, ...prev.notes] } : null)
                  }}
                />
              </CardContent>
            </Card>

            {/* Add note */}
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Ajouter une note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                  />
                  <Button 
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || submittingNote}
                    loading={submittingNote}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Notes list */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {lead.notes.length > 0 ? (
                    lead.notes.map((note) => (
                      <div key={note.id} className="p-3 bg-zinc-800/60 rounded-lg">
                        <p className="text-sm text-zinc-300">{note.content}</p>
                        <p className="text-xs text-zinc-400 mt-2">
                          {timeAgo(note.created_at)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-zinc-400 text-center py-4">
                      Aucune note pour le moment
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Info card */}
            <Card>
              <CardHeader>
                <CardTitle>Informations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <InfoRow label="Source" value={lead.source} />
                {lead.siret && <InfoRow label="SIRET" value={lead.siret} />}
                <InfoRow label="Ajouté le" value={formatDate(lead.created_at)} />
                {lead.last_contacted_at && (
                  <InfoRow label="Dernier contact" value={formatDate(lead.last_contacted_at)} />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper components
function ScoreBox({ label, score, icon }: { label: string; score: number | null; icon: React.ReactNode }) {
  return (
    <div className="text-center p-4 bg-zinc-800/60 border border-white/[0.06] rounded-lg">
      <div className="text-zinc-400 mb-2">{icon}</div>
      <p className={`text-2xl font-bold ${getLighthouseColor(score)}`}>
        {score ?? '-'}
      </p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  )
}

function TechItem({ label, value, icon }: { label: string; value: boolean; icon: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="text-zinc-400 mb-1">{icon}</div>
      <p className={`font-semibold ${value ? 'text-emerald-400' : 'text-red-400'}`}>
        {value ? 'Oui' : 'Non'}
      </p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  )
}

function ScoreDiff({ prev, curr }: { prev: number | null; curr: number | null }) {
  if (prev === null || curr === null) return <span className="text-zinc-600">—</span>
  const diff = curr - prev
  if (diff === 0) return (
    <span className="flex items-center gap-0.5 text-zinc-500 text-xs">
      <Minus className="h-3 w-3" />0
    </span>
  )
  return (
    <span className={`flex items-center gap-0.5 text-xs font-medium ${diff > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
      {diff > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {diff > 0 ? '+' : ''}{diff}
    </span>
  )
}

function AuditComparison({ audits }: { audits: WebsiteAudit[] }) {
  const [selectedIdx, setSelectedIdx] = useState(1) // index of "previous" audit to compare with [0] (latest)
  const latest = audits[0]
  const previous = audits[selectedIdx]

  const metrics: { label: string; key: keyof WebsiteAudit }[] = [
    { label: 'Performance', key: 'performance_score' },
    { label: 'SEO', key: 'seo_score' },
    { label: 'Accessibilité', key: 'accessibility_score' },
    { label: 'Bonnes pratiques', key: 'best_practices_score' },
    { label: 'Score global', key: 'overall_score' },
  ]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-zinc-400" />
          <CardTitle>Comparaison des audits</CardTitle>
        </div>
        {audits.length > 2 && (
          <select
            value={selectedIdx}
            onChange={(e) => setSelectedIdx(Number(e.target.value))}
            className="text-xs bg-zinc-800 border border-white/[0.08] rounded-lg px-2 py-1 text-zinc-400"
          >
            {audits.slice(1).map((a, i) => (
              <option key={a.id} value={i + 1}>
                {new Date(a.audited_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })}
              </option>
            ))}
          </select>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 text-xs font-medium text-zinc-500 mb-3 px-2">
          <span>Métrique</span>
          <span className="text-center">
            Précédent
            <span className="block text-zinc-600 font-normal">
              {new Date(previous.audited_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </span>
          </span>
          <span className="text-center">
            Actuel
            <span className="block text-zinc-600 font-normal">
              {new Date(latest.audited_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </span>
          </span>
        </div>
        <div className="space-y-1">
          {metrics.map(({ label, key }) => {
            const prev = previous[key] as number | null
            const curr = latest[key] as number | null
            return (
              <div key={key} className="grid grid-cols-3 gap-2 items-center px-2 py-1.5 rounded-lg hover:bg-zinc-800/40">
                <span className="text-sm text-zinc-400">{label}</span>
                <span className={`text-center text-sm font-medium ${getLighthouseColor(prev)}`}>
                  {prev ?? '—'}
                </span>
                <div className="flex items-center justify-center gap-2">
                  <span className={`text-sm font-medium ${getLighthouseColor(curr)}`}>{curr ?? '—'}</span>
                  <ScoreDiff prev={prev} curr={curr} />
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-[10px] text-zinc-600 mt-3 text-right">
          {audits.length} audit{audits.length > 1 ? 's' : ''} au total
        </p>
      </CardContent>
    </Card>
  )
}

function EnrichEmailButton({
  website,
  companyId,
  onFound,
}: {
  website: string
  companyId: string
  onFound: (email: string) => void
}) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleEnrich = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/enrich-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: website, companyId }),
      })
      const data = await res.json()
      if (data.email) {
        setResult(data.email)
        onFound(data.email)
      } else {
        setError(data.message || data.error || 'Aucun email trouvé')
      }
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <a href={`mailto:${result}`} className="flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300">
        <Mail className="h-4 w-4" />
        {result}
      </a>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleEnrich}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-amber-400 border border-white/[0.08] rounded-lg px-2.5 py-1 transition-colors disabled:opacity-50"
      >
        <Mail className="h-3.5 w-3.5" />
        {loading ? 'Recherche...' : 'Trouver l\'email'}
      </button>
      {error && <p className="text-[10px] text-zinc-600">{error}</p>}
    </div>
  )
}

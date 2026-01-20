'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout'
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, Skeleton } from '@/components/ui'
import { leadsApi } from '@/lib/api'
import { Company, LeadStatus, Note } from '@/types'
import { mockLeads } from '@/lib/mock-data'
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
  Edit
} from 'lucide-react'

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [lead, setLead] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [submittingNote, setSubmittingNote] = useState(false)

  useEffect(() => {
    async function loadLead() {
      try {
        const data = await leadsApi.getById(params.id as string)
        setLead(data)
      } catch (error) {
        console.error('Error loading lead:', error)
        // Fallback to mock
        const mockLead = mockLeads.find(l => l.id === params.id)
        setLead(mockLead || null)
      } finally {
        setLoading(false)
      }
    }
    
    if (params.id) {
      loadLead()
    }
  }, [params.id])

  const handleStatusChange = async (status: LeadStatus) => {
    if (!lead) return
    try {
      const updated = await leadsApi.updateStatus(lead.id, status)
      setLead(updated)
    } catch (error) {
      console.error('Error updating status:', error)
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
        {/* Back link */}
        <Link 
          href="/leads" 
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux leads
        </Link>
        
        {/* Main info card */}
        <Card>
          <div className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
              {/* Left: Company info */}
              <div className="flex items-start gap-4">
                <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${
                  lead.has_website ? 'bg-zinc-100' : 'bg-amber-50'
                }`}>
                  {lead.has_website ? (
                    <Globe className="h-8 w-8 text-zinc-400" />
                  ) : (
                    <Globe2 className="h-8 w-8 text-amber-500" />
                  )}
                </div>
                
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold text-zinc-900">{lead.name}</h1>
                    <Badge className={priorityColors[lead.priority]} variant="outline">
                      {priorityLabels[lead.priority]}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-600">
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
                      <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-sm text-zinc-600 hover:text-amber-600">
                        <Phone className="h-4 w-4" />
                        {lead.phone}
                      </a>
                    )}
                    {lead.email && (
                      <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-sm text-zinc-600 hover:text-amber-600">
                        <Mail className="h-4 w-4" />
                        {lead.email}
                      </a>
                    )}
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
            {/* Audit results */}
            {audit ? (
              <Card>
                <CardHeader>
                  <CardTitle>Audit du site web</CardTitle>
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-zinc-50 rounded-lg mb-6">
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
                      <p className={`font-semibold ${(audit.load_time_ms || 0) > 3000 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {audit.load_time_ms ? `${(audit.load_time_ms / 1000).toFixed(1)}s` : '-'}
                      </p>
                      <p className="text-xs text-zinc-500">Chargement</p>
                    </div>
                    <div className="text-center">
                      <Building2 className="h-4 w-4 mx-auto text-zinc-400 mb-1" />
                      <p className="font-semibold text-zinc-900">
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
                <Button>Lancer un audit</Button>
              </Card>
            ) : (
              <Card className="p-8 text-center bg-amber-50 border-amber-200">
                <Globe2 className="h-12 w-12 mx-auto mb-4 text-amber-500" />
                <h3 className="font-semibold text-amber-800 mb-2">Pas de site web</h3>
                <p className="text-sm text-amber-700">
                  Cette entreprise n'a pas de site internet. C'est un prospect idéal pour une création de site !
                </p>
              </Card>
            )}
          </div>
          
          {/* Right column: Notes & Timeline */}
          <div className="space-y-6">
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
                      <div key={note.id} className="p-3 bg-zinc-50 rounded-lg">
                        <p className="text-sm text-zinc-700">{note.content}</p>
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
    <div className="text-center p-4 bg-zinc-50 rounded-lg">
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
      <p className={`font-semibold ${value ? 'text-emerald-600' : 'text-red-600'}`}>
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
      <span className="font-medium text-zinc-900">{value}</span>
    </div>
  )
}

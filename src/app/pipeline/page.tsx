'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout'
import { Badge, Button, Skeleton } from '@/components/ui'
import { leadsApi } from '@/lib/api'
import { Company, LeadStatus } from '@/types'
import {
  statusLabels,
  statusColors,
  priorityLabels,
  priorityColors,
  getScoreColor,
  sectorLabels
} from '@/lib/utils'
import {
  GripVertical,
  Globe,
  Globe2,
  Phone,
  Mail,
  ExternalLink,
} from 'lucide-react'

const PIPELINE_STAGES: LeadStatus[] = ['new', 'contacted', 'meeting', 'proposal', 'won', 'lost']

const stageAccents: Record<LeadStatus, string> = {
  new: 'border-t-blue-500',
  contacted: 'border-t-yellow-500',
  meeting: 'border-t-purple-500',
  proposal: 'border-t-orange-500',
  won: 'border-t-emerald-500',
  lost: 'border-t-zinc-600'
}

export default function PipelinePage() {
  const [leads, setLeads] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  useEffect(() => {
    async function loadLeads() {
      try {
        const response = await leadsApi.getAll({}, 1, 100)
        setLeads(response.data)
      } catch (error) {
        console.error('Error loading leads:', error)
        setLeads([])
      } finally {
        setLoading(false)
      }
    }
    loadLeads()
  }, [])

  const getLeadsByStatus = (status: LeadStatus) =>
    leads.filter(lead => lead.status === status)

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('leadId', leadId)
    setDraggingId(leadId)
  }

  const handleDragEnd = () => setDraggingId(null)

  const handleDragOver = (e: React.DragEvent) => e.preventDefault()

  const handleDrop = async (e: React.DragEvent, newStatus: LeadStatus) => {
    e.preventDefault()
    const leadId = e.dataTransfer.getData('leadId')
    if (!leadId) return
    setLeads(prev => prev.map(lead =>
      lead.id === leadId ? { ...lead, status: newStatus } : lead
    ))
    try {
      await leadsApi.updateStatus(leadId, newStatus)
    } catch {
      const response = await leadsApi.getAll({}, 1, 100)
      setLeads(response.data)
    }
    setDraggingId(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header title="Pipeline" subtitle="Gérez vos opportunités" />
        <div className="p-6">
          <div className="flex gap-4 overflow-x-auto pb-4">
            {PIPELINE_STAGES.map((stage) => (
              <div key={stage} className="flex-shrink-0 w-72">
                <Skeleton className="h-12 mb-4" />
                <div className="space-y-3">
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Pipeline"
        subtitle={`${leads.length} leads dans le pipeline`}
      />

      <div className="p-6">
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((status) => {
            const stageLeads = getLeadsByStatus(status)

            return (
              <div
                key={status}
                className="flex-shrink-0 w-72"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, status)}
              >
                {/* Column header */}
                <div className={`rounded-t-xl border border-b-0 border-white/[0.08] bg-zinc-900/60 p-3 ${stageAccents[status]} border-t-2`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white text-sm">
                        {statusLabels[status]}
                      </h3>
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-zinc-800 px-1.5 text-xs font-medium text-zinc-400">
                        {stageLeads.length}
                      </span>
                    </div>
                    <Link
                      href={`/leads?status=${status}`}
                      className="p-1 rounded hover:bg-white/5 text-zinc-600 hover:text-amber-500 transition-colors"
                      title="Voir tous les leads de cette étape"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Column content */}
                <div className={`rounded-b-xl border border-t-0 border-white/[0.08] bg-zinc-900/30 p-2 min-h-[500px] ${
                  draggingId ? 'ring-1 ring-amber-500/20 ring-inset' : ''
                }`}>
                  <div className="space-y-2">
                    {stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onDragEnd={handleDragEnd}
                        className={`rounded-xl border border-white/[0.06] bg-zinc-900/80 p-3 cursor-grab active:cursor-grabbing hover:border-white/[0.12] hover:bg-zinc-800/80 transition-all ${
                          draggingId === lead.id ? 'opacity-40' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <Link href={`/leads/${lead.id}`}>
                            <h4 className="font-medium text-zinc-200 hover:text-amber-400 transition-colors line-clamp-1 text-sm">
                              {lead.name}
                            </h4>
                          </Link>
                          <GripVertical className="h-4 w-4 text-zinc-700 flex-shrink-0" />
                        </div>

                        <p className="text-xs text-zinc-500 mb-2">
                          {lead.city}
                          {lead.sector && ` · ${sectorLabels[lead.sector]?.split(' ')[0]}`}
                        </p>

                        <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
                          <div className="flex items-center gap-2">
                            {lead.website ? (
                              <a href={lead.website} target="_blank" rel="noopener noreferrer" title="Voir le site">
                                <Globe className="h-3.5 w-3.5 text-zinc-600 hover:text-blue-400 transition-colors" />
                              </a>
                            ) : (
                              <span title="Pas de site web"><Globe2 className="h-3.5 w-3.5 text-amber-500" /></span>
                            )}
                            {lead.phone && (
                              <a href={`tel:${lead.phone}`} title={lead.phone}>
                                <Phone className="h-3.5 w-3.5 text-zinc-600 hover:text-emerald-400 transition-colors" />
                              </a>
                            )}
                            {lead.email && (
                              <a href={`mailto:${lead.email}`} title={lead.email}>
                                <Mail className="h-3.5 w-3.5 text-zinc-600 hover:text-blue-400 transition-colors" />
                              </a>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge
                              className={`${priorityColors[lead.priority]} text-[10px] px-1.5 py-0`}
                              variant="outline"
                            >
                              {lead.priority === 'hot' ? '🔥' : lead.priority === 'warm' ? '🌤️' : '❄️'}
                            </Badge>
                            <span className={`text-sm font-bold ${getScoreColor(lead.prospect_score)}`}>
                              {lead.prospect_score}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {stageLeads.length === 0 && (
                      <div className="text-center py-8 text-zinc-700">
                        <p className="text-sm">Aucun lead</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 p-4 rounded-xl border border-white/[0.06] bg-zinc-900/40">
          <p className="text-sm text-zinc-500">
            <span className="text-zinc-400 font-medium">Astuce :</span> Glissez-déposez les cartes pour changer le statut d&apos;un lead.
            Les leads &quot;chauds&quot; 🔥 ont un score élevé et sont prioritaires pour le contact.
          </p>
        </div>
      </div>
    </div>
  )
}

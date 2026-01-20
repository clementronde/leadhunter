'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout'
import { Card, Badge, Button, Skeleton } from '@/components/ui'
import { leadsApi } from '@/lib/api'
import { Company, LeadStatus } from '@/types'
import { mockLeads } from '@/lib/mock-data'
import {
  statusLabels,
  statusColors,
  priorityLabels,
  priorityColors,
  getScoreColor,
  sectorLabels
} from '@/lib/utils'
import {
  Plus,
  GripVertical,
  Globe,
  Globe2,
  Phone,
  MoreHorizontal
} from 'lucide-react'

const PIPELINE_STAGES: LeadStatus[] = ['new', 'contacted', 'meeting', 'proposal', 'won', 'lost']

const stageColors: Record<LeadStatus, string> = {
  new: 'border-t-blue-500',
  contacted: 'border-t-yellow-500',
  meeting: 'border-t-purple-500',
  proposal: 'border-t-orange-500',
  won: 'border-t-emerald-500',
  lost: 'border-t-zinc-400'
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
        setLeads(mockLeads)
      } finally {
        setLoading(false)
      }
    }
    loadLeads()
  }, [])

  const getLeadsByStatus = (status: LeadStatus) => {
    return leads.filter(lead => lead.status === status)
  }

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('leadId', leadId)
    setDraggingId(leadId)
  }

  const handleDragEnd = () => {
    setDraggingId(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, newStatus: LeadStatus) => {
    e.preventDefault()
    const leadId = e.dataTransfer.getData('leadId')
    
    if (!leadId) return

    // Optimistic update
    setLeads(prev => prev.map(lead =>
      lead.id === leadId ? { ...lead, status: newStatus } : lead
    ))

    try {
      await leadsApi.updateStatus(leadId, newStatus)
    } catch (error) {
      console.error('Error updating status:', error)
      // Revert on error
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
              <div key={stage} className="flex-shrink-0 w-80">
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
                className="flex-shrink-0 w-80"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, status)}
              >
                {/* Column header */}
                <div className={`bg-white rounded-t-lg border border-b-0 border-zinc-200 p-3 ${stageColors[status]} border-t-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-zinc-900">
                        {statusLabels[status]}
                      </h3>
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-zinc-100 px-1.5 text-xs font-medium text-zinc-600">
                        {stageLeads.length}
                      </span>
                    </div>
                    <button className="p-1 rounded hover:bg-zinc-100">
                      <MoreHorizontal className="h-4 w-4 text-zinc-400" />
                    </button>
                  </div>
                </div>
                
                {/* Column content */}
                <div className={`bg-zinc-50 rounded-b-lg border border-t-0 border-zinc-200 p-2 min-h-[500px] ${
                  draggingId ? 'ring-2 ring-amber-200 ring-inset' : ''
                }`}>
                  <div className="space-y-2">
                    {stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onDragEnd={handleDragEnd}
                        className={`bg-white rounded-lg border border-zinc-200 p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
                          draggingId === lead.id ? 'opacity-50' : ''
                        }`}
                      >
                        {/* Card header */}
                        <div className="flex items-start justify-between mb-2">
                          <Link href={`/leads/${lead.id}`}>
                            <h4 className="font-medium text-zinc-900 hover:text-amber-600 transition-colors line-clamp-1">
                              {lead.name}
                            </h4>
                          </Link>
                          <GripVertical className="h-4 w-4 text-zinc-300 flex-shrink-0" />
                        </div>
                        
                        {/* Location & sector */}
                        <p className="text-sm text-zinc-500 mb-2">
                          {lead.city}
                          {lead.sector && ` • ${sectorLabels[lead.sector]?.split(' ')[0]}`}
                        </p>
                        
                        {/* Footer */}
                        <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
                          <div className="flex items-center gap-2">
                            {lead.has_website ? (
                              <Globe className="h-4 w-4 text-zinc-400" />
                            ) : (
                              <Globe2 className="h-4 w-4 text-amber-500" />
                            )}
                            {lead.phone && (
                              <Phone className="h-4 w-4 text-zinc-400" />
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
                      <div className="text-center py-8 text-zinc-400">
                        <p className="text-sm">Aucun lead</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Legend */}
        <div className="mt-6 p-4 bg-white rounded-lg border border-zinc-200">
          <p className="text-sm text-zinc-500">
            <strong>Astuce:</strong> Glissez-déposez les cartes pour changer le statut d'un lead. 
            Les leads "chauds" 🔥 ont un score élevé et sont prioritaires pour le contact.
          </p>
        </div>
      </div>
    </div>
  )
}

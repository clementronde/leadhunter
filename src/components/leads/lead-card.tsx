'use client'

import Link from 'next/link'
import { Card, Badge, Button } from '@/components/ui'
import { Company } from '@/types'
import {
  priorityLabels,
  priorityColors,
  statusLabels,
  statusColors,
  sectorLabels,
  getScoreColor,
  getScoreBackground,
  getLighthouseColor,
  formatDate
} from '@/lib/utils'
import {
  Globe,
  Globe2,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  MoreVertical,
  Gauge,
  Shield,
  Smartphone,
  Clock
} from 'lucide-react'

interface LeadCardProps {
  lead: Company
  onStatusChange?: (status: Company['status']) => void
}

export function LeadCard({ lead, onStatusChange }: LeadCardProps) {
  const audit = lead.audit
  
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      {/* Score bar */}
      <div className="h-1.5 w-full bg-zinc-100">
        <div
          className={`h-full transition-all ${getScoreBackground(lead.prospect_score)}`}
          style={{ width: `${lead.prospect_score}%` }}
        />
      </div>
      
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
              lead.has_website ? 'bg-zinc-100' : 'bg-amber-50'
            }`}>
              {lead.has_website ? (
                <Globe className="h-6 w-6 text-zinc-400" />
              ) : (
                <Globe2 className="h-6 w-6 text-amber-500" />
              )}
            </div>
            <div>
              <Link href={`/leads/${lead.id}`}>
                <h3 className="font-semibold text-zinc-900 hover:text-amber-600 transition-colors">
                  {lead.name}
                </h3>
              </Link>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                <span className="text-sm text-zinc-500">{lead.city}</span>
                {lead.sector && (
                  <>
                    <span className="text-zinc-300">•</span>
                    <span className="text-sm text-zinc-500">
                      {sectorLabels[lead.sector]}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Score */}
          <div className="text-right">
            <p className={`text-2xl font-bold ${getScoreColor(lead.prospect_score)}`}>
              {lead.prospect_score}
            </p>
            <Badge className={priorityColors[lead.priority]} variant="outline">
              {priorityLabels[lead.priority]}
            </Badge>
          </div>
        </div>
        
        {/* Contact info */}
        <div className="flex flex-wrap gap-3 mb-4 text-sm">
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-900">
              <Phone className="h-4 w-4" />
              {lead.phone}
            </a>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-900">
              <Mail className="h-4 w-4" />
              {lead.email}
            </a>
          )}
          {lead.website && (
            <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-zinc-600 hover:text-amber-600">
              <ExternalLink className="h-4 w-4" />
              Voir le site
            </a>
          )}
        </div>
        
        {/* Audit scores (if has website) */}
        {audit && (
          <div className="grid grid-cols-4 gap-2 p-3 bg-zinc-50 rounded-lg mb-4">
            <div className="text-center">
              <Gauge className="h-4 w-4 mx-auto text-zinc-400 mb-1" />
              <p className={`text-sm font-semibold ${getLighthouseColor(audit.performance_score)}`}>
                {audit.performance_score ?? '-'}
              </p>
              <p className="text-xs text-zinc-400">Perf</p>
            </div>
            <div className="text-center">
              <Shield className="h-4 w-4 mx-auto text-zinc-400 mb-1" />
              <p className={`text-sm font-semibold ${audit.is_https ? 'text-emerald-600' : 'text-red-600'}`}>
                {audit.is_https ? 'Oui' : 'Non'}
              </p>
              <p className="text-xs text-zinc-400">HTTPS</p>
            </div>
            <div className="text-center">
              <Smartphone className="h-4 w-4 mx-auto text-zinc-400 mb-1" />
              <p className={`text-sm font-semibold ${audit.is_mobile_friendly ? 'text-emerald-600' : 'text-red-600'}`}>
                {audit.is_mobile_friendly ? 'Oui' : 'Non'}
              </p>
              <p className="text-xs text-zinc-400">Mobile</p>
            </div>
            <div className="text-center">
              <Clock className="h-4 w-4 mx-auto text-zinc-400 mb-1" />
              <p className={`text-sm font-semibold ${(audit.load_time_ms || 0) > 3000 ? 'text-red-600' : 'text-emerald-600'}`}>
                {audit.load_time_ms ? `${(audit.load_time_ms / 1000).toFixed(1)}s` : '-'}
              </p>
              <p className="text-xs text-zinc-400">Vitesse</p>
            </div>
          </div>
        )}
        
        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
          <Badge className={statusColors[lead.status]}>
            {statusLabels[lead.status]}
          </Badge>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">
              Ajouté {formatDate(lead.created_at)}
            </span>
            <Link href={`/leads/${lead.id}`}>
              <Button size="sm" variant="ghost">
                Détails
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Card>
  )
}

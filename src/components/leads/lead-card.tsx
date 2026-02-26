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
  formatDate,
} from '@/lib/utils'
import {
  Globe,
  Globe2,
  Phone,
  MapPin,
  ExternalLink,
  Gauge,
  Shield,
  Smartphone,
  Clock,
  Star,
  MessageSquare,
} from 'lucide-react'

interface LeadCardProps {
  lead: Company
  onStatusChange?: (status: Company['status']) => void
}

export function LeadCard({ lead, onStatusChange }: LeadCardProps) {
  const audit = lead.audit
  const hasGoogleData =
    lead.source === 'google_places' &&
    (lead.google_rating !== null || lead.google_reviews_count !== null)

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
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                lead.has_website ? 'bg-zinc-100' : 'bg-amber-50'
              }`}
            >
              {lead.has_website ? (
                <Globe className="h-6 w-6 text-zinc-400" />
              ) : (
                <Globe2 className="h-6 w-6 text-amber-500" />
              )}
            </div>
            <div className="min-w-0">
              <Link href={`/leads/${lead.id}`}>
                <h3 className="font-semibold text-zinc-900 hover:text-amber-600 transition-colors truncate">
                  {lead.name}
                </h3>
              </Link>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="text-sm text-zinc-500">
                    {lead.address ? `${lead.address}, ` : ''}{lead.city}
                  </span>
                </div>
                {lead.sector && (
                  <>
                    <span className="text-zinc-300">•</span>
                    <span className="text-sm text-zinc-500">{sectorLabels[lead.sector]}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Score */}
          <div className="text-right shrink-0 ml-2">
            <p className={`text-2xl font-bold ${getScoreColor(lead.prospect_score)}`}>
              {lead.prospect_score}
            </p>
            <Badge className={priorityColors[lead.priority]} variant="outline">
              {priorityLabels[lead.priority]}
            </Badge>
          </div>
        </div>

        {/* Note Google Maps */}
        {hasGoogleData && (
          <div className="flex items-center gap-4 mb-4 p-3 bg-blue-50 rounded-lg">
            {lead.google_rating !== null && lead.google_rating !== undefined && (
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-bold text-zinc-900">
                  {lead.google_rating.toFixed(1)}
                </span>
                <span className="text-sm text-zinc-500">/ 5</span>
              </div>
            )}
            {lead.google_reviews_count !== null && lead.google_reviews_count !== undefined && (
              <div className="flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-zinc-700">
                  {lead.google_reviews_count.toLocaleString('fr-FR')} avis
                </span>
              </div>
            )}
            {lead.google_maps_url && (
              <a
                href={lead.google_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Fiche Maps
              </a>
            )}
          </div>
        )}

        {/* Site web + contact */}
        <div className="flex flex-wrap gap-3 mb-4 text-sm">
          {lead.phone && (
            <a
              href={`tel:${lead.phone}`}
              className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-900"
            >
              <Phone className="h-4 w-4" />
              {lead.phone}
            </a>
          )}
          {lead.website ? (
            <a
              href={lead.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-zinc-600 hover:text-amber-600"
            >
              <ExternalLink className="h-4 w-4" />
              Voir le site
            </a>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-600 font-medium">
              <Globe2 className="h-4 w-4" />
              Pas de site web
            </span>
          )}
        </div>

        {/* Scores Lighthouse (si audit disponible) */}
        {audit && (
          <div className="grid grid-cols-4 gap-2 p-3 bg-zinc-50 rounded-lg mb-4">
            <div className="text-center">
              <Gauge className="h-4 w-4 mx-auto text-zinc-400 mb-1" />
              <p className={`text-sm font-semibold ${getLighthouseColor(audit.performance_score)}`}>
                {audit.performance_score ?? '—'}
              </p>
              <p className="text-xs text-zinc-400">Perf</p>
            </div>
            <div className="text-center">
              <Shield className="h-4 w-4 mx-auto text-zinc-400 mb-1" />
              <p
                className={`text-sm font-semibold ${
                  audit.is_https ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {audit.is_https ? 'Oui' : 'Non'}
              </p>
              <p className="text-xs text-zinc-400">HTTPS</p>
            </div>
            <div className="text-center">
              <Smartphone className="h-4 w-4 mx-auto text-zinc-400 mb-1" />
              <p
                className={`text-sm font-semibold ${
                  audit.is_mobile_friendly ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {audit.is_mobile_friendly ? 'Oui' : 'Non'}
              </p>
              <p className="text-xs text-zinc-400">Mobile</p>
            </div>
            <div className="text-center">
              <Clock className="h-4 w-4 mx-auto text-zinc-400 mb-1" />
              <p
                className={`text-sm font-semibold ${
                  (audit.load_time_ms || 0) > 3000 ? 'text-red-600' : 'text-emerald-600'
                }`}
              >
                {audit.load_time_ms ? `${(audit.load_time_ms / 1000).toFixed(1)}s` : '—'}
              </p>
              <p className="text-xs text-zinc-400">Vitesse</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
          <Badge className={statusColors[lead.status]}>{statusLabels[lead.status]}</Badge>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">Ajouté {formatDate(lead.created_at)}</span>
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

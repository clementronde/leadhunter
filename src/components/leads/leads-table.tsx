'use client'

import Link from 'next/link'
import { Badge, Button } from '@/components/ui'
import { Company, LeadStatus } from '@/types'
import {
  priorityLabels,
  priorityColors,
  statusLabels,
  statusColors,
  sectorLabels,
  getScoreColor,
} from '@/lib/utils'
import {
  Globe,
  Globe2,
  ChevronRight,
  ArrowUpDown,
  Star,
  ExternalLink,
} from 'lucide-react'

interface LeadsTableProps {
  leads: Company[]
  onStatusChange?: (id: string, status: LeadStatus) => void
  sortBy?: string
  onSort?: (column: string) => void
}

/** Affiche la note Google sous forme d'étoiles + chiffre */
function RatingDisplay({ rating, count }: { rating?: number | null; count?: number | null }) {
  if (rating === null || rating === undefined) {
    return <span className="text-xs text-zinc-400">—</span>
  }
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1">
        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
        <span className="text-sm font-semibold text-zinc-900">{rating.toFixed(1)}</span>
      </div>
      {count !== null && count !== undefined && (
        <span className="text-xs text-zinc-400">{count.toLocaleString('fr-FR')} avis</span>
      )}
    </div>
  )
}

export function LeadsTable({ leads, onStatusChange, sortBy, onSort }: LeadsTableProps) {
  const columns = [
    { key: 'name', label: 'Établissement', sortable: true },
    { key: 'city', label: 'Adresse', sortable: true },
    { key: 'has_website', label: 'Site web', sortable: true },
    { key: 'google_rating', label: 'Note Google', sortable: true },
    { key: 'sector', label: 'Secteur', sortable: true },
    { key: 'prospect_score', label: 'Score', sortable: true },
    { key: 'priority', label: 'Priorité', sortable: true },
    { key: 'status', label: 'Statut', sortable: true },
    { key: 'actions', label: '', sortable: false },
  ]

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-200">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left text-sm font-medium text-zinc-500 whitespace-nowrap ${
                  col.sortable ? 'cursor-pointer hover:text-zinc-900' : ''
                }`}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                <div className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && (
                    <ArrowUpDown
                      className={`h-3.5 w-3.5 ${sortBy === col.key ? 'text-amber-500' : ''}`}
                    />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-zinc-100">
          {leads.map((lead) => (
            <tr key={lead.id} className="hover:bg-zinc-50 transition-colors">
              {/* Établissement */}
              <td className="px-4 py-4 max-w-[220px]">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      lead.has_website ? 'bg-zinc-100' : 'bg-amber-50'
                    }`}
                  >
                    {lead.has_website ? (
                      <Globe className="h-4 w-4 text-zinc-400" />
                    ) : (
                      <Globe2 className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="font-medium text-zinc-900 hover:text-amber-600 transition-colors block truncate"
                    >
                      {lead.name}
                    </Link>
                    {lead.google_maps_url && (
                      <a
                        href={lead.google_maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline flex items-center gap-0.5 mt-0.5"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Fiche Maps
                      </a>
                    )}
                  </div>
                </div>
              </td>

              {/* Adresse + Ville */}
              <td className="px-4 py-4">
                <p className="text-sm text-zinc-700 truncate max-w-[180px]">
                  {lead.address || lead.city}
                </p>
                <p className="text-xs text-zinc-400">
                  {lead.postal_code} {lead.address ? lead.city : ''}
                </p>
              </td>

              {/* Site web */}
              <td className="px-4 py-4">
                {lead.has_website ? (
                  <div className="space-y-1">
                    <Badge variant="secondary" className="text-xs">Oui</Badge>
                    {lead.website && (
                      <a
                        href={lead.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-zinc-400 hover:text-amber-600 truncate max-w-[160px]"
                      >
                        {lead.website.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                  </div>
                ) : (
                  <Badge variant="warning" className="text-xs">Pas de site</Badge>
                )}
              </td>

              {/* Note Google */}
              <td className="px-4 py-4">
                <RatingDisplay
                  rating={lead.google_rating}
                  count={lead.google_reviews_count}
                />
              </td>

              {/* Secteur */}
              <td className="px-4 py-4">
                <span className="text-sm text-zinc-600">
                  {lead.sector ? sectorLabels[lead.sector] : '—'}
                </span>
              </td>

              {/* Score */}
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${getScoreColor(lead.prospect_score)}`}>
                    {lead.prospect_score}
                  </span>
                  <div className="w-14 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        lead.prospect_score >= 80
                          ? 'bg-red-500'
                          : lead.prospect_score >= 60
                          ? 'bg-amber-500'
                          : lead.prospect_score >= 40
                          ? 'bg-blue-500'
                          : 'bg-zinc-300'
                      }`}
                      style={{ width: `${lead.prospect_score}%` }}
                    />
                  </div>
                </div>
              </td>

              {/* Priorité */}
              <td className="px-4 py-4">
                <Badge className={priorityColors[lead.priority]} variant="outline">
                  {priorityLabels[lead.priority]}
                </Badge>
              </td>

              {/* Statut */}
              <td className="px-4 py-4">
                <select
                  value={lead.status}
                  onChange={(e) => onStatusChange?.(lead.id, e.target.value as LeadStatus)}
                  className={`text-xs font-medium rounded-full px-2.5 py-1 border-0 cursor-pointer ${statusColors[lead.status]}`}
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </td>

              {/* Actions */}
              <td className="px-4 py-4">
                <Link href={`/leads/${lead.id}`}>
                  <Button size="sm" variant="ghost">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {leads.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          <Globe2 className="h-12 w-12 mx-auto mb-4 text-zinc-300" />
          <p className="font-medium">Aucun lead trouvé</p>
          <p className="text-sm">Essayez de modifier vos filtres ou lancez un nouveau scan</p>
        </div>
      )}
    </div>
  )
}

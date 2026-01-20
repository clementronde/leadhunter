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
  formatDate,
  timeAgo
} from '@/lib/utils'
import {
  Globe,
  Globe2,
  ChevronRight,
  ArrowUpDown,
  MoreHorizontal
} from 'lucide-react'

interface LeadsTableProps {
  leads: Company[]
  onStatusChange?: (id: string, status: LeadStatus) => void
  sortBy?: string
  onSort?: (column: string) => void
}

export function LeadsTable({ leads, onStatusChange, sortBy, onSort }: LeadsTableProps) {
  const columns = [
    { key: 'name', label: 'Entreprise', sortable: true },
    { key: 'city', label: 'Ville', sortable: true },
    { key: 'sector', label: 'Secteur', sortable: true },
    { key: 'has_website', label: 'Site', sortable: true },
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
                className={`px-4 py-3 text-left text-sm font-medium text-zinc-500 ${
                  col.sortable ? 'cursor-pointer hover:text-zinc-900' : ''
                }`}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                <div className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && (
                    <ArrowUpDown className={`h-3.5 w-3.5 ${sortBy === col.key ? 'text-amber-500' : ''}`} />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {leads.map((lead) => (
            <tr key={lead.id} className="hover:bg-zinc-50 transition-colors">
              {/* Entreprise */}
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    lead.has_website ? 'bg-zinc-100' : 'bg-amber-50'
                  }`}>
                    {lead.has_website ? (
                      <Globe className="h-4 w-4 text-zinc-400" />
                    ) : (
                      <Globe2 className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                  <div>
                    <Link 
                      href={`/leads/${lead.id}`}
                      className="font-medium text-zinc-900 hover:text-amber-600 transition-colors"
                    >
                      {lead.name}
                    </Link>
                    {lead.website && (
                      <p className="text-xs text-zinc-400 truncate max-w-[200px]">
                        {lead.website.replace(/^https?:\/\//, '')}
                      </p>
                    )}
                  </div>
                </div>
              </td>
              
              {/* Ville */}
              <td className="px-4 py-4">
                <span className="text-sm text-zinc-600">{lead.city}</span>
                <p className="text-xs text-zinc-400">{lead.postal_code}</p>
              </td>
              
              {/* Secteur */}
              <td className="px-4 py-4">
                <span className="text-sm text-zinc-600">
                  {lead.sector ? sectorLabels[lead.sector] : '-'}
                </span>
              </td>
              
              {/* Site */}
              <td className="px-4 py-4">
                {lead.has_website ? (
                  <Badge variant="secondary">
                    {lead.audit ? `Score: ${lead.audit.overall_score}` : 'Oui'}
                  </Badge>
                ) : (
                  <Badge variant="warning">Non</Badge>
                )}
              </td>
              
              {/* Score */}
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${getScoreColor(lead.prospect_score)}`}>
                    {lead.prospect_score}
                  </span>
                  <div className="w-16 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        lead.prospect_score >= 80 ? 'bg-red-500' :
                        lead.prospect_score >= 60 ? 'bg-amber-500' :
                        lead.prospect_score >= 40 ? 'bg-blue-500' : 'bg-zinc-300'
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
                    <option key={value} value={value}>{label}</option>
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

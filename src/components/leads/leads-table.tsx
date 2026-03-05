'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge, Button, UpgradeModal } from '@/components/ui'
import { OutreachPanel } from './outreach-panel'
import { leadsApi } from '@/lib/api'
import { usePlan } from '@/hooks/usePlan'
import { Company, LeadStatus, CreateNoteInput } from '@/types'
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
  Mail,
  X,
  Bell,
} from 'lucide-react'

const FOLLOWUP_DAYS = 7

function needsFollowUp(lead: Company): boolean {
  if (lead.status !== 'contacted') return false
  if (!lead.last_contacted_at) return true
  const diff = Date.now() - new Date(lead.last_contacted_at).getTime()
  return diff > FOLLOWUP_DAYS * 24 * 60 * 60 * 1000
}

interface LeadsTableProps {
  leads: Company[]
  onStatusChange?: (id: string, status: LeadStatus) => void
  sortBy?: string
  onSort?: (column: string) => void
}

function RatingDisplay({ rating, count }: { rating?: number | null; count?: number | null }) {
  if (rating === null || rating === undefined) {
    return <span className="text-xs text-zinc-600">—</span>
  }
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1">
        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
        <span className="text-sm font-semibold text-zinc-200">{rating.toFixed(1)}</span>
      </div>
      {count !== null && count !== undefined && (
        <span className="text-xs text-zinc-500">{count.toLocaleString('fr-FR')} avis</span>
      )}
    </div>
  )
}

export function LeadsTable({ leads, onStatusChange, sortBy, onSort }: LeadsTableProps) {
  const { isPro } = usePlan()
  const [contactingLead, setContactingLead] = useState<Company | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  const columns = [
    { key: 'name', label: 'Établissement', sortable: true },
    { key: 'city', label: 'Adresse', sortable: true },
    { key: 'has_website', label: 'Site web', sortable: true },
    { key: 'google_rating', label: 'Note Google', sortable: true },
    { key: 'sector', label: 'Secteur', sortable: true },
    { key: 'prospect_score', label: 'Score', sortable: true },
    { key: 'priority', label: 'Priorité', sortable: true },
    { key: 'status', label: 'Statut', sortable: true },
    { key: 'contact', label: 'Contact', sortable: false },
    { key: 'actions', label: '', sortable: false },
  ]

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/[0.06]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left text-sm font-medium text-zinc-500 whitespace-nowrap ${
                  col.sortable ? 'cursor-pointer hover:text-zinc-300' : ''
                }`}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                <div className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && (
                    <ArrowUpDown
                      className={`h-3.5 w-3.5 ${sortBy === col.key ? 'text-amber-500' : 'text-zinc-700'}`}
                    />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-white/[0.04]">
          {leads.map((lead) => (
            <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors">
              {/* Établissement */}
              <td className="px-4 py-4 max-w-[220px]">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      lead.has_website ? 'bg-zinc-800/80' : 'bg-amber-500/10'
                    }`}
                  >
                    {lead.has_website ? (
                      <Globe className="h-4 w-4 text-zinc-400" />
                    ) : (
                      <Globe2 className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="font-medium text-zinc-200 hover:text-amber-400 transition-colors truncate"
                      >
                        {lead.name}
                      </Link>
                      {needsFollowUp(lead) && (
                        <span
                          title="À relancer — contacté il y a plus de 7 jours"
                          className="shrink-0 flex items-center gap-0.5 text-[10px] font-semibold text-orange-400 bg-orange-500/15 rounded-full px-1.5 py-0.5"
                        >
                          <Bell className="h-2.5 w-2.5" />
                          Relancer
                        </span>
                      )}
                    </div>
                    {lead.google_maps_url && (
                      <a
                        href={lead.google_maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:underline flex items-center gap-0.5 mt-0.5"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Fiche Maps
                      </a>
                    )}
                  </div>
                </div>
              </td>

              {/* Adresse */}
              <td className="px-4 py-4">
                <p className="text-sm text-zinc-300 truncate max-w-[180px]">
                  {lead.address || lead.city}
                </p>
                <p className="text-xs text-zinc-500">
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
                        className="block text-xs text-zinc-500 hover:text-amber-400 truncate max-w-[160px]"
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
                <RatingDisplay rating={lead.google_rating} count={lead.google_reviews_count} />
              </td>

              {/* Secteur */}
              <td className="px-4 py-4">
                <span className="text-sm text-zinc-400">
                  {lead.sector ? sectorLabels[lead.sector] : '—'}
                </span>
              </td>

              {/* Score */}
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${getScoreColor(lead.prospect_score)}`}>
                    {lead.prospect_score}
                  </span>
                  <div className="w-14 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        lead.prospect_score >= 80
                          ? 'bg-red-500'
                          : lead.prospect_score >= 60
                          ? 'bg-amber-500'
                          : lead.prospect_score >= 40
                          ? 'bg-blue-500'
                          : 'bg-zinc-600'
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
                  className={`text-xs font-medium rounded-full px-2.5 py-1 border-0 cursor-pointer bg-transparent ${statusColors[lead.status]}`}
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value} className="bg-zinc-900 text-zinc-200">
                      {label}
                    </option>
                  ))}
                </select>
              </td>

              {/* Contact */}
              <td className="px-4 py-4">
                {isPro ? (
                  <button
                    onClick={() => setContactingLead(lead)}
                    className="flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Contacter
                  </button>
                ) : (
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-amber-400 transition-colors"
                    title="Fonctionnalité Pro"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>Contacter</span>
                    <span className="bg-amber-500/20 text-amber-400 text-[9px] font-bold px-1 py-0.5 rounded-full leading-none">Pro</span>
                  </button>
                )}
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

      {showUpgradeModal && (
        <UpgradeModal
          open={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          reason="contact"
        />
      )}

      {/* Contact mini-modal */}
      {contactingLead && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setContactingLead(null)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg rounded-2xl border border-white/[0.08] bg-zinc-900/95 backdrop-blur-xl shadow-2xl shadow-black/60 p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Contacter {contactingLead.name}</h3>
              <button
                onClick={() => setContactingLead(null)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <OutreachPanel
              compact
              lead={contactingLead}
              onStatusChange={(s) => {
                onStatusChange?.(contactingLead.id, s)
                setContactingLead(null)
              }}
              onNoteAdded={async (input: CreateNoteInput) => {
                await leadsApi.addNote(input)
                setContactingLead(null)
              }}
            />
          </div>
        </div>
      )}

      {leads.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          <Globe2 className="h-12 w-12 mx-auto mb-4 text-zinc-700" />
          <p className="font-medium text-zinc-400">Aucun lead trouvé</p>
          <p className="text-sm">Essayez de modifier vos filtres ou lancez un nouveau scan</p>
        </div>
      )}
    </div>
  )
}

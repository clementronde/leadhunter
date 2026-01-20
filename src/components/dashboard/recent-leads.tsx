'use client'

import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui'
import { Company } from '@/types'
import { 
  priorityLabels, 
  priorityColors, 
  statusLabels, 
  statusColors,
  sectorLabels,
  timeAgo,
  getScoreColor
} from '@/lib/utils'
import { ArrowRight, Globe, Globe2, Building2 } from 'lucide-react'

interface RecentLeadsProps {
  leads: Company[]
}

export function RecentLeads({ leads }: RecentLeadsProps) {
  // Prendre les 5 leads les plus récents avec le meilleur score
  const topLeads = [...leads]
    .sort((a, b) => b.prospect_score - a.prospect_score)
    .slice(0, 5)
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Leads prioritaires</CardTitle>
        <Link 
          href="/leads" 
          className="flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 transition-colors"
        >
          Voir tous
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topLeads.map((lead) => (
            <Link
              key={lead.id}
              href={`/leads/${lead.id}`}
              className="flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-50 transition-colors group"
            >
              {/* Icon */}
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 group-hover:bg-white transition-colors">
                {lead.has_website ? (
                  <Globe className="h-5 w-5 text-zinc-400" />
                ) : (
                  <Globe2 className="h-5 w-5 text-amber-500" />
                )}
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-zinc-900 truncate">{lead.name}</p>
                  <Badge 
                    className={priorityColors[lead.priority]}
                    variant="outline"
                  >
                    {priorityLabels[lead.priority]}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-zinc-500">{lead.city}</span>
                  {lead.sector && (
                    <>
                      <span className="text-zinc-300">•</span>
                      <span className="text-sm text-zinc-500">
                        {sectorLabels[lead.sector]?.replace(/^.+\s/, '')}
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              {/* Score */}
              <div className="text-right">
                <p className={`text-lg font-bold ${getScoreColor(lead.prospect_score)}`}>
                  {lead.prospect_score}
                </p>
                <p className="text-xs text-zinc-400">score</p>
              </div>
            </Link>
          ))}
          
          {topLeads.length === 0 && (
            <div className="text-center py-8 text-zinc-500">
              <Building2 className="h-10 w-10 mx-auto mb-3 text-zinc-300" />
              <p>Aucun lead pour le moment</p>
              <p className="text-sm">Lancez un scan pour trouver des prospects</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

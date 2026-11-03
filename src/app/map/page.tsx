'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { Header } from '@/components/layout'
import { Skeleton } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { cn, priorityLabels, statusLabels } from '@/lib/utils'
import type { MapLead } from '@/components/leads/leads-map'
import type { LeadStatus, Priority } from '@/types'

// Leaflet a besoin de `window` : rendu côté client uniquement
const LeadsMap = dynamic(() => import('@/components/leads/leads-map'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
})

type PresenceFilter = 'all' | 'no_site' | 'site'

const MAX_POINTS = 3000

export default function MapPage() {
  const [leads, setLeads] = useState<MapLead[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<LeadStatus | 'all'>('new')
  const [priority, setPriority] = useState<Priority | 'all'>('all')
  const [presence, setPresence] = useState<PresenceFilter>('all')

  useEffect(() => {
    supabase
      .from('companies')
      .select('id, name, city, coordinates, prospect_score, priority, status, web_presence, has_website, phone')
      .not('coordinates', 'is', null)
      .order('prospect_score', { ascending: false })
      .limit(MAX_POINTS)
      .then(({ data }) => {
        setLeads((data ?? []) as MapLead[])
        setLoading(false)
      })
  }, [])

  const visible = useMemo(
    () =>
      leads.filter(
        (lead) =>
          (status === 'all' || lead.status === status) &&
          (priority === 'all' || lead.priority === priority) &&
          (presence === 'all' || (presence === 'site' ? lead.has_website : !lead.has_website))
      ),
    [leads, status, priority, presence]
  )

  return (
    <div className="flex h-screen flex-col">
      <Header title="Carte" subtitle="Vos leads par quartier, pour organiser une tournée ou une campagne locale" />

      <div className="flex flex-wrap items-center gap-2 px-6 pt-4">
        <FilterGroup
          value={status}
          onChange={setStatus}
          options={[['all', 'Tous statuts'], ...(Object.entries(statusLabels) as [LeadStatus, string][])]}
        />
        <FilterGroup
          value={priority}
          onChange={setPriority}
          options={[['all', 'Toutes priorités'], ...(Object.entries(priorityLabels) as [Priority, string][])]}
        />
        <FilterGroup
          value={presence}
          onChange={setPresence}
          options={[['all', 'Avec ou sans site'], ['no_site', 'Sans site'], ['site', 'Avec site']]}
        />
        <span className="ml-auto text-sm text-zinc-500">
          {loading ? '…' : `${visible.length} lead${visible.length > 1 ? 's' : ''} affiché${visible.length > 1 ? 's' : ''}`}
        </span>
      </div>

      <div className="min-h-0 flex-1 p-6">
        {loading ? <Skeleton className="h-full w-full" /> : <LeadsMap leads={visible} />}
      </div>
    </div>
  )
}

function FilterGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: [T, string][]
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      className={cn(
        'rounded-lg border border-white/[0.08] bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200',
        value !== 'all' && 'border-amber-500/40'
      )}
    >
      {options.map(([optionValue, label]) => (
        <option key={optionValue} value={optionValue}>
          {label}
        </option>
      ))}
    </select>
  )
}

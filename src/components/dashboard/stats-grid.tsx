'use client'

import { Card } from '@/components/ui'
import { cn } from '@/lib/utils'
import { 
  Users, 
  Globe, 
  Wrench, 
  Flame,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'

interface StatCardProps {
  title: string
  value: number | string
  change?: number
  icon: React.ReactNode
  iconBg?: string
  subtitle?: string
}

function StatCard({ title, value, change, icon, iconBg = 'bg-zinc-100', subtitle }: StatCardProps) {
  const getTrendIcon = () => {
    if (!change) return <Minus className="h-3 w-3 text-zinc-400" />
    if (change > 0) return <TrendingUp className="h-3 w-3 text-emerald-500" />
    return <TrendingDown className="h-3 w-3 text-red-500" />
  }
  
  const getTrendColor = () => {
    if (!change) return 'text-zinc-400'
    if (change > 0) return 'text-emerald-600'
    return 'text-red-600'
  }
  
  return (
    <Card className="p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900">{value}</p>
          {(change !== undefined || subtitle) && (
            <div className="mt-2 flex items-center gap-1.5">
              {change !== undefined && (
                <>
                  {getTrendIcon()}
                  <span className={cn('text-xs font-medium', getTrendColor())}>
                    {change > 0 ? '+' : ''}{change}%
                  </span>
                  <span className="text-xs text-zinc-400">vs sem. dernière</span>
                </>
              )}
              {subtitle && !change && (
                <span className="text-xs text-zinc-500">{subtitle}</span>
              )}
            </div>
          )}
        </div>
        <div className={cn('rounded-xl p-3', iconBg)}>
          {icon}
        </div>
      </div>
    </Card>
  )
}

interface StatsGridProps {
  totalLeads: number
  leadsWithoutSite: number
  leadsNeedingRefonte: number
  hotLeads: number
}

export function StatsGrid({ totalLeads, leadsWithoutSite, leadsNeedingRefonte, hotLeads }: StatsGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Leads"
        value={totalLeads}
        change={12}
        icon={<Users className="h-5 w-5 text-zinc-600" />}
        iconBg="bg-zinc-100"
      />
      <StatCard
        title="Sans site web"
        value={leadsWithoutSite}
        subtitle="Prospects idéaux"
        icon={<Globe className="h-5 w-5 text-blue-600" />}
        iconBg="bg-blue-50"
      />
      <StatCard
        title="Besoin refonte"
        value={leadsNeedingRefonte}
        subtitle="Site obsolète/lent"
        icon={<Wrench className="h-5 w-5 text-amber-600" />}
        iconBg="bg-amber-50"
      />
      <StatCard
        title="Leads chauds"
        value={hotLeads}
        change={25}
        icon={<Flame className="h-5 w-5 text-red-500" />}
        iconBg="bg-red-50"
      />
    </div>
  )
}

export { StatCard }

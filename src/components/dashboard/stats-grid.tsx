'use client'

import { useEffect, useRef } from 'react'
import { motion, useInView, useMotionValue, animate } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Users,
  Globe2,
  Wrench,
  Flame,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'

function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const motionValue = useMotionValue(value)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (isInView) {
      motionValue.set(0)
      const controls = animate(motionValue, value, {
        duration: 1.2,
        ease: 'easeOut',
        onUpdate: (latest) => {
          if (ref.current) {
            ref.current.textContent = Math.round(latest).toString()
          }
        },
      })
      return controls.stop
    }
  }, [isInView, value, motionValue])

  return (
    <p ref={ref} className="text-3xl font-bold text-white tabular-nums">
      {value}
    </p>
  )
}

interface StatCardProps {
  title: string
  value: number | string
  change?: number
  icon: React.ReactNode
  accentColor: string
  subtitle?: string
  href?: string
}

function StatCard({ title, value, change, icon, accentColor, subtitle, href }: StatCardProps) {
  const getTrendIcon = () => {
    if (change === undefined || change === null) return null
    if (change === 0) return <Minus className="h-3 w-3 text-zinc-500" />
    if (change > 0) return <TrendingUp className="h-3 w-3 text-emerald-400" />
    return <TrendingDown className="h-3 w-3 text-red-400" />
  }

  const getTrendColor = () => {
    if (!change) return 'text-zinc-500'
    if (change > 0) return 'text-emerald-400'
    return 'text-red-400'
  }

  const content = (
    <motion.div
      whileHover={{ y: -2, transition: { type: 'spring', stiffness: 500, damping: 30 } }}
      className="relative rounded-2xl border border-white/[0.07] bg-zinc-900/70 backdrop-blur-xl overflow-hidden cursor-default group"
    >
      {/* Top highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
      {/* Left color accent */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl', accentColor)} />

      <div className="p-5 pl-6">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{title}</p>
          <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-zinc-800/60 border border-white/[0.05]">
            {icon}
          </div>
        </div>

        {typeof value === 'number' ? (
          <AnimatedNumber value={value} />
        ) : (
          <p className="text-3xl font-bold text-white tabular-nums">{value}</p>
        )}

        <div className="mt-2 flex items-center gap-1.5 h-4">
          {change !== undefined && change !== null ? (
            <>
              {getTrendIcon()}
              <span className={cn('text-xs font-medium', getTrendColor())}>
                {change > 0 ? '+' : ''}{change}%
              </span>
              <span className="text-xs text-zinc-600">cette semaine</span>
            </>
          ) : subtitle ? (
            <span className="text-xs text-zinc-600">{subtitle}</span>
          ) : null}
        </div>
      </div>
    </motion.div>
  )

  if (href) {
    return <a href={href} className="block">{content}</a>
  }
  return content
}

interface StatsGridProps {
  totalLeads: number
  leadsWithoutSite: number
  leadsNeedingRefonte: number
  hotLeads: number
}

export function StatsGrid({ totalLeads, leadsWithoutSite, leadsNeedingRefonte, hotLeads }: StatsGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Leads"
        value={totalLeads}
        change={12}
        icon={<Users className="h-4 w-4 text-zinc-400" />}
        accentColor="bg-zinc-600"
        href="/leads"
      />
      <StatCard
        title="Sans site web"
        value={leadsWithoutSite}
        subtitle="Prospects idéaux"
        icon={<Globe2 className="h-4 w-4 text-blue-400" />}
        accentColor="bg-blue-500"
        href="/leads?has_website=false"
      />
      <StatCard
        title="À refondre"
        value={leadsNeedingRefonte}
        subtitle="Site obsolète ou lent"
        icon={<Wrench className="h-4 w-4 text-amber-400" />}
        accentColor="bg-amber-500"
        href="/leads?needs_refonte=true"
      />
      <StatCard
        title="Leads chauds"
        value={hotLeads}
        change={25}
        icon={<Flame className="h-4 w-4 text-red-400" />}
        accentColor="bg-red-500"
        href="/leads?priority=hot"
      />
    </div>
  )
}

export { StatCard }

'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { LandingPage } from '@/components/landing/landing-page'
import { Header } from '@/components/layout'
import { StatsGrid, LeadsChart, SectorsChart, RecentLeads } from '@/components/dashboard'
import { Card, Skeleton } from '@/components/ui'
import { statsApi, leadsApi } from '@/lib/api'
import { DashboardStats, Company } from '@/types'
import { Radar, Target, Flame, Kanban, ArrowRight } from 'lucide-react'

export default function HomePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  // After an OAuth round-trip, resume the destination chosen on the landing page
  useEffect(() => {
    if (!user) return
    try {
      const next = sessionStorage.getItem('lh-next')
      if (next && next.startsWith('/') && !next.startsWith('//')) {
        sessionStorage.removeItem('lh-next')
        router.replace(next)
      }
    } catch {}
  }, [user, router])

  if (authLoading) {
    return <div className="min-h-screen bg-canvas" role="status" aria-label="Chargement" />
  }

  if (!user) {
    return <LandingPage />
  }

  return <DashboardPage />
}

function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [leads, setLeads] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, leadsData] = await Promise.all([
          statsApi.getStats(),
          leadsApi.getAll({}, 1, 10)
        ])
        setStats(statsData)
        setLeads(leadsData.data)
      } catch (error) {
        console.error('Error loading dashboard:', error)
        setStats({
          total_leads: 0,
          leads_without_site: 0,
          leads_needing_refonte: 0,
          hot_leads: 0,
          warm_leads: 0,
          cold_leads: 0,
          by_status: { new: 0, contacted: 0, meeting: 0, proposal: 0, won: 0, lost: 0 },
          trend: [],
          top_sectors: [],
        })
        setLeads([])
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (!loading && stats?.total_leads === 0) {
    return (
      <div className="min-h-screen">
        <Header title="Vue d'ensemble" subtitle="Où en est votre prospection" />
        <div className="p-6">
          <OnboardingEmptyState />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Vue d'ensemble"
        subtitle="Où en est votre prospection"
      />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-5">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </Card>
            ))}
          </div>
        ) : stats && (
          <StatsGrid
            totalLeads={stats.total_leads}
            leadsWithoutSite={stats.leads_without_site}
            leadsNeedingRefonte={stats.leads_needing_refonte}
            hotLeads={stats.hot_leads}
          />
        )}

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {loading ? (
            <>
              <Card className="p-6">
                <Skeleton className="h-6 w-40 mb-4" />
                <Skeleton className="h-[300px]" />
              </Card>
              <Card className="p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-[300px]" />
              </Card>
            </>
          ) : stats && (
            <>
              <LeadsChart data={stats.trend} />
              <SectorsChart data={stats.top_sectors} />
            </>
          )}
        </div>

        {/* Recent Leads */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {loading ? (
              <Card className="p-6">
                <Skeleton className="h-6 w-40 mb-4" />
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-8 w-12" />
                    </div>
                  ))}
                </div>
              </Card>
            ) : (
              <RecentLeads leads={leads} />
            )}
          </div>

          {/* Quick Actions */}
          <Card className="p-6">
            <h3 className="mb-3 text-[15px] font-semibold text-white">Actions rapides</h3>
            <div className="-mx-2 space-y-px">
              <QuickAction
                href="/scanner"
                icon={<Radar className="h-4 w-4" />}
                title="Lancer un scan"
                description="Scanner une nouvelle zone"
              />
              <QuickAction
                href="/leads?has_website=false"
                icon={<Target className="h-4 w-4" />}
                title="Voir les prospects sans site"
                description={`${stats?.leads_without_site || 0} entreprises`}
              />
              <QuickAction
                href="/leads?priority=hot"
                icon={<Flame className="h-4 w-4" />}
                title="Leads chauds"
                description={`${stats?.hot_leads || 0} prospects prioritaires`}
              />
              <QuickAction
                href="/pipeline"
                icon={<Kanban className="h-4 w-4" />}
                title="Pipeline"
                description="Gérez vos opportunités"
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

const QUICK_SCANS = [
  { query: 'Restaurants', location: 'Paris' },
  { query: 'Coiffeurs', location: 'Lyon' },
  { query: 'Plombiers', location: 'Bordeaux' },
  { query: 'Boulangeries', location: 'Marseille' },
]

function OnboardingEmptyState() {
  return (
    <div className="mx-auto max-w-[640px] py-10">
      <h2 className="text-[24px] font-semibold tracking-[-0.02em] text-white">Lancez votre premier scan</h2>
      <p className="mt-2 text-[15px] leading-relaxed text-zinc-400">
        Choisissez un métier et une ville. LeadHunter récupère les entreprises de la zone, vérifie leur
        présence en ligne et les classe par score.
      </p>

      <a
        href="/scanner"
        className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-amber-500 px-4 text-[14px] font-medium text-on-accent transition-colors hover:bg-accent-hover"
      >
        <Radar className="h-4 w-4" />
        Ouvrir le scanner
      </a>

      <p className="mt-10 text-[13px] text-zinc-500">Ou partez d&apos;un exemple</p>
      <ul className="mt-2 divide-y divide-hairline/70 overflow-hidden rounded-xl border border-hairline bg-surface-1">
        {QUICK_SCANS.map(({ query, location }) => (
          <li key={query}>
            <a
              href={`/scanner?query=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`}
              className="group flex items-center justify-between px-4 py-3 text-[14px] transition-colors hover:bg-white/[0.03]"
            >
              <span className="text-zinc-200">
                {query} <span className="text-zinc-600">·</span> <span className="text-zinc-400">{location}</span>
              </span>
              <ArrowRight className="h-4 w-4 text-zinc-600 transition-colors group-hover:text-zinc-300" />
            </a>
          </li>
        ))}
      </ul>

      <ol className="mt-10 grid gap-6 text-[13px] sm:grid-cols-3">
        {[
          { title: 'Scanner', desc: 'Une zone, un métier : la liste arrive triée par score.' },
          { title: 'Trier', desc: 'Gardez ou écartez chaque lead au clavier.' },
          { title: 'Contacter', desc: 'Appelez, envoyez un email, suivez la relance.' },
        ].map(({ title, desc }) => (
          <li key={title}>
            <p className="font-medium text-zinc-200">{title}</p>
            <p className="mt-1 leading-relaxed text-zinc-500">{desc}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}

function QuickAction({ href, icon, title, description }: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <a
      href={href}
      className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.04]"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-hairline bg-surface-2 text-zinc-400 transition-colors group-hover:text-amber-400">
        {icon}
      </div>
      <div>
        <p className="font-medium text-zinc-200 group-hover:text-white transition-colors text-sm">
          {title}
        </p>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
    </a>
  )
}

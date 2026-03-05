'use client'

import React, { useEffect, useState } from 'react'
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

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#09090b]">
        <div className="h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
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
        <Header title="Dashboard" subtitle="Vue d'ensemble de votre prospection" />
        <div className="p-6">
          <OnboardingEmptyState />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Dashboard"
        subtitle="Vue d'ensemble de votre prospection"
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
            <h3 className="font-semibold text-lg text-white mb-4">Actions rapides</h3>
            <div className="space-y-2">
              <QuickAction
                href="/scanner"
                icon={<Radar className="h-5 w-5 text-amber-500" />}
                title="Lancer un scan"
                description="Scanner une nouvelle zone"
              />
              <QuickAction
                href="/leads?has_website=false"
                icon={<Target className="h-5 w-5 text-blue-400" />}
                title="Voir les prospects sans site"
                description={`${stats?.leads_without_site || 0} entreprises`}
              />
              <QuickAction
                href="/leads?priority=hot"
                icon={<Flame className="h-5 w-5 text-red-400" />}
                title="Leads chauds"
                description={`${stats?.hot_leads || 0} prospects prioritaires`}
              />
              <QuickAction
                href="/pipeline"
                icon={<Kanban className="h-5 w-5 text-violet-400" />}
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
  { query: 'Restaurants', location: 'Paris', emoji: '🍽️' },
  { query: 'Coiffeurs', location: 'Lyon', emoji: '✂️' },
  { query: 'Plombiers', location: 'Bordeaux', emoji: '🔧' },
  { query: 'Boulangeries', location: 'Marseille', emoji: '🥖' },
]

function OnboardingEmptyState() {
  return (
    <Card className="max-w-2xl mx-auto p-8 border-amber-500/20 bg-amber-500/[0.04]">
      <div className="text-center mb-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 mx-auto mb-4">
          <Target className="h-8 w-8 text-amber-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Bienvenue sur LeadHunter !</h2>
        <p className="text-zinc-400">Trouvez vos premiers prospects en 3 étapes simples.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        {[
          { num: '1', icon: <Radar className="h-5 w-5 text-amber-500" />, title: 'Scannez', desc: 'Recherchez des entreprises locales via Google Maps' },
          { num: '2', icon: <Flame className="h-5 w-5 text-red-400" />, title: 'Qualifiez', desc: 'Identifiez les prospects sans site ou à refondre' },
          { num: '3', icon: <Kanban className="h-5 w-5 text-violet-400" />, title: 'Contactez', desc: 'Envoyez un email et suivez vos opportunités' },
        ].map(({ num, icon, title, desc }) => (
          <div key={num} className="flex flex-col items-center text-center p-4 bg-zinc-800/40 rounded-xl border border-white/[0.06]">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 font-bold text-sm mb-3">{num}</div>
            <div className="flex items-center justify-center mb-2">{icon}</div>
            <p className="font-semibold text-white text-sm">{title}</p>
            <p className="text-xs text-zinc-500 mt-1">{desc}</p>
          </div>
        ))}
      </div>

      {/* Quick-start scan examples */}
      <div className="mb-6">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3 text-center">Démarrer rapidement</p>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_SCANS.map(({ query, location, emoji }) => (
            <a
              key={query}
              href={`/scanner?query=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-800/40 border border-white/[0.06] hover:border-amber-500/30 hover:bg-zinc-700/40 transition-all group"
            >
              <span className="text-xl">{emoji}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-200 group-hover:text-white">{query}</p>
                <p className="text-xs text-zinc-500">{location}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-zinc-600 group-hover:text-amber-500 ml-auto shrink-0 transition-colors" />
            </a>
          ))}
        </div>
      </div>

      <div className="text-center">
        <a
          href="/scanner"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold hover:opacity-90 transition-opacity"
        >
          <Radar className="h-4 w-4" />
          Scanner ma propre zone
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </Card>
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
      className="flex items-center gap-3 p-3 rounded-xl border border-transparent hover:bg-white/5 hover:border-white/[0.06] transition-all group"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800/60 group-hover:bg-zinc-700/60 transition-colors shrink-0">
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

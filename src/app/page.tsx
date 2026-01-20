'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout'
import { StatsGrid, LeadsChart, SectorsChart, RecentLeads } from '@/components/dashboard'
import { Card, Skeleton } from '@/components/ui'
import { statsApi, leadsApi } from '@/lib/api'
import { DashboardStats, Company } from '@/types'
import { mockDashboardStats, mockLeads } from '@/lib/mock-data'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [leads, setLeads] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        // Load stats and leads in parallel
        const [statsData, leadsData] = await Promise.all([
          statsApi.getStats(),
          leadsApi.getAll({}, 1, 10)
        ])
        setStats(statsData)
        setLeads(leadsData.data)
      } catch (error) {
        console.error('Error loading dashboard:', error)
        // Fallback to mock data
        setStats(mockDashboardStats)
        setLeads(mockLeads)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [])

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
            <h3 className="font-semibold text-lg mb-4">Actions rapides</h3>
            <div className="space-y-3">
              <QuickAction
                href="/scanner"
                icon="🔍"
                title="Lancer un scan"
                description="Scanner une nouvelle zone"
              />
              <QuickAction
                href="/leads?has_website=false"
                icon="🎯"
                title="Voir les prospects sans site"
                description={`${stats?.leads_without_site || 0} entreprises`}
              />
              <QuickAction
                href="/leads?priority=hot"
                icon="🔥"
                title="Leads chauds"
                description={`${stats?.hot_leads || 0} prospects prioritaires`}
              />
              <QuickAction
                href="/pipeline"
                icon="📊"
                title="Pipeline"
                description="Gérer vos opportunités"
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function QuickAction({ href, icon, title, description }: {
  href: string
  icon: string
  title: string
  description: string
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-50 transition-colors group"
    >
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="font-medium text-zinc-900 group-hover:text-amber-600 transition-colors">
          {title}
        </p>
        <p className="text-sm text-zinc-500">{description}</p>
      </div>
    </a>
  )
}

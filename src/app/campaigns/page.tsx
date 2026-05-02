'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle, Button, Skeleton } from '@/components/ui'
import { EmailCampaign } from '@/types'
import { CalendarClock, Mail, PauseCircle, Send, XCircle } from 'lucide-react'

const statusLabels: Record<string, string> = {
  draft: 'Brouillon',
  scheduled: 'Programmée',
  running: 'En cours',
  completed: 'Terminée',
  paused: 'Pause',
  cancelled: 'Annulée',
  failed: 'Échouée',
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const loadCampaigns = () => {
    setLoading(true)
    fetch('/api/outreach/campaigns')
      .then((res) => res.json())
      .then((data) => setCampaigns(data.campaigns ?? []))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadCampaigns()
  }, [])

  const handleCancel = async (campaignId: string) => {
    setCancellingId(campaignId)
    try {
      await fetch('/api/outreach/campaigns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, status: 'cancelled' }),
      })
      loadCampaigns()
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <div className="min-h-screen">
      <Header title="Campagnes" subtitle="Suivez vos envois et programmations email" />

      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={<Send className="h-5 w-5 text-blue-400" />} label="Campagnes" value={campaigns.length} />
          <StatCard
            icon={<CalendarClock className="h-5 w-5 text-amber-400" />}
            label="Programmées"
            value={campaigns.filter((campaign) => campaign.status === 'scheduled').length}
          />
          <StatCard
            icon={<Mail className="h-5 w-5 text-emerald-400" />}
            label="Emails prévus"
            value={campaigns.reduce((total, campaign) => total + campaign.total_recipients, 0)}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Historique des campagnes</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, index) => (
                  <Skeleton key={index} className="h-20" />
                ))}
              </div>
            ) : campaigns.length === 0 ? (
              <div className="py-12 text-center text-zinc-500">
                <Mail className="mx-auto mb-3 h-10 w-10 text-zinc-700" />
                <p>Aucune campagne pour l&apos;instant.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                    <Link href={`/campaigns/${campaign.id}`} className="group">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white group-hover:text-amber-400">{campaign.name}</p>
                        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-zinc-400">
                          {statusLabels[campaign.status] ?? campaign.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-500">
                        {campaign.total_recipients} destinataire{campaign.total_recipients > 1 ? 's' : ''}
                        {campaign.scheduled_at ? ` · ${new Date(campaign.scheduled_at).toLocaleString('fr-FR')}` : ''}
                      </p>
                      <p className="mt-1 text-xs text-zinc-600">
                        {campaign.sent_count} envoyés · {campaign.failed_count} erreurs
                      </p>
                    </Link>

                    {campaign.status === 'scheduled' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancel(campaign.id)}
                        disabled={cancellingId === campaign.id}
                      >
                        {cancellingId === campaign.id ? (
                          <PauseCircle className="h-4 w-4 animate-pulse" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        Annuler
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-zinc-500">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

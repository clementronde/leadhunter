'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Header } from '@/components/layout'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui'
import { EmailCampaign, EmailMessage } from '@/types'
import { ArrowLeft, Ban, Clock, Mail, MousePointerClick, RefreshCw, RotateCcw, XCircle } from 'lucide-react'

interface CampaignMessage extends EmailMessage {
  companies?: {
    name: string | null
    city: string | null
    status: string | null
    do_not_contact: boolean | null
  } | null
}

export default function CampaignDetailPage() {
  const params = useParams()
  const [campaign, setCampaign] = useState<EmailCampaign | null>(null)
  const [messages, setMessages] = useState<CampaignMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    fetch(`/api/outreach/campaigns/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setCampaign(data.campaign ?? null)
        setMessages(data.messages ?? [])
      })
      .catch(() => {
        setCampaign(null)
        setMessages([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (params.id) load()
  }, [params.id])

  const handleCancelFollowups = async () => {
    if (!campaign) return
    setBusy('cancel-followups')
    try {
      await fetch('/api/outreach/campaigns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id, status: 'cancelled' }),
      })
      load()
    } finally {
      setBusy(null)
    }
  }

  const handleRetryFailed = async () => {
    if (!campaign) return
    setBusy('retry-failed')
    try {
      await fetch('/api/outreach/campaigns', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id, mode: 'failed' }),
      })
      load()
    } finally {
      setBusy(null)
    }
  }

  const baseMessages = messages.filter((message) => !message.followup_of)
  const sent = baseMessages.filter((message) => message.status === 'sent').length
  const failed = baseMessages.filter((message) => message.status === 'failed').length
  const opened = baseMessages.filter((message) => message.opened_at).length
  const clicked = baseMessages.filter((message) => message.clicked_at).length
  const scheduledFollowups = messages.filter((message) => message.followup_of && message.status === 'scheduled').length

  return (
    <div className="min-h-screen">
      <Header title={campaign?.name ?? 'Campagne'} subtitle="Détail des emails, relances et tracking" />

      <div className="p-6 space-y-6">
        <Link href="/campaigns" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Retour aux campagnes
        </Link>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-96" />
          </div>
        ) : !campaign ? (
          <Card className="p-10 text-center text-zinc-500">Campagne introuvable.</Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-5">
              <Metric label="Destinataires" value={baseMessages.length} icon={<Mail className="h-4 w-4 text-blue-400" />} />
              <Metric label="Envoyés" value={sent} icon={<Clock className="h-4 w-4 text-emerald-400" />} />
              <Metric label="Ouverts" value={opened} icon={<Mail className="h-4 w-4 text-amber-400" />} />
              <Metric label="Cliqués" value={clicked} icon={<MousePointerClick className="h-4 w-4 text-violet-400" />} />
              <Metric label="Erreurs" value={failed} icon={<XCircle className="h-4 w-4 text-red-400" />} />
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <CardTitle>Actions</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={handleRetryFailed} disabled={busy !== null || failed === 0}>
                    {busy === 'retry-failed' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    Renvoyer les échoués
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCancelFollowups} disabled={busy !== null || scheduledFollowups === 0}>
                    {busy === 'cancel-followups' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                    Annuler les relances
                  </Button>
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Emails</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-left text-zinc-500">
                        <th className="pb-3 font-medium">Lead</th>
                        <th className="pb-3 font-medium">Email</th>
                        <th className="pb-3 font-medium">Statut</th>
                        <th className="pb-3 font-medium">Tracking</th>
                        <th className="pb-3 font-medium">Planifié</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {messages.map((message) => (
                        <tr key={message.id}>
                          <td className="py-3 pr-4">
                            <p className="font-medium text-zinc-200">{message.companies?.name ?? 'Lead supprimé'}</p>
                            <p className="text-xs text-zinc-600">
                              {message.followup_of ? `Relance J+${message.followup_delay_days}` : message.companies?.city}
                            </p>
                          </td>
                          <td className="py-3 pr-4 text-zinc-400">{message.recipient_email}</td>
                          <td className="py-3 pr-4">
                            <StatusBadge status={message.status} />
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex flex-wrap gap-1">
                              {message.opened_at && <Badge variant="warning">Ouvert</Badge>}
                              {message.clicked_at && <Badge variant="info">Cliqué</Badge>}
                              {message.bounced_at && <Badge variant="destructive">Bounce</Badge>}
                              {message.complained_at && <Badge variant="destructive">Plainte</Badge>}
                              {!message.opened_at && !message.clicked_at && !message.bounced_at && !message.complained_at && (
                                <span className="text-xs text-zinc-600">—</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 text-zinc-500">
                            {message.scheduled_at ? new Date(message.scheduled_at).toLocaleString('fr-FR') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
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

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === 'sent' ? 'success' :
    status === 'failed' ? 'destructive' :
    status === 'scheduled' ? 'warning' :
    status === 'cancelled' ? 'secondary' :
    'outline'

  return <Badge variant={variant}>{status}</Badge>
}

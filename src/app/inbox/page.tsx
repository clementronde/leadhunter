'use client'

import type { ReactNode } from 'react'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, Clock, Inbox, RefreshCw, Send, XCircle } from 'lucide-react'

type InboxMessage = {
  id: string
  company_id: string | null
  recipient_email: string
  subject: string
  status: string
  scheduled_at: string | null
  sent_at: string | null
  failed_at: string | null
  error_message: string | null
  opened_at?: string | null
  clicked_at?: string | null
  bounced_at?: string | null
  complained_at?: string | null
  companies?: {
    id: string
    name: string
    city: string
    status: string
  } | null
}

type InboxData = {
  due: InboxMessage[]
  failed: InboxMessage[]
  activity: InboxMessage[]
}

export default function OutreachInboxPage() {
  const [data, setData] = useState<InboxData>({ due: [], failed: [], activity: [] })
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const loadInbox = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/outreach/inbox')
    const payload = await res.json()
    if (res.ok) setData(payload)
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch('/api/outreach/inbox')
      .then((res) => res.json().then((payload) => ({ ok: res.ok, payload })))
      .then(({ ok, payload }) => {
        if (!cancelled && ok) setData(payload)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  async function sendDueMessages() {
    setSending(true)
    setMessage(null)
    const res = await fetch('/api/outreach/due', { method: 'POST' })
    const payload = await res.json().catch(() => ({}))
    setMessage(res.ok ? `${payload.sent ?? 0} email(s) envoyé(s), ${payload.failed ?? 0} échec(s).` : payload.error ?? 'Erreur envoi')
    await loadInbox()
    setSending(false)
  }

  const totalAttention = data.due.length + data.failed.length

  return (
    <div className="min-h-screen bg-[#0b0b0d] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-amber-400">
              <Inbox className="h-4 w-4" />
              Inbox prospection
            </div>
            <h1 className="mt-2 text-2xl font-bold text-white">À traiter aujourd&apos;hui</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Envois programmés, erreurs d&apos;envoi et signaux de tracking au même endroit.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={loadInbox}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-white/[0.04] disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              Actualiser
            </button>
            <button
              onClick={sendDueMessages}
              disabled={sending || data.due.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              Envoyer les dus
            </button>
          </div>
        </div>

        {message && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {message}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <Stat label="À envoyer" value={data.due.length} icon={<Clock className="h-5 w-5 text-amber-400" />} />
          <Stat label="Échecs" value={data.failed.length} icon={<XCircle className="h-5 w-5 text-red-400" />} />
          <Stat label="À surveiller" value={data.activity.length} icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />} />
        </div>

        {loading ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-zinc-500">
            Chargement de l&apos;inbox...
          </div>
        ) : totalAttention === 0 && data.activity.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
            <p className="mt-3 font-medium text-white">Rien à traiter pour le moment.</p>
            <p className="mt-1 text-sm text-zinc-500">Les programmations, erreurs et signaux récents apparaîtront ici.</p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
            <MessageSection title="À envoyer maintenant" empty="Aucun email programmé en retard." messages={data.due} />
            <MessageSection title="Échecs à corriger" empty="Aucun échec récent." messages={data.failed} danger />
            <div className="lg:col-span-2">
              <MessageSection title="Signaux récents" empty="Aucun tracking récent." messages={data.activity} activity />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{label}</p>
        {icon}
      </div>
      <p className="mt-3 text-2xl font-bold text-white">{value}</p>
    </div>
  )
}

function MessageSection({
  title,
  empty,
  messages,
  danger = false,
  activity = false,
}: {
  title: string
  empty: string
  messages: InboxMessage[]
  danger?: boolean
  activity?: boolean
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03]">
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="font-semibold text-white">{title}</h2>
      </div>
      {messages.length === 0 ? (
        <p className="px-4 py-6 text-sm text-zinc-500">{empty}</p>
      ) : (
        <div className="divide-y divide-white/10">
          {messages.map((message) => (
            <article key={message.id} className="px-4 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">{message.subject}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {message.companies?.name ?? message.recipient_email}
                    {message.companies?.city ? ` · ${message.companies.city}` : ''}
                  </p>
                </div>
                {message.company_id && (
                  <Link
                    href={`/leads/${message.company_id}`}
                    className="shrink-0 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/[0.04]"
                  >
                    Ouvrir
                  </Link>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {danger && message.error_message && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-1 text-red-300">
                    <AlertTriangle className="h-3 w-3" />
                    {message.error_message}
                  </span>
                )}
                {activity && <ActivityBadges message={message} />}
                {message.scheduled_at && <Badge>{formatDate(message.scheduled_at)}</Badge>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function ActivityBadges({ message }: { message: InboxMessage }) {
  return (
    <>
      {message.opened_at && <Badge>Ouvert {formatDate(message.opened_at)}</Badge>}
      {message.clicked_at && <Badge>Cliqué {formatDate(message.clicked_at)}</Badge>}
      {message.bounced_at && <Badge danger>Rebond {formatDate(message.bounced_at)}</Badge>}
      {message.complained_at && <Badge danger>Plainte {formatDate(message.complained_at)}</Badge>}
    </>
  )
}

function Badge({ children, danger = false }: { children: ReactNode; danger?: boolean }) {
  return (
    <span className={`rounded-full px-2 py-1 ${danger ? 'bg-red-500/10 text-red-300' : 'bg-white/[0.06] text-zinc-400'}`}>
      {children}
    </span>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

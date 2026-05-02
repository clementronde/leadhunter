'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Combine, RefreshCw, ShieldCheck } from 'lucide-react'

type DuplicateLead = {
  id: string
  name: string
  city: string | null
  phone: string | null
  email: string | null
  website: string | null
  google_place_id: string | null
  status: string
  prospect_score: number
  created_at: string
}

export default function DuplicatesPage() {
  const [groups, setGroups] = useState<DuplicateLead[][]>([])
  const [loading, setLoading] = useState(true)
  const [merging, setMerging] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const loadDuplicates = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/leads/duplicates')
    const payload = await res.json()
    if (res.ok) setGroups(payload.groups ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch('/api/leads/duplicates')
      .then((res) => res.json().then((payload) => ({ ok: res.ok, payload })))
      .then(({ ok, payload }) => {
        if (!cancelled && ok) setGroups(payload.groups ?? [])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  async function mergeGroup(group: DuplicateLead[], keepId: string) {
    setMerging(keepId)
    setMessage(null)
    const res = await fetch('/api/leads/duplicates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keepId, mergeIds: group.filter((lead) => lead.id !== keepId).map((lead) => lead.id) }),
    })
    const payload = await res.json().catch(() => ({}))
    setMessage(res.ok ? `${payload.merged ?? 0} doublon(s) fusionné(s).` : payload.error ?? 'Fusion impossible')
    await loadDuplicates()
    setMerging(null)
  }

  return (
    <div className="min-h-screen bg-[#0b0b0d] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-amber-400">
              <Combine className="h-4 w-4" />
              Doublons
            </div>
            <h1 className="mt-2 text-2xl font-bold text-white">Nettoyage des leads</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Détection par fiche Google, téléphone, email ou nom + ville.
            </p>
          </div>
          <button
            onClick={loadDuplicates}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-white/[0.04] disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            Rechercher
          </button>
        </div>

        {message && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {message}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-zinc-500">
            Analyse des doublons...
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-emerald-400" />
            <p className="mt-3 font-medium text-white">Aucun doublon évident.</p>
            <p className="mt-1 text-sm text-zinc-500">La base est propre sur les critères principaux.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => {
              const keep = group[0]
              return (
                <section key={group.map((lead) => lead.id).join('-')} className="rounded-xl border border-white/10 bg-white/[0.03]">
                  <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-semibold text-white">{group.length} fiches proches</h2>
                      <p className="text-sm text-zinc-500">Fiche conservée proposée: {keep.name}</p>
                    </div>
                    <button
                      onClick={() => mergeGroup(group, keep.id)}
                      disabled={merging === keep.id}
                      className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
                    >
                      Fusionner dans la meilleure fiche
                    </button>
                  </div>
                  <div className="divide-y divide-white/10">
                    {group.map((lead, index) => (
                      <article key={lead.id} className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_auto] md:items-center">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link href={`/leads/${lead.id}`} className="font-medium text-white hover:text-amber-300">
                              {lead.name}
                            </Link>
                            {index === 0 && <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">Conserver</span>}
                          </div>
                          <p className="mt-1 text-sm text-zinc-500">
                            {[lead.city, lead.phone, lead.email, lead.website].filter(Boolean).join(' · ') || 'Infos limitées'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="rounded-full bg-white/[0.06] px-2 py-1 text-zinc-400">Score {lead.prospect_score}</span>
                          <span className="rounded-full bg-white/[0.06] px-2 py-1 text-zinc-400">{lead.status}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

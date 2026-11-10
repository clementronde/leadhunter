'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui'
import { MapPin } from 'lucide-react'

/** Ajout d'un lead en collant le lien de sa fiche Google Maps */
export function GoogleLinkAdd({ onAdded }: { onAdded: () => void }) {
  const [url, setUrl] = useState('')
  const [toCall, setToCall] = useState(true)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ tone: 'ok' | 'error'; text: string; id?: string } | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!url.trim()) return
    setBusy(true)
    setResult(null)
    try {
      const res = await fetch('/api/leads/from-google-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), addToCallList: toCall, note: note.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Le lead n'a pas pu être ajouté")
      const { id, name, created, inCallList, closedOnGoogle } = data.data as {
        id: string
        name: string
        created: boolean
        inCallList: boolean
        closedOnGoogle: boolean
      }
      setResult({
        tone: closedOnGoogle ? 'error' : 'ok',
        id,
        text: closedOnGoogle
          ? `Google indique que ${name} est fermé définitivement : il est rangé dans « Non qualifiés / radiés ».`
          : `${created ? `${name} est ajouté à vos leads` : `${name} était déjà dans vos leads (pas de doublon créé)`}${
              inCallList ? ' et se trouve dans « À appeler ».' : '.'
            }`,
      })
      setUrl('')
      setNote('')
      onAdded()
    } catch (err) {
      setResult({ tone: 'error', text: err instanceof Error ? err.message : "Le lead n'a pas pu être ajouté" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-white/[0.06] bg-zinc-900/70 p-4">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-amber-400" />
        <p className="text-sm font-semibold text-zinc-200">Ajouter une fiche Google</p>
        <p className="text-xs text-zinc-500">Dans Google Maps : ouvrez la fiche, « Partager », copiez le lien et collez-le ici.</p>
      </div>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <input
          id="google-link-url"
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://maps.app.goo.gl/…"
          className="h-10 min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-zinc-950 px-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none"
        />
        <input
          id="google-link-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (facultatif)"
          className="h-10 min-w-0 rounded-lg border border-white/[0.08] bg-zinc-950 px-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none lg:w-56"
        />
        <label htmlFor="google-link-call" className="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-white/[0.08] px-3 text-sm text-zinc-300">
          <input
            id="google-link-call"
            type="checkbox"
            checked={toCall}
            onChange={(e) => setToCall(e.target.checked)}
            className="h-4 w-4 accent-amber-500"
          />
          À appeler
        </label>
        <Button type="submit" loading={busy} disabled={busy || !url.trim()} className="shrink-0">
          Ajouter
        </Button>
      </div>
      {result && (
        <p className={`text-sm ${result.tone === 'ok' ? 'text-emerald-300' : 'text-red-300'}`}>
          {result.text}{' '}
          {result.id && (
            <Link href={`/leads/${result.id}`} className="text-amber-400 hover:underline">
              Ouvrir la fiche
            </Link>
          )}
        </p>
      )}
    </form>
  )
}

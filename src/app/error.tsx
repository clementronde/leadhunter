'use client'

import { useEffect } from 'react'
import { Target, RefreshCw, Home } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] px-4">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(239,68,68,0.08) 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="text-center max-w-md">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/20 mx-auto mb-6">
          <Target className="h-10 w-10 text-red-400" />
        </div>

        <p className="text-8xl font-black text-white mb-2 tracking-tighter">Oups</p>
        <h1 className="text-xl font-semibold text-zinc-300 mb-3">Une erreur est survenue</h1>
        <p className="text-sm text-zinc-500 mb-8">
          Quelque chose s'est mal passé. Réessayez ou retournez sur le tableau de bord.
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </button>
          <a
            href="/"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/[0.08] bg-zinc-800/60 text-zinc-300 text-sm font-medium hover:bg-zinc-700/60 hover:text-white transition-colors"
          >
            <Home className="h-4 w-4" />
            Tableau de bord
          </a>
        </div>
      </div>
    </div>
  )
}

import Link from 'next/link'
import { Target, Home, Radar } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] px-4">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(251,146,60,0.12) 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="text-center max-w-md">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 mx-auto mb-6 shadow-lg shadow-amber-900/30">
          <Target className="h-10 w-10 text-white" />
        </div>

        <p className="text-8xl font-black text-white mb-2 tracking-tighter">404</p>
        <h1 className="text-xl font-semibold text-zinc-300 mb-3">Page introuvable</h1>
        <p className="text-sm text-zinc-500 mb-8">
          Cette page n'existe pas ou a été déplacée. Retournez sur le tableau de bord.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Home className="h-4 w-4" />
            Tableau de bord
          </Link>
          <Link
            href="/scanner"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/[0.08] bg-zinc-800/60 text-zinc-300 text-sm font-medium hover:bg-zinc-700/60 hover:text-white transition-colors"
          >
            <Radar className="h-4 w-4" />
            Scanner
          </Link>
        </div>
      </div>
    </div>
  )
}

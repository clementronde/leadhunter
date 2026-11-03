import Link from 'next/link'
import { Target, Home, Radar } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">

      <div className="text-center max-w-md">
        <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-amber-500 mx-auto mb-6">
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
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-on-accent text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Home className="h-4 w-4" />
            Tableau de bord
          </Link>
          <Link
            href="/scanner"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-hairline-strong bg-surface-2 text-zinc-300 text-sm font-medium hover:bg-zinc-700/60 hover:text-white transition-colors"
          >
            <Radar className="h-4 w-4" />
            Scanner
          </Link>
        </div>
      </div>
    </div>
  )
}

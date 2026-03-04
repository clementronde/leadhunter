'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Check, ArrowRight, Target, Zap } from 'lucide-react'

function PricingContent() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const success = searchParams.get('success') === 'true'

  const handleCheckout = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', { method: 'POST' })
      const data = await res.json()
      if (res.status === 401) {
        window.location.href = '/login'
        return
      }
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-[#09090b]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
              <Target className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">
              Lead<span className="text-amber-500">Hunter</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              Se connecter
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20">
        {/* Success banner */}
        {success && (
          <div className="mb-8 flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
            <Zap className="h-5 w-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-semibold">Bienvenue dans LeadHunter Pro !</p>
              <p className="text-sm">Votre abonnement est actif. Profitez de toutes les fonctionnalités Pro.</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Des tarifs simples et transparents
          </h1>
          <p className="text-zinc-500 text-lg">
            Commencez gratuitement, passez en Pro quand vous êtes prêt.
          </p>
        </div>

        {/* Plans */}
        <div className="grid gap-6 sm:grid-cols-2 max-w-2xl mx-auto">
          {/* Free plan */}
          <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 p-8 flex flex-col">
            <div className="mb-6">
              <p className="font-semibold text-white text-lg mb-1">Gratuit</p>
              <p className="text-4xl font-bold text-white">
                0€<span className="text-base font-normal text-zinc-500">/mois</span>
              </p>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {[
                '50 scans / mois',
                '100 leads maximum',
                'Scoring basique',
                'Pipeline CRM',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                  <Check className="h-4 w-4 text-amber-500 shrink-0" />
                  {f}
                </li>
              ))}
              {[
                'Export XLSX',
                'Audit de site avancé',
                'Scans illimités',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-zinc-400 line-through">
                  <Check className="h-4 w-4 text-zinc-300 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/login"
              className="w-full text-center py-2.5 rounded-xl font-medium text-sm border border-white/[0.08] bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60 hover:text-white transition-colors"
            >
              Commencer gratuitement
            </Link>
          </div>

          {/* Pro plan */}
          <div className="relative rounded-2xl border border-amber-400/50 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-8 flex flex-col shadow-xl shadow-amber-100/50">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                Le plus populaire
              </span>
            </div>
            <div className="mb-6">
              <p className="font-semibold text-white text-lg mb-1">Pro</p>
              <p className="text-4xl font-bold text-white">
                29€<span className="text-base font-normal text-zinc-500">/mois</span>
              </p>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {[
                'Scans illimités',
                'Leads illimités',
                'Audit de site avancé (Core Web Vitals)',
                'Export XLSX',
                'Alertes automatiques',
                'Support prioritaire',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                  <Check className="h-4 w-4 text-amber-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {loading ? 'Redirection...' : (
                <>
                  Essayer Pro
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
            <p className="text-center text-xs text-zinc-500 mt-3">Sans engagement · Annulez à tout moment</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PricingPage() {
  return (
    <Suspense>
      <PricingContent />
    </Suspense>
  )
}

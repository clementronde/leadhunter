'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Check, X, ArrowRight, Target, Zap, CheckCircle } from 'lucide-react'

const FREE_FEATURES = [
  { label: '3 scans / mois', ok: true },
  { label: '10 leads par scan', ok: true },
  { label: 'Scoring Chaud / Tiède / Froid', ok: true },
  { label: 'Export CSV (10 leads)', ok: true },
  { label: 'Pipeline CRM Kanban', ok: true },
  { label: 'Audit Core Web Vitals', ok: false },
  { label: 'Export XLSX illimité', ok: false },
  { label: 'Contacter en masse (BCC)', ok: false },
  { label: 'Support prioritaire', ok: false },
]

const PRO_FEATURES = [
  'Scans illimités',
  'Jusqu\'à 60 leads par scan',
  'Scoring Chaud / Tiède / Froid',
  'Export CSV & XLSX illimités',
  'Pipeline CRM Kanban',
  'Audit Core Web Vitals (Speed Insights)',
  'Templates email personnalisables',
  'Rappels de relance automatiques',
  'Contacter en masse (BCC)',
  'Support prioritaire',
]

const FAQ = [
  {
    q: 'Est-ce sans engagement ?',
    a: 'Oui, vous pouvez annuler à tout moment depuis votre portail de gestion. Aucun frais caché.',
  },
  {
    q: "Quand l'accès Pro est-il activé ?",
    a: "Immédiatement après le paiement — pas d'attente. Toutes les fonctionnalités sont débloquées instantanément.",
  },
  {
    q: 'Quels moyens de paiement acceptez-vous ?',
    a: 'Carte bancaire (Visa, Mastercard, Amex) via Stripe. Vos données de paiement sont sécurisées.',
  },
  {
    q: "Puis-je essayer avant de payer ?",
    a: "Absolument. Le plan gratuit inclut 3 scans et toutes les fonctionnalités de base — aucune carte bancaire requise.",
  },
  {
    q: "Qu'est-ce qu'un scan ?",
    a: "Un scan = une recherche d'entreprises sur une zone donnée (ex: \"Restaurants à Lyon\"). Chaque scan remonte jusqu'à 60 leads avec le plan Pro.",
  },
]

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
      if (data.url) window.location.href = data.url
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(251,146,60,0.10) 0%, transparent 60%)',
          }}
        />
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
              <Target className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold">Lead<span className="text-amber-400">Hunter</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Se connecter
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Commencer gratuitement
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        {/* Success banner */}
        {success && (
          <div className="mb-8 flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-300">Bienvenue dans LeadHunter Pro !</p>
              <p className="text-sm text-emerald-400">Votre abonnement est actif. Profitez de toutes les fonctionnalités.</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full mb-5">
            <Zap className="h-3.5 w-3.5" />
            Tarifs simples et transparents
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            Commencez gratuitement,<br />
            <span className="text-amber-400">passez Pro quand vous êtes prêt</span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            Aucune carte bancaire requise pour démarrer. Sans engagement pour le plan Pro.
          </p>
        </div>

        {/* Plans */}
        <div className="grid sm:grid-cols-2 gap-6 mb-20">
          {/* Free */}
          <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 p-8 flex flex-col">
            <div className="mb-8">
              <p className="text-zinc-400 text-sm font-medium mb-2">Gratuit</p>
              <p className="text-5xl font-bold">0€<span className="text-lg font-normal text-zinc-500">/mois</span></p>
              <p className="text-xs text-zinc-500 mt-1.5">Pour découvrir l&apos;outil</p>
            </div>
            <ul className="space-y-3 flex-1 mb-8">
              {FREE_FEATURES.map(({ label, ok }) => (
                <li key={label} className="flex items-center gap-2.5 text-sm">
                  {ok
                    ? <Check className="h-4 w-4 text-amber-400 shrink-0" />
                    : <X className="h-4 w-4 text-zinc-700 shrink-0" />}
                  <span className={ok ? 'text-zinc-300' : 'text-zinc-600'}>{label}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/login"
              className="block text-center py-3 rounded-xl text-sm font-medium border border-white/10 text-zinc-300 hover:border-white/20 hover:text-white transition-all"
            >
              Commencer gratuitement
            </Link>
          </div>

          {/* Pro */}
          <div className="relative rounded-2xl border border-amber-500/40 bg-gradient-to-b from-amber-500/[0.07] to-transparent p-8 flex flex-col">
            <div className="absolute -top-3 left-6">
              <span className="bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                Populaire
              </span>
            </div>
            <div className="mb-8">
              <p className="text-zinc-400 text-sm font-medium mb-2">Pro</p>
              <p className="text-5xl font-bold">29€<span className="text-lg font-normal text-zinc-500">/mois</span></p>
              <p className="text-xs text-zinc-500 mt-1.5">Sans engagement · Annulable à tout moment</p>
            </div>
            <ul className="space-y-3 flex-1 mb-8">
              {PRO_FEATURES.map((label) => (
                <li key={label} className="flex items-center gap-2.5 text-sm text-zinc-300">
                  <Check className="h-4 w-4 text-amber-400 shrink-0" />
                  {label}
                </li>
              ))}
            </ul>
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {loading ? 'Redirection...' : <>Passer à Pro — 29€/mois <ArrowRight className="h-4 w-4" /></>}
            </button>
            <p className="text-center text-xs text-zinc-600 mt-2">Sans engagement · Annulez à tout moment</p>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Questions fréquentes</h2>
          <div className="space-y-4">
            {FAQ.map(({ q, a }) => (
              <div key={q} className="p-5 rounded-xl border border-white/[0.06] bg-zinc-900/40">
                <p className="font-semibold text-white mb-2">{q}</p>
                <p className="text-sm text-zinc-400">{a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA bottom */}
        <div className="text-center mt-20">
          <p className="text-zinc-400 mb-6">Prêt à trouver vos prochains clients ?</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-lg hover:opacity-90 transition-opacity shadow-xl shadow-amber-900/30"
          >
            Créer mon compte gratuitement
            <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="text-xs text-zinc-600 mt-3">3 scans gratuits · Sans carte bancaire · Sans engagement</p>
        </div>
      </main>
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

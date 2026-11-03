'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout'
import { Card, CardContent, Button, Badge } from '@/components/ui'
import { usePlan, FREE_SCAN_LIMIT } from '@/hooks/usePlan'
import { useAuth } from '@/components/auth/auth-provider'
import {
  Zap,
  Check,
  Crown,
  Loader2,
  ExternalLink,
  CheckCircle,
  Scan,
  Download,
  BarChart2,
  Infinity,
  HeadphonesIcon,
} from 'lucide-react'

const PRO_FEATURES = [
  { icon: Scan, label: 'Scans illimités' },
  { icon: Download, label: 'Export XLSX' },
  { icon: BarChart2, label: 'Audit Core Web Vitals' },
  { icon: Infinity, label: 'Leads illimités' },
  { icon: HeadphonesIcon, label: 'Support prioritaire' },
]

function UpgradeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const { isPro, scanCountThisMonth, canScan } = usePlan()
  const [loading, setLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)

  const success = searchParams.get('success') === 'true'

  useEffect(() => {
    if (success) {
      // scroll to top so the banner is visible
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [success])

  const handleCheckout = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnPath: '/upgrade' }),
      })
      const text = await res.text()
      const data = text ? JSON.parse(text) : {}
      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('Checkout error:', res.status, data.error ?? 'No URL returned')
        setLoading(false)
      }
    } catch (err) {
      console.error('Checkout error:', err)
      setLoading(false)
    }
  }

  const handleBillingPortal = async () => {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/billing-portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Portal error:', err)
    } finally {
      setPortalLoading(false)
    }
  }

  const scanPct = Math.min((scanCountThisMonth / FREE_SCAN_LIMIT) * 100, 100)

  return (
    <div className="p-6 max-w-3xl space-y-6">
      {/* Success banner */}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
          <div>
            <p className="font-semibold text-emerald-300">Bienvenue dans le plan Pro !</p>
            <p className="text-sm text-emerald-400">
              Votre abonnement est actif. Toutes les fonctionnalités Pro sont maintenant disponibles.
            </p>
          </div>
          <button
            onClick={() => router.replace('/upgrade')}
            className="ml-auto text-xs text-emerald-400 hover:text-emerald-300"
          >
            ✕
          </button>
        </div>
      )}

      {/* Plan actuel */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Card Plan Gratuit */}
        <Card className={`p-5 ${isPro ? 'opacity-60' : 'ring-2 ring-amber-400'}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">
                Plan actuel
              </p>
              <h3 className="text-xl font-bold text-white">Gratuit</h3>
            </div>
            <Badge variant="secondary">FREE</Badge>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-zinc-400">Scans ce mois</span>
                <span className={`font-semibold ${!canScan ? 'text-red-400' : 'text-white'}`}>
                  {scanCountThisMonth} / {FREE_SCAN_LIMIT}
                </span>
              </div>
              <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    scanPct >= 100 ? 'bg-red-500' : scanPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${scanPct}%` }}
                />
              </div>
              {!canScan && (
                <p className="text-xs text-red-400 mt-1 font-medium">Limite mensuelle atteinte</p>
              )}
            </div>

            <ul className="space-y-1.5 text-sm text-zinc-400">
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-zinc-400" />
                3 scans / mois
              </li>
              <li className="flex items-center gap-2 line-through text-zinc-400">
                <Check className="h-3.5 w-3.5 text-zinc-300" />
                Export XLSX
              </li>
              <li className="flex items-center gap-2 line-through text-zinc-400">
                <Check className="h-3.5 w-3.5 text-zinc-300" />
                Audit Web Vitals
              </li>
            </ul>
          </div>
        </Card>

        {/* Card Plan Pro */}
        <Card className={`p-5 ${isPro ? 'ring-2 ring-amber-400' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">
                {isPro ? 'Plan actuel' : 'Recommandé'}
              </p>
              <h3 className="text-xl font-bold text-white">Pro</h3>
            </div>
            <span className="text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 px-2.5 py-1 rounded-full">
              PRO
            </span>
          </div>

          <ul className="space-y-2 mb-5">
            {PRO_FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2 text-sm text-zinc-300">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20">
                  <Check className="h-3 w-3 text-amber-400" />
                </div>
                {label}
              </li>
            ))}
          </ul>

          <p className="text-sm text-zinc-500 mb-4">
            <span className="text-2xl font-bold text-white">29€</span>
            <span className="text-zinc-500"> / mois · Sans engagement</span>
          </p>

          {isPro ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <Crown className="h-4 w-4 text-emerald-400" />
                <p className="text-sm font-medium text-emerald-300">
                  Abonnement Pro actif pour {user?.email}
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleBillingPortal}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Gérer mon abonnement
              </Button>
            </div>
          ) : (
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {loading ? 'Redirection...' : 'Passer à Pro'}
            </button>
          )}
        </Card>
      </div>

      {/* FAQ / Reassurance */}
      {!isPro && (
        <Card className="p-5">
          <h3 className="font-semibold text-white mb-3">Questions fréquentes</h3>
          <div className="space-y-3 text-sm text-zinc-400">
            <div>
              <p className="font-medium text-zinc-200">Est-ce sans engagement ?</p>
              <p>Oui, vous pouvez annuler à tout moment depuis le portail de gestion.</p>
            </div>
            <div>
              <p className="font-medium text-zinc-200">Quand l'accès Pro est-il activé ?</p>
              <p>Immédiatement après le paiement — pas d'attente.</p>
            </div>
            <div>
              <p className="font-medium text-zinc-200">Quels moyens de paiement ?</p>
              <p>Carte bancaire (Visa, Mastercard, Amex) via Stripe.</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

export default function UpgradePage() {
  return (
    <div className="min-h-screen">
      <Header
        title="Mon abonnement"
        subtitle="Gérez votre plan et débloquez toutes les fonctionnalités"
      />
      <Suspense fallback={<div className="p-6 text-zinc-400">Chargement...</div>}>
        <UpgradeContent />
      </Suspense>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { X, Check, Zap, Lock, Loader2 } from 'lucide-react'

interface UpgradeModalProps {
  open: boolean
  onClose: () => void
  reason: 'scan_limit' | 'export' | 'audit' | 'pipeline' | 'contact'
}

const REASONS = {
  scan_limit: {
    title: 'Limite de scans atteinte',
    description: 'Vous avez utilisé vos 3 scans gratuits ce mois-ci. Passez à Pro pour des scans illimités.',
  },
  export: {
    title: 'Export réservé aux abonnés Pro',
    description: "L'export XLSX est disponible uniquement dans le plan Pro.",
  },
  audit: {
    title: 'Audit réservé aux abonnés Pro',
    description: "L'audit Core Web Vitals est disponible uniquement dans le plan Pro.",
  },
  pipeline: {
    title: 'Fonctionnalité Pro',
    description: 'Cette fonctionnalité est disponible uniquement dans le plan Pro.',
  },
  contact: {
    title: 'Prospection email — Fonctionnalité Pro',
    description: 'Accédez aux templates email, au lien mailto pré-rempli et au suivi CRM directement depuis chaque fiche prospect.',
  },
}

const PRO_FEATURES = [
  'Scans illimités',
  'Export XLSX',
  'Audit Core Web Vitals',
  'Leads illimités',
  'Support prioritaire',
]

export function UpgradeModal({ open, onClose, reason }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false)
  const content = REASONS[reason]

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon */}
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 mb-4">
          <Lock className="h-6 w-6 text-amber-600" />
        </div>

        <h2 className="text-xl font-bold text-zinc-900 mb-2">{content.title}</h2>
        <p className="text-sm text-zinc-500 mb-6">{content.description}</p>

        {/* Features */}
        <div className="bg-amber-50 rounded-xl p-4 mb-6">
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-3">
            Plan Pro inclut
          </p>
          <ul className="space-y-2">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-zinc-700">
                <Check className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Price */}
        <p className="text-center text-sm text-zinc-500 mb-4">
          À partir de <span className="font-bold text-zinc-900">29€/mois</span> · Sans engagement
        </p>

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

        <button
          onClick={onClose}
          className="w-full mt-2 py-2 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
        >
          Continuer avec le plan gratuit
        </button>
      </div>
    </div>
  )
}

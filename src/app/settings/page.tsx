'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui'
import { usePlan } from '@/hooks/usePlan'
import {
  Settings,
  Database,
  Key,
  Bell,
  Download,
  Trash2,
  ExternalLink,
  CheckCircle,
  XCircle,
  Crown,
  Zap,
  Loader2,
} from 'lucide-react'

interface ApiKeyStatus {
  configured: boolean
  preview: string | null
}

interface HealthData {
  keys: {
    GOOGLE_MAPS_API_KEY: ApiKeyStatus
    PAGESPEED_API_KEY: ApiKeyStatus
    INSEE_API_KEY: ApiKeyStatus
  }
}

export default function SettingsPage() {
  const router = useRouter()
  const { isPro } = usePlan()
  const [portalLoading, setPortalLoading] = useState(false)
  const [health, setHealth] = useState<HealthData | null>(null)

  // Check if Supabase env vars are present (NEXT_PUBLIC_ are available client-side)
  const supabaseConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const supabasePreview = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? process.env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', '').split('.')[0]
    : null

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => {})
  }, [])

  const handleBillingPortal = async () => {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/billing-portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (err) {
      console.error('Portal error:', err)
    } finally {
      setPortalLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Paramètres"
        subtitle="Configurez votre application"
      />

      <div className="p-6 max-w-4xl space-y-6">

        {/* Subscription */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              Mon abonnement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isPro ? 'bg-amber-100' : 'bg-zinc-200'}`}>
                  {isPro ? (
                    <Crown className="h-5 w-5 text-amber-600" />
                  ) : (
                    <Settings className="h-5 w-5 text-zinc-500" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-zinc-900">Plan {isPro ? 'Pro' : 'Gratuit'}</p>
                  <p className="text-sm text-zinc-500">
                    {isPro
                      ? 'Accès illimité à toutes les fonctionnalités'
                      : '3 scans / mois · Fonctionnalités limitées'}
                  </p>
                </div>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isPro ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white' : 'bg-zinc-200 text-zinc-600'}`}>
                {isPro ? 'PRO' : 'FREE'}
              </span>
            </div>

            <div className="mt-4">
              {isPro ? (
                <Button variant="outline" onClick={handleBillingPortal} disabled={portalLoading}>
                  {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                  Gérer mon abonnement
                </Button>
              ) : (
                <button
                  onClick={() => router.push('/upgrade')}
                  className="flex items-center gap-2 py-2 px-4 rounded-lg font-semibold text-sm bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90 transition-opacity"
                >
                  <Zap className="h-4 w-4" />
                  Passer à Pro — 29€/mois
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Database connection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Base de données Supabase
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`flex items-center gap-3 p-4 rounded-lg border ${
              supabaseConfigured
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-red-50 border-red-200'
            }`}>
              {supabaseConfigured ? (
                <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              )}
              <div>
                <p className={`font-medium ${supabaseConfigured ? 'text-emerald-800' : 'text-red-800'}`}>
                  {supabaseConfigured ? 'Connecté à Supabase' : 'Supabase non configuré'}
                </p>
                <p className={`text-sm mt-0.5 ${supabaseConfigured ? 'text-emerald-700' : 'text-red-700'}`}>
                  {supabaseConfigured
                    ? `Projet : ${supabasePreview}.supabase.co`
                    : 'Ajoutez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local'}
                </p>
              </div>
            </div>

            {!supabaseConfigured && (
              <div className="pt-2 border-t border-zinc-200">
                <p className="text-sm text-zinc-500 mb-3"><strong>Instructions :</strong></p>
                <ol className="text-sm text-zinc-600 space-y-2 list-decimal list-inside">
                  <li>
                    Créez un projet gratuit sur{' '}
                    <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">
                      supabase.com <ExternalLink className="h-3 w-3 inline" />
                    </a>
                  </li>
                  <li>Copiez l'URL et la clé anon depuis Settings → API</li>
                  <li>Ajoutez-les dans votre <code className="bg-zinc-100 px-1 rounded">.env.local</code></li>
                  <li>Exécutez le schéma SQL (<code className="bg-zinc-100 px-1 rounded">supabase-schema.sql</code>)</li>
                </ol>
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Clés API externes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {health ? (
              <>
                <ApiKeyRow
                  name="Google Places API"
                  description="Recherche d'entreprises locales"
                  status={health.keys.GOOGLE_MAPS_API_KEY}
                  docsUrl="https://developers.google.com/maps/documentation/places/web-service"
                  envVar="GOOGLE_MAPS_API_KEY"
                />
                <ApiKeyRow
                  name="PageSpeed Insights API"
                  description="Audit de performance des sites (gratuit)"
                  status={health.keys.PAGESPEED_API_KEY}
                  docsUrl="https://developers.google.com/speed/docs/insights/v5/get-started"
                  envVar="PAGESPEED_API_KEY"
                />
                <ApiKeyRow
                  name="API Sirene INSEE"
                  description="Base officielle des entreprises françaises (gratuit)"
                  status={health.keys.INSEE_API_KEY}
                  docsUrl="https://api.insee.fr/catalogue/"
                  envVar="INSEE_CONSUMER_KEY"
                />
              </>
            ) : (
              <div className="flex items-center gap-2 text-zinc-400 text-sm py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Vérification des clés...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-900">Nouveaux leads chauds</p>
                  <p className="text-sm text-zinc-500">Notification quand un lead avec score &gt; 80 est détecté</p>
                </div>
                <input type="checkbox" defaultChecked className="h-5 w-5 rounded border-zinc-300 text-amber-600 focus:ring-amber-500" />
              </label>

              <label className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-900">Scan terminé</p>
                  <p className="text-sm text-zinc-500">Notification quand un scan est complété</p>
                </div>
                <input type="checkbox" defaultChecked className="h-5 w-5 rounded border-zinc-300 text-amber-600 focus:ring-amber-500" />
              </label>

              <label className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-900">Rappels de suivi</p>
                  <p className="text-sm text-zinc-500">Rappel pour les leads non contactés depuis 7 jours</p>
                </div>
                <input type="checkbox" className="h-5 w-5 rounded border-zinc-300 text-amber-600 focus:ring-amber-500" />
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Data management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Gestion des données
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline">
                <Download className="h-4 w-4" />
                Exporter les leads (CSV)
              </Button>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4" />
                Supprimer toutes les données
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card className="bg-zinc-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-zinc-900">LeadHunter</h3>
              <p className="text-sm text-zinc-500 mt-1">Version 1.0.0</p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

function ApiKeyRow({
  name,
  description,
  status,
  docsUrl,
  envVar,
}: {
  name: string
  description: string
  status: ApiKeyStatus
  docsUrl: string
  envVar: string
}) {
  return (
    <div className={`flex items-center justify-between p-4 rounded-lg border ${
      status.configured ? 'bg-emerald-50 border-emerald-200' : 'bg-zinc-50 border-zinc-200'
    }`}>
      <div className="flex items-center gap-3">
        {status.configured ? (
          <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
        ) : (
          <XCircle className="h-5 w-5 text-zinc-300 flex-shrink-0" />
        )}
        <div>
          <p className="font-medium text-zinc-900">{name}</p>
          <p className="text-sm text-zinc-500">
            {status.configured
              ? <span className="font-mono text-xs text-emerald-700">{status.preview}</span>
              : <span>{description} — ajoutez <code className="bg-zinc-100 px-1 rounded text-xs">{envVar}</code> dans .env.local</span>
            }
          </p>
        </div>
      </div>
      <a
        href={docsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-zinc-400 hover:text-amber-600 transition-colors ml-3"
        title="Documentation"
      >
        <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  )
}

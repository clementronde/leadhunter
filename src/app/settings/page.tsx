'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui'
import { usePlan } from '@/hooks/usePlan'
import { useAuth } from '@/components/auth/auth-provider'
import { supabase } from '@/lib/supabase'
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
  AlertTriangle,
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
  const { isAdmin } = useAuth()
  const [portalLoading, setPortalLoading] = useState(false)
  const [health, setHealth] = useState<HealthData | null>(null)
  const [exporting, setExporting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

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

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const { data } = await supabase
        .from('companies')
        .select('name, city, postal_code, phone, email, website, has_website, sector, status, priority, prospect_score, created_at')
        .order('prospect_score', { ascending: false })

      if (!data || data.length === 0) {
        alert('Aucun lead à exporter.')
        return
      }

      const headers = ['Nom', 'Ville', 'Code postal', 'Téléphone', 'Email', 'Site web', 'A un site', 'Secteur', 'Statut', 'Priorité', 'Score', 'Ajouté le']
      const rows = data.map(c => [
        c.name, c.city, c.postal_code, c.phone || '', c.email || '',
        c.website || '', c.has_website ? 'Oui' : 'Non',
        c.sector || '', c.status, c.priority, c.prospect_score,
        new Date(c.created_at).toLocaleDateString('fr-FR')
      ])

      const csvContent = [headers, ...rows]
        .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteAll = async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      const { error } = await supabase.from('companies').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) throw error
      setShowDeleteConfirm(false)
      router.push('/')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    } finally {
      setDeleting(false)
    }
  }

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
            <div className="flex items-center justify-between p-4 bg-zinc-800/40 rounded-xl border border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isPro ? 'bg-amber-500/20' : 'bg-zinc-700/60'}`}>
                  {isPro ? (
                    <Crown className="h-5 w-5 text-amber-500" />
                  ) : (
                    <Settings className="h-5 w-5 text-zinc-400" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-white">Plan {isPro ? 'Pro' : 'Gratuit'}</p>
                  <p className="text-sm text-zinc-500">
                    {isPro
                      ? 'Accès illimité à toutes les fonctionnalités'
                      : '3 scans / mois · Fonctionnalités limitées'}
                  </p>
                </div>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isPro ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white' : 'bg-zinc-700 text-zinc-400'}`}>
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

        {/* Database connection — admin only */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Base de données Supabase
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`flex items-center gap-3 p-4 rounded-xl border ${
                supabaseConfigured
                  ? 'bg-emerald-500/10 border-emerald-500/20'
                  : 'bg-red-500/10 border-red-500/20'
              }`}>
                {supabaseConfigured ? (
                  <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                )}
                <div>
                  <p className={`font-medium ${supabaseConfigured ? 'text-emerald-400' : 'text-red-400'}`}>
                    {supabaseConfigured ? 'Connecté à Supabase' : 'Supabase non configuré'}
                  </p>
                  <p className={`text-sm mt-0.5 ${supabaseConfigured ? 'text-emerald-500' : 'text-red-500'}`}>
                    {supabaseConfigured
                      ? `Projet : ${supabasePreview}.supabase.co`
                      : 'Ajoutez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local'}
                  </p>
                </div>
              </div>

              {!supabaseConfigured && (
                <div className="pt-2 border-t border-white/[0.06]">
                  <p className="text-sm text-zinc-400 mb-3"><strong>Instructions :</strong></p>
                  <ol className="text-sm text-zinc-500 space-y-2 list-decimal list-inside">
                    <li>
                      Créez un projet gratuit sur{' '}
                      <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline">
                        supabase.com <ExternalLink className="h-3 w-3 inline" />
                      </a>
                    </li>
                    <li>Copiez l'URL et la clé anon depuis Settings → API</li>
                    <li>Ajoutez-les dans votre <code className="bg-zinc-800 px-1 rounded">.env.local</code></li>
                    <li>Exécutez le schéma SQL (<code className="bg-zinc-800 px-1 rounded">supabase-schema.sql</code>)</li>
                  </ol>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* API Keys — admin only */}
        {isAdmin && (
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
        )}

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
                  <p className="font-medium text-zinc-200">Nouveaux leads chauds</p>
                  <p className="text-sm text-zinc-500">Notification quand un lead avec score &gt; 80 est détecté</p>
                </div>
                <input type="checkbox" defaultChecked className="h-5 w-5 rounded border-zinc-700 text-amber-500 focus:ring-amber-500 accent-amber-500" />
              </label>

              <label className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-200">Scan terminé</p>
                  <p className="text-sm text-zinc-500">Notification quand un scan est complété</p>
                </div>
                <input type="checkbox" defaultChecked className="h-5 w-5 rounded border-zinc-700 text-amber-500 focus:ring-amber-500 accent-amber-500" />
              </label>

              <label className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-200">Rappels de suivi</p>
                  <p className="text-sm text-zinc-500">Rappel pour les leads non contactés depuis 7 jours</p>
                </div>
                <input type="checkbox" className="h-5 w-5 rounded border-zinc-700 text-amber-500 focus:ring-amber-500 accent-amber-500" />
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
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleExportCSV} disabled={exporting}>
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {exporting ? 'Export...' : 'Exporter les leads (CSV)'}
              </Button>
              <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="h-4 w-4" />
                Supprimer toutes les données
              </Button>
            </div>

            {/* Confirmation modale */}
            {showDeleteConfirm && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-red-400">Supprimer toutes les données ?</p>
                    <p className="text-sm text-red-500 mt-1">
                      Cette action supprimera définitivement tous vos leads et ne peut pas être annulée.
                    </p>
                  </div>
                </div>
                {deleteError && <p className="text-sm text-red-400">{deleteError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteAll}
                    disabled={deleting}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
                  >
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    {deleting ? 'Suppression...' : 'Oui, tout supprimer'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 bg-zinc-800 text-zinc-300 text-sm font-medium rounded-lg border border-white/[0.08] hover:bg-zinc-700 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white">LeadHunter</h3>
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
    <div className={`flex items-center justify-between p-4 rounded-xl border ${
      status.configured ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-zinc-800/40 border-white/[0.06]'
    }`}>
      <div className="flex items-center gap-3">
        {status.configured ? (
          <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
        ) : (
          <XCircle className="h-5 w-5 text-zinc-600 flex-shrink-0" />
        )}
        <div>
          <p className="font-medium text-zinc-200">{name}</p>
          <p className="text-sm text-zinc-500">
            {status.configured
              ? <span className="font-mono text-xs text-emerald-400">{status.preview}</span>
              : <span>{description} — ajoutez <code className="bg-zinc-800 px-1 rounded text-xs">{envVar}</code> dans .env.local</span>
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

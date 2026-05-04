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
  Mail,
  RotateCcw,
} from 'lucide-react'
import { loadTemplates, saveTemplates, DEFAULT_TEMPLATES, CustomTemplate, TemplateId } from '@/lib/email-templates'
import { OutreachSettings } from '@/types'

interface ApiKeyStatus {
  configured: boolean
  preview: string | null
}

interface HealthData {
  keys: {
    GOOGLE_MAPS_API_KEY: ApiKeyStatus | boolean
    PAGESPEED_API_KEY: ApiKeyStatus | boolean
    INSEE_API_KEY: ApiKeyStatus | boolean
    HUNTER_API_KEY?: boolean
    RESEND_API_KEY?: boolean
    RESEND_WEBHOOK_SECRET?: boolean
    CRON_SECRET?: boolean
    SUPABASE_SERVICE_ROLE_KEY?: boolean
    STRIPE_SECRET_KEY?: boolean
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
  const [templates, setTemplates] = useState<Record<TemplateId, CustomTemplate>>(() => loadTemplates())
  const [templatesSaved, setTemplatesSaved] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<TemplateId>('sans-site')
  const [outreachSettings, setOutreachSettings] = useState<Partial<OutreachSettings>>({})
  const [savingOutreach, setSavingOutreach] = useState(false)
  const [outreachSaved, setOutreachSaved] = useState(false)
  const [outreachError, setOutreachError] = useState<string | null>(null)
  const [deliverability, setDeliverability] = useState<{
    domain: string
    checks: { mx: boolean; spf: boolean; dmarc: boolean; resend_hint: boolean }
  } | null>(null)
  const [checkingDeliverability, setCheckingDeliverability] = useState(false)

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

    fetch('/api/outreach/settings')
      .then((r) => r.json())
      .then((data) => setOutreachSettings(data.settings ?? {}))
      .catch(() => {})
  }, [])

  const handleSaveOutreach = async () => {
    setSavingOutreach(true)
    setOutreachError(null)
    try {
      const res = await fetch('/api/outreach/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(outreachSettings),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur sauvegarde')
      setOutreachSettings(data.settings)
      setOutreachSaved(true)
      setTimeout(() => setOutreachSaved(false), 2000)
    } catch (err) {
      setOutreachError(err instanceof Error ? err.message : 'Erreur sauvegarde')
    } finally {
      setSavingOutreach(false)
    }
  }

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
      const rows = data.map((c: Record<string, unknown>) => [
        c.name, c.city, c.postal_code, c.phone || '', c.email || '',
        c.website || '', c.has_website ? 'Oui' : 'Non',
        c.sector || '', c.status, c.priority, c.prospect_score,
        new Date(c.created_at as string).toLocaleDateString('fr-FR')
      ])

      const csvContent = [headers, ...rows]
        .map(row => row.map((v: unknown) => `"${String(v).replace(/"/g, '""')}"`).join(','))
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

  const handleCheckDeliverability = async () => {
    setCheckingDeliverability(true)
    try {
      const res = await fetch('/api/deliverability')
      const data = await res.json()
      setDeliverability(res.ok ? data : null)
    } finally {
      setCheckingDeliverability(false)
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Checklist email
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-zinc-500">
              Pour envoyer des emails depuis LeadHunter, suivez ces étapes :
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/70 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">1. Profil</p>
                <p className="mt-3 text-sm text-zinc-200">Renseignez un email expéditeur pro, un nom d'agence et une signature.</p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/70 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">2. Domaine</p>
                <p className="mt-3 text-sm text-zinc-200">Vérifiez MX, SPF, DMARC et la configuration Resend pour votre domaine.</p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/70 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">3. Templates</p>
                <p className="mt-3 text-sm text-zinc-200">Personnalisez vos modèles avant d'envoyer vos premiers emails.</p>
              </div>
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
                    <li>Copiez l&apos;URL et la clé anon depuis Settings → API</li>
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

        {/* Configuration assistant */}
        {isAdmin && health && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                Assistant de configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                <ConfigRow label="Google Places" ok={isKeyConfigured(health.keys.GOOGLE_MAPS_API_KEY)} envVar="GOOGLE_MAPS_API_KEY" />
                <ConfigRow label="Hunter email finder" ok={isKeyConfigured(health.keys.HUNTER_API_KEY)} envVar="HUNTER_API_KEY" />
                <ConfigRow label="Resend envoi email" ok={isKeyConfigured(health.keys.RESEND_API_KEY)} envVar="RESEND_API_KEY" />
                <ConfigRow label="Webhook Resend" ok={isKeyConfigured(health.keys.RESEND_WEBHOOK_SECRET)} envVar="RESEND_WEBHOOK_SECRET" optional />
                <ConfigRow label="Cron sécurisé" ok={isKeyConfigured(health.keys.CRON_SECRET)} envVar="CRON_SECRET" />
                <ConfigRow label="Supabase service role" ok={isKeyConfigured(health.keys.SUPABASE_SERVICE_ROLE_KEY)} envVar="SUPABASE_SERVICE_ROLE_KEY" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Outreach profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Profil d&apos;envoi professionnel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-zinc-500">
              Ces informations alimentent les variables <code className="bg-zinc-800 px-1 rounded text-xs text-amber-400">{'{agency_name}'}</code>, <code className="bg-zinc-800 px-1 rounded text-xs text-amber-400">{'{agency_website}'}</code>, <code className="bg-zinc-800 px-1 rounded text-xs text-amber-400">{'{sender_name}'}</code> et <code className="bg-zinc-800 px-1 rounded text-xs text-amber-400">{'{signature}'}</code>.
            </p>

            <div className="grid gap-3 md:grid-cols-2">
              <OutreachInput
                label="Nom expéditeur"
                value={outreachSettings.sender_name}
                placeholder="Ex: Clément"
                onChange={(value) => setOutreachSettings((s) => ({ ...s, sender_name: value }))}
              />
              <OutreachInput
                label="Email pro d'expédition"
                value={outreachSettings.sender_email}
                placeholder="bonjour@agence.fr"
                type="email"
                onChange={(value) => setOutreachSettings((s) => ({ ...s, sender_email: value }))}
              />
              <OutreachInput
                label="Nom de l'agence"
                value={outreachSettings.agency_name}
                placeholder="Artichaud Studio"
                onChange={(value) => setOutreachSettings((s) => ({ ...s, agency_name: value }))}
              />
              <OutreachInput
                label="Site web agence"
                value={outreachSettings.agency_website}
                placeholder="https://agence.fr"
                type="url"
                onChange={(value) => setOutreachSettings((s) => ({ ...s, agency_website: value }))}
              />
              <OutreachInput
                label="Téléphone"
                value={outreachSettings.agency_phone}
                placeholder="+33 6 00 00 00 00"
                onChange={(value) => setOutreachSettings((s) => ({ ...s, agency_phone: value }))}
              />
              <OutreachInput
                label="Reply-to"
                value={outreachSettings.reply_to}
                placeholder="reponses@agence.fr"
                type="email"
                onChange={(value) => setOutreachSettings((s) => ({ ...s, reply_to: value }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500">Signature</label>
              <textarea
                value={outreachSettings.signature ?? ''}
                onChange={(e) => setOutreachSettings((s) => ({ ...s, signature: e.target.value }))}
                rows={5}
                placeholder={'Clément\nArtichaud Studio\nhttps://agence.fr'}
                className="w-full px-3 py-2 text-sm text-zinc-200 bg-zinc-900/60 border border-white/[0.08] rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              />
            </div>

            {outreachError && <p className="text-sm text-red-400">{outreachError}</p>}

            <Button onClick={handleSaveOutreach} disabled={savingOutreach}>
              {savingOutreach ? <Loader2 className="h-4 w-4 animate-spin" /> : outreachSaved ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : null}
              {savingOutreach ? 'Sauvegarde...' : outreachSaved ? 'Profil sauvegardé !' : 'Sauvegarder le profil'}
            </Button>

            <div className="rounded-xl border border-white/[0.06] bg-zinc-800/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-zinc-200">Délivrabilité domaine</p>
                  <p className="text-sm text-zinc-500">Vérifie MX, SPF, DMARC et indice Resend.</p>
                </div>
                <Button variant="outline" onClick={handleCheckDeliverability} disabled={checkingDeliverability}>
                  {checkingDeliverability ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Vérifier
                </Button>
              </div>
              {deliverability && (
                <div className="mt-4 grid gap-2 sm:grid-cols-4">
                  <ConfigRow label="MX" ok={deliverability.checks.mx} envVar={deliverability.domain} />
                  <ConfigRow label="SPF" ok={deliverability.checks.spf} envVar="TXT v=spf1" />
                  <ConfigRow label="DMARC" ok={deliverability.checks.dmarc} envVar="_dmarc" />
                  <ConfigRow label="Resend" ok={deliverability.checks.resend_hint} envVar="DKIM/TXT" optional />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Email Templates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Templates email
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-zinc-500">
              Personnalisez vos modèles d&apos;email. Utilisez <code className="bg-zinc-800 px-1 rounded text-xs text-amber-400">{'{name}'}</code> pour le nom de l&apos;établissement et <code className="bg-zinc-800 px-1 rounded text-xs text-amber-400">{'{website}'}</code> pour l&apos;URL du site.
            </p>

            {/* Template selector tabs */}
            <div className="flex gap-2 flex-wrap">
              {(Object.entries(templates) as [TemplateId, CustomTemplate][]).map(([id, t]) => (
                <button
                  key={id}
                  onClick={() => setEditingTemplate(id)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors border ${
                    editingTemplate === id
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-zinc-800/60 text-zinc-400 border-white/[0.08] hover:text-zinc-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Template editor */}
            <div className="space-y-3 p-4 bg-zinc-800/40 border border-white/[0.06] rounded-xl">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500">Libellé du template</label>
                <input
                  type="text"
                  value={templates[editingTemplate].label}
                  onChange={(e) => {
                    const updated = { ...templates, [editingTemplate]: { ...templates[editingTemplate], label: e.target.value } }
                    setTemplates(updated)
                    setTemplatesSaved(false)
                  }}
                  className="w-full px-3 py-2 text-sm text-zinc-200 bg-zinc-900/60 border border-white/[0.08] rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500">Objet de l&apos;email</label>
                <input
                  type="text"
                  value={templates[editingTemplate].subject}
                  onChange={(e) => {
                    const updated = { ...templates, [editingTemplate]: { ...templates[editingTemplate], subject: e.target.value } }
                    setTemplates(updated)
                    setTemplatesSaved(false)
                  }}
                  className="w-full px-3 py-2 text-sm text-zinc-200 bg-zinc-900/60 border border-white/[0.08] rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500">Corps du message</label>
                <textarea
                  value={templates[editingTemplate].body}
                  onChange={(e) => {
                    const updated = { ...templates, [editingTemplate]: { ...templates[editingTemplate], body: e.target.value } }
                    setTemplates(updated)
                    setTemplatesSaved(false)
                  }}
                  rows={8}
                  className="w-full px-3 py-2 text-sm text-zinc-200 bg-zinc-900/60 border border-white/[0.08] rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none font-mono leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => {
                  saveTemplates(templates)
                  setTemplatesSaved(true)
                  setTimeout(() => setTemplatesSaved(false), 2000)
                }}
              >
                {templatesSaved ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : null}
                {templatesSaved ? 'Sauvegardé !' : 'Sauvegarder les templates'}
              </Button>
              <button
                onClick={() => {
                  setTemplates(DEFAULT_TEMPLATES)
                  setTemplatesSaved(false)
                }}
                className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                Réinitialiser
              </button>
            </div>
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
  status: ApiKeyStatus | boolean
  docsUrl: string
  envVar: string
}) {
  const configured = isKeyConfigured(status)
  const preview = typeof status === 'object' ? status.preview : null

  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border ${
      configured ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-zinc-800/40 border-white/[0.06]'
    }`}>
      <div className="flex items-center gap-3">
        {configured ? (
          <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
        ) : (
          <XCircle className="h-5 w-5 text-zinc-600 flex-shrink-0" />
        )}
        <div>
          <p className="font-medium text-zinc-200">{name}</p>
          <p className="text-sm text-zinc-500">
            {configured
              ? <span className="font-mono text-xs text-emerald-400">{preview ?? 'Configuré'}</span>
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

function ConfigRow({
  label,
  ok,
  envVar,
  optional,
}: {
  label: string
  ok: boolean
  envVar: string
  optional?: boolean
}) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
      ok
        ? 'border-emerald-500/20 bg-emerald-500/10'
        : optional
        ? 'border-amber-500/20 bg-amber-500/10'
        : 'border-red-500/20 bg-red-500/10'
    }`}>
      {ok ? (
        <CheckCircle className="h-4 w-4 text-emerald-400" />
      ) : (
        <XCircle className={`h-4 w-4 ${optional ? 'text-amber-400' : 'text-red-400'}`} />
      )}
      <div>
        <p className="text-sm font-medium text-zinc-200">{label}</p>
        <p className="text-xs text-zinc-500">
          {ok ? 'OK' : optional ? 'Optionnel' : 'Manquant'} · <code className="text-zinc-400">{envVar}</code>
        </p>
      </div>
    </div>
  )
}

function isKeyConfigured(status: ApiKeyStatus | boolean | undefined): boolean {
  if (typeof status === 'boolean') return status
  return !!status?.configured
}

function OutreachInput({
  label,
  value,
  placeholder,
  type = 'text',
  onChange,
}: {
  label: string
  value?: string | null
  placeholder?: string
  type?: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-zinc-500">{label}</label>
      <input
        type={type}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm text-zinc-200 bg-zinc-900/60 border border-white/[0.08] rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
      />
    </div>
  )
}

'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Select,
  Badge,
  UpgradeModal,
  CityAutocomplete,
} from '@/components/ui'
import { usePlan, FREE_SCAN_LIMIT, FREE_RESULTS_LIMIT } from '@/hooks/usePlan'
import { Sector, SearchScan, Company } from '@/types'
import { scannerApi } from '@/lib/api'
import {
  MapPin,
  Search,
  Play,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Building2,
  Globe,
  Wrench,
  History,
  AlertTriangle,
  ArrowRight,
  Map,
  Database,
  KeyRound,
  Lock,
} from 'lucide-react'

// ============================================
// Types locaux
// ============================================

type ScanSource = 'insee' | 'google_maps'

interface ScanResult {
  total_found: number
  processed: number
  without_site: number
  needing_refonte: number
  companies: (Company & {
    google_place_id?: string
    google_maps_url?: string
    rating?: number | null
  })[]
  // Spécifique Google Maps
  with_site?: number
  audited?: number
  skipped?: number
}

// ============================================
// Composant principal
// ============================================

// ============================================
// Statut des clés API (via /api/health)
// ============================================

interface ApiKeyStatus {
  configured: boolean
  preview: string | null
}

interface HealthStatus {
  keys: {
    GOOGLE_MAPS_API_KEY: ApiKeyStatus
    PAGESPEED_API_KEY: ApiKeyStatus
    INSEE_API_KEY: ApiKeyStatus
  }
}

function ScannerContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isPro, isAdmin, scanCountThisMonth, canScan, canAudit } = usePlan()
  const [upgradeModal, setUpgradeModal] = useState<'scan_limit' | 'export' | 'audit' | null>(null)
  const [activeSource, setActiveSource] = useState<ScanSource>('google_maps')
  const [health, setHealth] = useState<HealthStatus | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => {/* silencieux si health indispo */})
  }, [])

  // État du scan
  const [isScanning, setIsScanning] = useState(false)
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'completed' | 'error'>('idle')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [scans, setScans] = useState<SearchScan[]>([])

  // Phase 2 : audits Speed Insights côté client
  const [auditPhase, setAuditPhase] = useState(false)
  const [auditProgress, setAuditProgress] = useState({ current: 0, total: 0 })

  // Load scan history from Supabase on mount
  useEffect(() => {
    scannerApi.getAll().then(setScans).catch(console.error)
  }, [])

  // Champs communs (pré-remplis depuis URL params si présents)
  const [location, setLocation] = useState(() => searchParams.get('location') || '')

  // Champs INSEE
  const [codePostal, setCodePostal] = useState('')
  const [activite, setActivite] = useState('')
  const [nombreResultats, setNombreResultats] = useState('50')

  // Champs Google Maps
  const [gmQuery, setGmQuery] = useState(() => searchParams.get('query') || '')
  const [gmMaxResults, setGmMaxResults] = useState('20')
  const [gmAuditWebsites, setGmAuditWebsites] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const suggestionRef = useRef<HTMLDivElement>(null)

  const BUSINESS_TYPES = [
    'Restaurants', 'Pizzerias', 'Boulangeries', 'Pâtisseries', 'Bouchers', 'Traiteurs', 'Bars', 'Cafés',
    'Coiffeurs', 'Salons de beauté', 'Instituts de beauté', 'Tatoueurs', 'Ongleries',
    'Plombiers', 'Électriciens', 'Maçons', 'Carreleurs', 'Peintres', 'Menuisiers', 'Charpentiers',
    'Couvreurs', 'Chauffagistes', 'Climaticiens', 'Serruriers', 'Vitriers', 'Plâtriers',
    'Jardiniers', 'Paysagistes', 'Piscinistes',
    'Médecins', 'Dentistes', 'Vétérinaires', 'Kinésithérapeutes', 'Opticiens', 'Pharmacies',
    'Architectes', 'Comptables', 'Avocats', 'Notaires',
    'Agences immobilières', 'Garages auto', 'Carrosseries', 'Auto-écoles',
    'Photographes', 'Hôtels', 'Campings', 'Salles de sport',
  ]

  const filteredTypes = gmQuery.length > 0
    ? BUSINESS_TYPES.filter((t) => t.toLowerCase().includes(gmQuery.toLowerCase()))
    : BUSINESS_TYPES

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // ============================================
  // Options de formulaire
  // ============================================

  const nombreOptions = [
    { value: '20', label: '20 entreprises' },
    { value: '50', label: '50 entreprises' },
    { value: '100', label: '100 entreprises' },
    { value: '200', label: '200 entreprises' },
  ]

  const hasFullAccess = isPro || isAdmin
  const gmMaxOptions = hasFullAccess
    ? [
        { value: '10', label: '10 lieux' },
        { value: '20', label: '20 lieux' },
        { value: '40', label: '40 lieux' },
        { value: '60', label: '60 lieux (max)' },
      ]
    : [{ value: String(FREE_RESULTS_LIMIT), label: `${FREE_RESULTS_LIMIT} lieux (plan gratuit)` }]

  // ============================================
  // Handlers
  // ============================================

  const hasFormInput =
    activeSource === 'insee'
      ? !!(location.trim() || codePostal.trim())
      : !!(gmQuery.trim() && location.trim())

  const canStartScan = hasFormInput && !isScanning

  const handleStartScan = async () => {
    if (!canStartScan) return
    if (!canScan) {
      setUpgradeModal('scan_limit')
      return
    }

    setIsScanning(true)
    setScanStatus('scanning')
    setErrorMessage(null)
    setScanResult(null)

    const queryLabel =
      activeSource === 'google_maps'
        ? `${gmQuery} - ${location}`
        : `${activite || 'Entreprises'} - ${location || codePostal}`

    const newScan: SearchScan = {
      id: `scan-${Date.now()}`,
      query: queryLabel,
      location: { lat: 0, lng: 0, radius: 0 },
      sector_filter: null as Sector | null,
      status: 'running',
      progress: 0,
      companies_found: 0,
      companies_without_site: 0,
      companies_needing_refonte: 0,
      started_at: new Date().toISOString(),
      completed_at: null,
      error_message: null,
    }
    setScans((prev) => [newScan, ...prev])

    try {
      let response: Response

      if (activeSource === 'google_maps') {
        // Scan Google Maps
        response = await fetch('/api/google-maps-scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: gmQuery.trim(),
            location: location.trim(),
            maxResults: parseInt(gmMaxResults),
          }),
        })
      } else {
        // Scan INSEE
        response = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            commune: location.trim() || undefined,
            codePostal: codePostal.trim() || undefined,
            activite: activite.trim() || undefined,
            nombreResultats: parseInt(nombreResultats),
          }),
        })
      }

      const text = await response.text()
      let data: Record<string, unknown>
      try {
        data = JSON.parse(text)
      } catch {
        if (response.status === 504) {
          throw new Error('Le scan a dépassé le délai imparti — essayez avec moins de résultats ou réessayez')
        }
        throw new Error(`Erreur serveur inattendue (${response.status})`)
      }

      if (!response.ok) {
        if (data.code === 'SCAN_LIMIT_REACHED') {
          setUpgradeModal('scan_limit')
          setIsScanning(false)
          setScanStatus('idle')
          setScans((prev) => prev.filter((s) => s.id !== newScan.id))
          return
        }
        const detail = data.details ? ` — ${data.details}` : ''
        throw new Error((data.error as string || 'Erreur lors du scan') + detail)
      }

      const scanData = data.data as ScanResult
      setScanResult(scanData)
      setScanStatus('completed')

      // Phase 2 : ajouter les audits Speed Insights à la queue serveur
      if (gmAuditWebsites && activeSource === 'google_maps') {
        queueAuditPhase(scanData.companies)
      }
      const completedScan: SearchScan = {
        ...newScan,
        status: 'completed',
        progress: 100,
        companies_found: scanData.processed,
        companies_without_site: scanData.without_site,
        companies_needing_refonte: 0,
        completed_at: new Date().toISOString(),
      }
      setScans((prev) => prev.map((s) => (s.id === newScan.id ? completedScan : s)))
    } catch (error) {
      console.error('Scan error:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Erreur inconnue')
      setScanStatus('error')

      setScans((prev) =>
        prev.map((s) =>
          s.id === newScan.id
            ? {
                ...s,
                status: 'failed' as const,
                error_message: error instanceof Error ? error.message : 'Erreur',
              }
            : s
        )
      )
    } finally {
      setIsScanning(false)
    }
  }

  const handleViewResults = () => {
    router.push('/leads')
  }

  // Phase 2 : audits Speed Insights en queue serveur
  const queueAuditPhase = async (companies: ScanResult['companies']) => {
    const MAX_AUDITS = isPro ? 10 : 5
    const toAudit = companies.filter((c) => c.website && c.id).slice(0, MAX_AUDITS)
    if (toAudit.length === 0) return

    setAuditPhase(true)
    setAuditProgress({ current: 0, total: toAudit.length })

    try {
      const res = await fetch('/api/audit/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyIds: toAudit.map((company) => company.id) }),
      })
      if (res.ok) setAuditProgress({ current: toAudit.length, total: toAudit.length })
    } catch (e) {
      console.warn('Queue audit échouée', e)
    } finally {
      setAuditPhase(false)
    }
  }

  // ============================================
  // Rendu
  // ============================================

  return (
    <div className="min-h-screen">
      <Header
        title="Scanner"
        subtitle="Un métier et une ville : LeadHunter trouve les entreprises et vérifie leur présence web"
      />

      <div className="mx-auto max-w-[1100px] space-y-5 p-4 md:p-6">

        {/* Bandeau de statut des clés API */}
        {health && !health.keys.GOOGLE_MAPS_API_KEY.configured && (
          <div role="alert" className="flex items-start gap-3 rounded-lg border border-red-500/25 bg-red-500/10 p-4 text-[13px] text-red-300">
            <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Clé API Google Maps manquante ou invalide</p>
              <p className="mt-1 text-red-300/80">
                Ajoutez <code className="rounded bg-red-500/15 px-1 font-mono">GOOGLE_MAPS_API_KEY</code> dans{' '}
                <code className="rounded bg-red-500/15 px-1 font-mono">.env.local</code>, puis redémarrez le serveur.
              </p>
            </div>
          </div>
        )}

        {/* Free user scan counter */}
        {!isPro && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
            <span className={!canScan ? 'text-red-300' : 'text-zinc-400'}>
              <span className="font-mono tabular-nums">{scanCountThisMonth} / {FREE_SCAN_LIMIT}</span> scans gratuits utilisés ce mois-ci
            </span>
            <div className="h-1 w-32 overflow-hidden rounded-full bg-zinc-800" aria-hidden>
              <div
                className={`h-full rounded-full ${!canScan ? 'bg-red-400' : 'bg-zinc-400'}`}
                style={{ width: `${Math.min((scanCountThisMonth / FREE_SCAN_LIMIT) * 100, 100)}%` }}
              />
            </div>
            <button
              onClick={() => setUpgradeModal('scan_limit')}
              className="text-zinc-300 underline decoration-zinc-600 underline-offset-4 hover:decoration-zinc-300"
            >
              Scans illimités avec Pro
            </button>
          </div>
        )}

        {/* Sélecteur de source */}
        <div role="tablist" aria-label="Source des données" className="inline-flex rounded-lg border border-hairline bg-surface-1 p-0.5">
          {([
            { id: 'google_maps', label: 'Google Maps', hint: 'Recommandé', icon: Map },
            { id: 'insee', label: 'INSEE / Sirene', hint: null, icon: Database },
          ] as const).map(({ id, label, hint, icon: Icon }) => {
            const active = activeSource === id
            return (
              <button
                key={id}
                role="tab"
                aria-selected={active}
                onClick={() => { setActiveSource(id); setScanStatus('idle') }}
                className={`inline-flex h-8 items-center gap-2 rounded-md px-3 text-[13px] font-medium transition-colors ${
                  active ? 'bg-surface-3 text-white shadow-[inset_0_0_0_1px_#34343a]' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-amber-400' : 'text-zinc-500'}`} />
                {label}
                {hint && <span className="text-[11px] font-normal text-zinc-500">{hint}</span>}
              </button>
            )
          })}
        </div>

        {/* Formulaire de recherche */}
        <Card>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (canStartScan && canScan) handleStartScan()
            }}
          >
          <CardContent className="pt-5">
            {activeSource === 'google_maps' ? (
              /* ── Formulaire Google Maps ── */
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2" ref={suggestionRef}>
                    <label htmlFor="gm-query" className="text-[13px] text-zinc-400">
                      Activité
                    </label>
                    <div className="relative">
                      <Input
                        id="gm-query"
                        autoFocus
                        autoComplete="off"
                        placeholder="Plombiers, coiffeurs, restaurants…"
                        value={gmQuery}
                        onChange={(e) => { setGmQuery(e.target.value); setShowSuggestions(true) }}
                        onFocus={() => setShowSuggestions(true)}
                        icon={<Search className="h-4 w-4" />}
                      />
                      {showSuggestions && filteredTypes.length > 0 && (
                        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-lg border border-hairline-strong bg-surface-2 py-1 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.7)]">
                          {filteredTypes.map((type) => (
                            <button
                              key={type}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                setGmQuery(type)
                                setShowSuggestions(false)
                              }}
                              className="w-full px-3 py-1.5 text-left text-[13px] text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white"
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[13px] text-zinc-400">
                      Ville ou quartier
                    </label>
                    <CityAutocomplete
                      placeholder="Lyon, Paris 15e, Boulogne-Billancourt…"
                      value={location}
                      onChange={setLocation}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[13px] text-zinc-400">
                      Nombre de résultats
                    </label>
                    <Select
                      options={gmMaxOptions}
                      value={gmMaxResults}
                      onChange={(e) => setGmMaxResults(e.target.value)}
                    />
                  </div>
                </div>

                {/* Option audit PageSpeed */}
                <div className="flex items-start gap-3 rounded-lg border border-hairline bg-surface-2 p-3.5">
                  <input
                    type="checkbox"
                    id="audit-websites"
                    checked={canAudit && gmAuditWebsites}
                    disabled={!canAudit}
                    onChange={(e) => {
                      if (!canAudit) {
                        setUpgradeModal('audit')
                        return
                      }
                      setGmAuditWebsites(e.target.checked)
                    }}
                    className="mt-0.5 h-4 w-4 rounded accent-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="audit-websites"
                      className={`flex cursor-pointer items-center gap-1.5 text-[13px] font-medium ${canAudit ? 'text-zinc-100' : 'text-zinc-400'}`}
                      onClick={() => { if (!canAudit) setUpgradeModal('audit') }}
                    >
                      Auditer les sites trouvés (Core Web Vitals)
                      {!canAudit && (
                        <span className="ml-1 rounded-md border border-amber-500/30 px-1.5 py-px text-[11px] font-medium text-amber-300">
                          Pro
                        </span>
                      )}
                    </label>
                    <p className="mt-0.5 text-[12px] text-zinc-500">
                      Mesure chaque site avec PageSpeed Insights. Le scan est plus long, mais repère
                      précisément les sites lents ou datés à refaire.
                    </p>
                  </div>
                </div>

                <p className="text-[12px] leading-relaxed text-zinc-500">
                  Les entreprises sans site, ou présentes seulement sur Facebook ou un annuaire, ressortent
                  en tête. Celles dont le site est lent ou daté sont proposées pour une refonte.
                </p>
              </div>
            ) : (
              /* ── Formulaire INSEE ── */
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <label className="text-[13px] text-zinc-400">Ville</label>
                    <CityAutocomplete
                      placeholder="Ex: Boulogne-Billancourt"
                      value={location}
                      onChange={setLocation}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[13px] text-zinc-400">ou Code postal</label>
                    <Input
                      placeholder="Ex: 92100"
                      value={codePostal}
                      onChange={(e) => setCodePostal(e.target.value)}
                      icon={<MapPin className="h-4 w-4" />}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[13px] text-zinc-400">Activité (optionnel)</label>
                    <Input
                      placeholder="Ex: restaurant, coiffure..."
                      value={activite}
                      onChange={(e) => setActivite(e.target.value)}
                      icon={<Search className="h-4 w-4" />}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[13px] text-zinc-400">Nombre max</label>
                    <Select
                      options={nombreOptions}
                      value={nombreResultats}
                      onChange={(e) => setNombreResultats(e.target.value)}
                    />
                  </div>
                </div>

                <div className="text-[12px] leading-relaxed text-zinc-500">
                  <strong className="font-medium text-zinc-300">INSEE Sirene :</strong> Recherche dans le registre officiel des
                  entreprises françaises. Très exhaustif mais les coordonnées téléphoniques et sites
                  web ne sont pas toujours disponibles. Renseignez au moins la ville ou le code
                  postal.
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-hairline pt-4">
              {!canScan && (
                <p className="text-[13px] text-zinc-400">
                  Limite gratuite atteinte.{' '}
                  <button type="button" onClick={() => setUpgradeModal('scan_limit')} className="text-zinc-200 underline underline-offset-4">Passer à Pro</button>
                </p>
              )}
              <Button
                type="submit"
                disabled={!canStartScan || (!canScan && !isScanning)}
                loading={isScanning}
                className="min-w-[160px]"
              >
                {!canScan ? <Lock className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isScanning ? 'Scan en cours…' : !canScan ? 'Limite atteinte' : 'Lancer le scan'}
              </Button>
            </div>
          </CardContent>
          </form>
        </Card>

        {/* Scan en cours */}
        {scanStatus === 'scanning' && (
          <Card role="status" aria-live="polite">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-400" />
                <div className="flex-1">
                  <h3 className="text-[14px] font-medium text-white">Recherche en cours…</h3>
                  <p className="text-[13px] text-zinc-500">
                    {activeSource === 'google_maps'
                      ? gmAuditWebsites
                        ? 'Google Maps, puis audit PageSpeed des sites trouvés…'
                        : 'Google Maps, puis vérification des sites web…'
                      : 'Registre Sirene, puis vérification des sites web…'}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[12px] text-zinc-500">
                {gmAuditWebsites && activeSource === 'google_maps'
                  ? 'Avec l’audit activé, comptez plusieurs minutes. Vous pouvez rester sur cette page.'
                  : 'Comptez de quelques secondes à une minute.'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Erreur */}
        {scanStatus === 'error' && errorMessage && (
          <Card role="alert" className="border-red-500/30">
            <CardContent className="pt-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <div className="flex-1">
                  <h3 className="text-[14px] font-medium text-white">Le scan n&apos;a pas abouti</h3>
                  <p className="text-[13px] text-red-300">{errorMessage}</p>
                </div>
              </div>

              {/* Messages d'aide contextuels — uniquement si erreur de config */}
              {activeSource === 'google_maps' && errorMessage && (errorMessage.toLowerCase().includes('api') || errorMessage.toLowerCase().includes('clé') || errorMessage.toLowerCase().includes('key') || errorMessage.toLowerCase().includes('configuré')) && (
                <div className="mt-4 p-3 bg-red-500/10 rounded-lg text-sm">
                  <strong>Configuration requise :</strong> Ajoutez votre clé API Google Maps dans{' '}
                  <code>.env.local</code> :
                  <pre className="mt-2 text-xs bg-red-500/20 p-2 rounded">
                    {`GOOGLE_MAPS_API_KEY=votre_cle_api_google`}
                  </pre>
                  <p className="mt-2 text-xs text-red-300">
                    Assurez-vous que <strong>Places API (New)</strong> est activée dans Google Cloud Console.
                  </p>
                </div>
              )}
              {activeSource === 'insee' && errorMessage && errorMessage.toLowerCase().includes('insee') && (
                <div className="mt-4 p-3 bg-red-500/10 rounded-lg text-sm">
                  <strong>Configuration requise :</strong> Ajoutez vos credentials INSEE dans{' '}
                  <code>.env.local</code> :
                  <pre className="mt-2 text-xs bg-red-500/20 p-2 rounded">
                    {`INSEE_API_KEY=votre_token`}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Résultats */}
        {scanStatus === 'completed' && scanResult && (
          <Card>
            <CardContent className="pt-5">
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-medium text-white">Scan terminé</h3>
                  <p className="text-[13px] text-zinc-500">
                    {activeSource === 'google_maps'
                      ? `${scanResult.total_found} entreprises trouvées via Google Maps${scanResult.skipped ? ` · ${scanResult.skipped} déjà dans votre CRM` : ''}`
                      : `${scanResult.total_found} entreprises trouvées dans la base SIRENE`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleViewResults}>
                    Voir la liste
                  </Button>
                  <Button onClick={() => router.push('/triage')}>
                    Trier les nouveaux leads
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Statistiques */}
              {(() => {
                const needingRefonte = scanResult.companies.filter(
                  (c) => c.has_website && c.priority === 'hot'
                ).length
                const auditedCount = scanResult.companies.filter(
                  (c) => c.has_website && c.priority !== 'warm'
                ).length
                return (
                  <dl className={`grid divide-hairline overflow-hidden rounded-lg border border-hairline ${activeSource === 'google_maps' ? 'grid-cols-2 md:grid-cols-4 md:divide-x' : 'grid-cols-3 divide-x'}`}>
                    {[
                      { label: 'Entreprises traitées', value: scanResult.processed, tone: 'text-white', show: true },
                      { label: 'Sans site web', value: scanResult.without_site, tone: 'text-red-300', show: true },
                      { label: 'Site à refaire', value: needingRefonte, tone: 'text-amber-300', show: true },
                      { label: 'Sites audités', value: auditedCount, tone: 'text-zinc-200', show: activeSource === 'google_maps' },
                    ].filter((x) => x.show).map((stat) => (
                      <div key={stat.label} className="bg-surface-2 px-4 py-3">
                        <dt className="text-[12px] text-zinc-500">{stat.label}</dt>
                        <dd className={`mt-0.5 font-mono text-[22px] tabular-nums ${stat.tone}`}>{stat.value}</dd>
                      </div>
                    ))}
                  </dl>
                )
              })()}

              {/* Bannière progression audit Phase 2 */}
              {auditPhase && (
                <div className="mt-4 rounded-lg border border-hairline bg-surface-2 p-3.5">
                  <div className="flex items-center gap-3 mb-2">
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-zinc-400" />
                    <p className="text-[13px] text-zinc-200">
                      Mise en file des audits… <span className="font-mono tabular-nums text-zinc-400">{auditProgress.current}/{auditProgress.total}</span>
                    </p>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full bg-zinc-300 transition-[width] duration-700 ease-out"
                      style={{ width: `${auditProgress.total > 0 ? (auditProgress.current / auditProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[12px] text-zinc-500">
                    Les audits continuent côté serveur : vous pouvez quitter cette page.
                  </p>
                </div>
              )}

              {/* Top résultats */}
              {scanResult.companies.length > 0 && (
                <div className="mt-6">
                  <h4 className="mb-2 text-[13px] text-zinc-500">Meilleurs prospects de ce scan</h4>
                  <div className="divide-y divide-hairline/70 overflow-hidden rounded-lg border border-hairline">
                    {scanResult.companies
                      .sort((a, b) => b.prospect_score - a.prospect_score)
                      .slice(0, 5)
                      .map((company, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 bg-surface-2 px-3 py-2.5"
                        >
                          <div
                            className={`w-8 text-right font-mono text-[14px] tabular-nums ${
                              company.priority === 'hot'
                                ? 'text-red-300'
                                : company.priority === 'warm'
                                ? 'text-amber-300'
                                : 'text-sky-300'
                            }`}
                          >
                            {company.prospect_score}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white text-sm truncate">
                              {company.name}
                            </p>
                            <p className="text-xs text-zinc-500 truncate">
                              {company.city} {company.postal_code}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {!company.has_website ? (
                              <Badge variant="destructive">Pas de site</Badge>
                            ) : (
                              <Badge variant="secondary">À refaire</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Upgrade Modal */}
        {upgradeModal && (
          <UpgradeModal
            open={!!upgradeModal}
            onClose={() => setUpgradeModal(null)}
            reason={upgradeModal}
          />
        )}

        {/* Historique des scans */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historique des scans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scans.length === 0 ? (
                <p className="text-center text-zinc-500 py-8">
                  Aucun scan effectué pour le moment
                </p>
              ) : (
                scans.map((scan) => (
                  <div
                    key={scan.id}
                    className="flex items-center gap-4 p-4 bg-surface-2 rounded-lg border border-white/[0.04]"
                  >
                    <div
                      className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        scan.status === 'completed'
                          ? 'bg-emerald-500/20'
                          : scan.status === 'running'
                          ? 'bg-amber-500/20'
                          : scan.status === 'failed'
                          ? 'bg-red-500/20'
                          : 'bg-zinc-700'
                      }`}
                    >
                      {scan.status === 'completed' && (
                        <CheckCircle className="h-5 w-5 text-emerald-400" />
                      )}
                      {scan.status === 'running' && (
                        <Loader2 className="h-5 w-5 text-amber-400 animate-spin" />
                      )}
                      {scan.status === 'failed' && (
                        <XCircle className="h-5 w-5 text-red-400" />
                      )}
                      {scan.status === 'pending' && (
                        <Clock className="h-5 w-5 text-zinc-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{scan.query}</p>
                      <p className="text-sm text-zinc-500">
                        {new Date(scan.started_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    {scan.status === 'completed' && (
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-1 text-zinc-600">
                          <Building2 className="h-4 w-4" />
                          <span className="font-semibold">{scan.companies_found}</span>
                        </div>
                        <div className="flex items-center gap-1 text-red-400">
                          <Globe className="h-4 w-4" />
                          <span className="font-semibold">{scan.companies_without_site}</span>
                        </div>
                        <div className="flex items-center gap-1 text-amber-400">
                          <Wrench className="h-4 w-4" />
                          <span className="font-semibold">{scan.companies_needing_refonte}</span>
                        </div>
                      </div>
                    )}

                    <Badge
                      variant={
                        scan.status === 'completed'
                          ? 'success'
                          : scan.status === 'running'
                          ? 'warning'
                          : scan.status === 'failed'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {scan.status === 'completed' && 'Terminé'}
                      {scan.status === 'running' && 'En cours'}
                      {scan.status === 'failed' && 'Échoué'}
                      {scan.status === 'pending' && 'En attente'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ScannerPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-canvas">
        <div className="h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ScannerContent />
    </Suspense>
  )
}

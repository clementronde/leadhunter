'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
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
} from '@/components/ui'
import { usePlan, FREE_SCAN_LIMIT, FREE_RESULTS_LIMIT } from '@/hooks/usePlan'
import { Sector, SearchScan, Company } from '@/types'
import { scannerApi } from '@/lib/api'
import {
  Radar,
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
  Zap,
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

export default function ScannerPage() {
  const router = useRouter()
  const { isPro, scanCountThisMonth, canScan, canAudit } = usePlan()
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

  // Load scan history from Supabase on mount
  useEffect(() => {
    scannerApi.getAll().then(setScans).catch(console.error)
  }, [])

  // Champs communs
  const [location, setLocation] = useState('')

  // Champs INSEE
  const [codePostal, setCodePostal] = useState('')
  const [activite, setActivite] = useState('')
  const [nombreResultats, setNombreResultats] = useState('50')

  // Champs Google Maps
  const [gmQuery, setGmQuery] = useState('')
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

  const gmMaxOptions = isPro
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
            auditWebsites: gmAuditWebsites,
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

      const data = await response.json()

      if (!response.ok) {
        if (data.code === 'SCAN_LIMIT_REACHED') {
          setUpgradeModal('scan_limit')
          setIsScanning(false)
          setScanStatus('idle')
          setScans((prev) => prev.filter((s) => s.id !== newScan.id))
          return
        }
        throw new Error(data.error || 'Erreur lors du scan')
      }

      setScanResult(data.data)
      setScanStatus('completed')

      const completedScan: SearchScan = {
        ...newScan,
        status: 'completed',
        progress: 100,
        companies_found: data.data.processed,
        companies_without_site: data.data.without_site,
        companies_needing_refonte: data.data.needing_refonte,
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

  // ============================================
  // Rendu
  // ============================================

  return (
    <div className="min-h-screen">
      <Header
        title="Scanner"
        subtitle="Recherchez des entreprises locales et analysez leur présence web"
      />

      <div className="p-6 space-y-6">

        {/* Bandeau de statut des clés API */}
        {health && (
          <div className={`flex items-start gap-3 p-4 rounded-lg border text-sm ${
            health.keys.GOOGLE_MAPS_API_KEY.configured
              ? 'bg-emerald-500/10 backdrop-blur-sm border-emerald-300/40 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <KeyRound className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="flex-1">
              {health.keys.GOOGLE_MAPS_API_KEY.configured ? (
                <p>
                  <strong>Google Maps API</strong> configurée{' '}
                  <span className="font-mono text-xs opacity-70">
                    ({health.keys.GOOGLE_MAPS_API_KEY.preview})
                  </span>
                </p>
              ) : (
                <div>
                  <p className="font-semibold">Clé API Google Maps manquante ou invalide</p>
                  <p className="mt-1 text-xs">
                    Créez ou vérifiez votre fichier <code className="bg-red-100 px-1 rounded">.env.local</code> à la racine du projet :
                  </p>
                  <pre className="mt-2 text-xs bg-red-100 p-2 rounded font-mono">
                    GOOGLE_MAPS_API_KEY=AIzaSy...votre_clé</pre>
                  <p className="mt-1 text-xs opacity-80">
                    Puis redémarrez le serveur : <code className="bg-red-100 px-1 rounded">Ctrl+C</code> → <code className="bg-red-100 px-1 rounded">npm run dev</code>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Free user scan counter */}
        {!isPro && (
          <div className={`flex items-center gap-3 p-3 rounded-lg border text-sm ${
            !canScan
              ? 'bg-red-50 border-red-200'
              : scanCountThisMonth >= FREE_SCAN_LIMIT - 1
              ? 'bg-amber-50 border-amber-200'
              : 'bg-zinc-100 border-zinc-200'
          }`}>
            <div className="flex-1">
              <span className={`font-medium ${!canScan ? 'text-red-700' : scanCountThisMonth >= FREE_SCAN_LIMIT - 1 ? 'text-amber-700' : 'text-zinc-700'}`}>
                {scanCountThisMonth} / {FREE_SCAN_LIMIT} scans ce mois
              </span>
              <div className="mt-1.5 h-1.5 bg-zinc-300 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    !canScan ? 'bg-red-500' : scanCountThisMonth >= FREE_SCAN_LIMIT - 1 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min((scanCountThisMonth / FREE_SCAN_LIMIT) * 100, 100)}%` }}
                />
              </div>
            </div>
            {!canScan && (
              <button
                onClick={() => setUpgradeModal('scan_limit')}
                className="text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full hover:bg-amber-200 transition-colors"
              >
                Passer à Pro
              </button>
            )}
          </div>
        )}

        {/* Sélecteur de source */}
        <div className="flex gap-3">
          <button
            onClick={() => { setActiveSource('google_maps'); setScanStatus('idle') }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all border ${
              activeSource === 'google_maps'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white/70 backdrop-blur-sm text-zinc-600 border-zinc-200 hover:border-blue-300'
            }`}
          >
            <Map className="h-4 w-4" />
            Google Maps
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              activeSource === 'google_maps' ? 'bg-blue-500 text-white' : 'bg-emerald-100 text-emerald-700'
            }`}>
              Recommandé
            </span>
          </button>

          <button
            onClick={() => { setActiveSource('insee'); setScanStatus('idle') }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all border ${
              activeSource === 'insee'
                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                : 'bg-white/70 backdrop-blur-sm text-zinc-600 border-zinc-200 hover:border-amber-300'
            }`}
          >
            <Database className="h-4 w-4" />
            INSEE / Sirene
          </button>
        </div>

        {/* Formulaire de recherche */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radar className="h-5 w-5 text-amber-500" />
              {activeSource === 'google_maps' ? 'Scan Google Maps' : 'Scan INSEE / Sirene'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeSource === 'google_maps' ? (
              /* ── Formulaire Google Maps ── */
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2" ref={suggestionRef}>
                    <label className="text-sm font-medium text-zinc-700">
                      Type d'entreprise *
                    </label>
                    <div className="relative">
                      <Input
                        placeholder="Ex: restaurants, coiffeurs, plombiers..."
                        value={gmQuery}
                        onChange={(e) => { setGmQuery(e.target.value); setShowSuggestions(true) }}
                        onFocus={() => setShowSuggestions(true)}
                        icon={<Search className="h-4 w-4" />}
                      />
                      {showSuggestions && filteredTypes.length > 0 && (
                        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-zinc-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                          {filteredTypes.map((type) => (
                            <button
                              key={type}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                setGmQuery(type)
                                setShowSuggestions(false)
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-zinc-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700">
                      Ville / Zone *
                    </label>
                    <Input
                      placeholder="Ex: Boulogne-Billancourt, Paris 15..."
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      icon={<MapPin className="h-4 w-4" />}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700">
                      Nombre de lieux
                    </label>
                    <Select
                      options={gmMaxOptions}
                      value={gmMaxResults}
                      onChange={(e) => setGmMaxResults(e.target.value)}
                    />
                  </div>
                </div>

                {/* Option audit PageSpeed */}
                <div className={`flex items-start gap-3 p-4 rounded-lg border ${canAudit ? 'bg-blue-50 border-blue-200' : 'bg-zinc-50 border-zinc-200'}`}>
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
                    className="mt-0.5 h-4 w-4 rounded border-blue-300 text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="audit-websites"
                      className={`text-sm font-medium cursor-pointer flex items-center gap-1.5 ${canAudit ? 'text-blue-900' : 'text-zinc-500'}`}
                      onClick={() => { if (!canAudit) setUpgradeModal('audit') }}
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Analyser les performances des sites trouvés (Core Web Vitals)
                      {!canAudit && (
                        <span className="ml-1 text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                          Pro
                        </span>
                      )}
                    </label>
                    <p className={`text-xs mt-0.5 ${canAudit ? 'text-blue-700' : 'text-zinc-400'}`}>
                      Lance un audit PageSpeed Insights sur chaque site web détecté. Plus lent mais
                      identifie précisément les sites datés ou peu performants.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-zinc-50 rounded-lg text-sm text-zinc-600 border border-zinc-200">
                  <strong>Comment ça marche :</strong> Google Maps retourne les entreprises réelles
                  avec leurs coordonnées, téléphone et site web. Les entreprises sans site web sont
                  identifiées comme prospects{' '}
                  <span className="text-red-600 font-medium">🔥 Chaud</span> pour une création de
                  site. Les entreprises avec un site web peu performant sont identifiées pour une
                  refonte.
                </div>
              </div>
            ) : (
              /* ── Formulaire INSEE ── */
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700">Ville</label>
                    <Input
                      placeholder="Ex: Boulogne-Billancourt"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      icon={<MapPin className="h-4 w-4" />}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700">ou Code postal</label>
                    <Input
                      placeholder="Ex: 92100"
                      value={codePostal}
                      onChange={(e) => setCodePostal(e.target.value)}
                      icon={<MapPin className="h-4 w-4" />}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700">Activité (optionnel)</label>
                    <Input
                      placeholder="Ex: restaurant, coiffure..."
                      value={activite}
                      onChange={(e) => setActivite(e.target.value)}
                      icon={<Search className="h-4 w-4" />}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700">Nombre max</label>
                    <Select
                      options={nombreOptions}
                      value={nombreResultats}
                      onChange={(e) => setNombreResultats(e.target.value)}
                    />
                  </div>
                </div>

                <div className="p-3 bg-amber-50 rounded-lg text-sm text-amber-800 border border-amber-200">
                  <strong>💡 INSEE Sirene :</strong> Recherche dans le registre officiel des
                  entreprises françaises. Très exhaustif mais les coordonnées téléphoniques et sites
                  web ne sont pas toujours disponibles. Renseignez au moins la ville ou le code
                  postal.
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 mt-6">
              {!canScan && (
                <p className="text-sm text-amber-600 font-medium">
                  Limite atteinte — <button onClick={() => setUpgradeModal('scan_limit')} className="underline">Passer à Pro</button>
                </p>
              )}
              <Button
                onClick={handleStartScan}
                disabled={!canStartScan || (!canScan && !isScanning)}
                loading={isScanning}
                className="min-w-[160px]"
              >
                {!canScan ? <Lock className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isScanning ? 'Scan en cours...' : !canScan ? 'Limite atteinte' : 'Lancer le scan'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Scan en cours */}
        {scanStatus === 'scanning' && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-amber-600 animate-spin" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-zinc-900">Recherche en cours...</h3>
                  <p className="text-sm text-zinc-500">
                    {activeSource === 'google_maps'
                      ? gmAuditWebsites
                        ? 'Interrogation Google Maps + audit PageSpeed des sites trouvés...'
                        : 'Interrogation Google Places API et vérification des sites web...'
                      : 'Interrogation de l\'API Sirene et vérification des sites web...'}
                  </p>
                </div>
              </div>
              <p className="text-center text-zinc-500 text-sm">
                {gmAuditWebsites && activeSource === 'google_maps'
                  ? 'Cette opération peut prendre plusieurs minutes (audit PageSpeed activé)'
                  : 'Cette opération peut prendre quelques minutes'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Erreur */}
        {scanStatus === 'error' && errorMessage && (
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900">Erreur lors du scan</h3>
                  <p className="text-sm text-red-700">{errorMessage}</p>
                </div>
              </div>

              {/* Messages d'aide contextuels */}
              {activeSource === 'google_maps' && (
                <div className="mt-4 p-3 bg-red-100 rounded-lg text-sm">
                  <strong>Configuration requise :</strong> Ajoutez votre clé API Google Maps dans{' '}
                  <code>.env.local</code> :
                  <pre className="mt-2 text-xs bg-red-200 p-2 rounded">
                    {`GOOGLE_MAPS_API_KEY=votre_cle_api_google`}
                  </pre>
                  <p className="mt-2 text-xs text-red-700">
                    Assurez-vous que <strong>Places API</strong> est activée dans Google Cloud
                    Console.
                  </p>
                </div>
              )}
              {activeSource === 'insee' && errorMessage.includes('INSEE') && (
                <div className="mt-4 p-3 bg-red-100 rounded-lg text-sm">
                  <strong>Configuration requise :</strong> Ajoutez vos credentials INSEE dans{' '}
                  <code>.env.local</code> :
                  <pre className="mt-2 text-xs bg-red-200 p-2 rounded">
                    {`INSEE_API_KEY=votre_token`}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Résultats */}
        {scanStatus === 'completed' && scanResult && (
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-zinc-900">Scan terminé !</h3>
                  <p className="text-sm text-zinc-500">
                    {activeSource === 'google_maps'
                      ? `${scanResult.total_found} entreprises trouvées via Google Maps`
                      : `${scanResult.total_found} entreprises trouvées dans la base SIRENE`}
                  </p>
                </div>
                <Button onClick={handleViewResults}>
                  Voir les leads
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              {/* Statistiques */}
              <div className={`grid gap-4 text-center ${activeSource === 'google_maps' ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3'}`}>
                <div className="p-4 bg-white rounded-lg">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Building2 className="h-5 w-5 text-zinc-400" />
                  </div>
                  <p className="text-3xl font-bold text-zinc-900">{scanResult.processed}</p>
                  <p className="text-sm text-zinc-500">Entreprises traitées</p>
                </div>

                <div className="p-4 bg-white rounded-lg">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Globe className="h-5 w-5 text-red-500" />
                  </div>
                  <p className="text-3xl font-bold text-red-600">{scanResult.without_site}</p>
                  <p className="text-sm text-zinc-500">Sans site web 🔥</p>
                </div>

                <div className="p-4 bg-white rounded-lg">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Wrench className="h-5 w-5 text-amber-500" />
                  </div>
                  <p className="text-3xl font-bold text-amber-600">{scanResult.needing_refonte}</p>
                  <p className="text-sm text-zinc-500">Site à refaire</p>
                </div>

                {activeSource === 'google_maps' && scanResult.audited !== undefined && (
                  <div className="p-4 bg-white rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Zap className="h-5 w-5 text-blue-500" />
                    </div>
                    <p className="text-3xl font-bold text-blue-600">{scanResult.audited}</p>
                    <p className="text-sm text-zinc-500">Sites audités</p>
                  </div>
                )}
              </div>

              {/* Top résultats */}
              {scanResult.companies.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-zinc-700 mb-3">
                    Aperçu des meilleurs prospects
                  </h4>
                  <div className="space-y-2">
                    {scanResult.companies
                      .sort((a, b) => b.prospect_score - a.prospect_score)
                      .slice(0, 5)
                      .map((company, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-3 bg-white rounded-lg border border-zinc-100"
                        >
                          <div
                            className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                              company.priority === 'hot'
                                ? 'bg-red-100 text-red-700'
                                : company.priority === 'warm'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {company.prospect_score}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-zinc-900 text-sm truncate">
                              {company.name}
                            </p>
                            <p className="text-xs text-zinc-500 truncate">
                              {company.city} {company.postal_code}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {!company.has_website ? (
                              <Badge variant="destructive" className="text-xs">Pas de site</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">A refondre</Badge>
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
                    className="flex items-center gap-4 p-4 bg-zinc-50 rounded-lg"
                  >
                    <div
                      className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        scan.status === 'completed'
                          ? 'bg-emerald-100'
                          : scan.status === 'running'
                          ? 'bg-amber-100'
                          : scan.status === 'failed'
                          ? 'bg-red-100'
                          : 'bg-zinc-200'
                      }`}
                    >
                      {scan.status === 'completed' && (
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                      )}
                      {scan.status === 'running' && (
                        <Loader2 className="h-5 w-5 text-amber-600 animate-spin" />
                      )}
                      {scan.status === 'failed' && (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      {scan.status === 'pending' && (
                        <Clock className="h-5 w-5 text-zinc-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-zinc-900 truncate">{scan.query}</p>
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
                        <div className="flex items-center gap-1 text-red-600">
                          <Globe className="h-4 w-4" />
                          <span className="font-semibold">{scan.companies_without_site}</span>
                        </div>
                        <div className="flex items-center gap-1 text-amber-600">
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

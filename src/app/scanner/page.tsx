'use client'

import { useState } from 'react'
<<<<<<< HEAD
import { Header } from '@/components/layout'
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Select, Badge, Progress } from '@/components/ui'
import { sectorLabels } from '@/lib/utils'
import { Sector, SearchScan } from '@/types'
=======
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout'
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Select, Badge, Progress } from '@/components/ui'
import { sectorLabels } from '@/lib/utils'
import { Sector, SearchScan, Company } from '@/types'
>>>>>>> 0ce45b5 (v3)
import { mockScans } from '@/lib/mock-data'
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
<<<<<<< HEAD
  History
} from 'lucide-react'

export default function ScannerPage() {
  const [city, setCity] = useState('')
  const [query, setQuery] = useState('')
  const [radius, setRadius] = useState('2000')
  const [sector, setSector] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [currentScan, setCurrentScan] = useState<SearchScan | null>(null)
  const [scans, setScans] = useState<SearchScan[]>(mockScans)

  const sectorOptions = [
    { value: '', label: 'Tous les secteurs' },
    ...Object.entries(sectorLabels).map(([value, label]) => ({ value, label }))
  ]

  const radiusOptions = [
    { value: '500', label: '500m' },
    { value: '1000', label: '1 km' },
    { value: '2000', label: '2 km' },
    { value: '5000', label: '5 km' },
    { value: '10000', label: '10 km' },
  ]

  const handleStartScan = async () => {
    if (!city.trim()) return

    setIsScanning(true)
    
    const newScan: SearchScan = {
      id: `scan-${Date.now()}`,
      query: query || `Entreprises ${city}`,
      location: { lat: 48.8417, lng: 2.2394, radius: parseInt(radius) },
      sector_filter: sector as Sector || null,
=======
  History,
  AlertTriangle,
  ArrowRight
} from 'lucide-react'

export default function ScannerPage() {
  const router = useRouter()
  const [city, setCity] = useState('')
  const [codePostal, setCodePostal] = useState('')
  const [query, setQuery] = useState('')
  const [nombreResultats, setNombreResultats] = useState('50')
  const [isScanning, setIsScanning] = useState(false)
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'completed' | 'error'>('idle')
  const [scanResult, setScanResult] = useState<{
    total_found: number
    processed: number
    without_site: number
    needing_refonte: number
    companies: Company[]
  } | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [scans, setScans] = useState<SearchScan[]>(mockScans)

  const nombreOptions = [
    { value: '20', label: '20 entreprises' },
    { value: '50', label: '50 entreprises' },
    { value: '100', label: '100 entreprises' },
    { value: '200', label: '200 entreprises' },
  ]

  const handleStartScan = async () => {
    if (!city.trim() && !codePostal.trim()) return

    setIsScanning(true)
    setScanStatus('scanning')
    setErrorMessage(null)
    setScanResult(null)

    const newScan: SearchScan = {
      id: `scan-${Date.now()}`,
      query: query || `Entreprises ${city || codePostal}`,
      location: { lat: 0, lng: 0, radius: 0 },
      sector_filter: null,
>>>>>>> 0ce45b5 (v3)
      status: 'running',
      progress: 0,
      companies_found: 0,
      companies_without_site: 0,
      companies_needing_refonte: 0,
      started_at: new Date().toISOString(),
      completed_at: null,
      error_message: null
    }

<<<<<<< HEAD
    setCurrentScan(newScan)
    setScans([newScan, ...scans])

    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 500))
      setCurrentScan(prev => prev ? {
        ...prev,
        progress: i,
        companies_found: Math.floor(i / 2),
        companies_without_site: Math.floor(i / 8),
        companies_needing_refonte: Math.floor(i / 6)
      } : null)
    }

    const completedScan = {
      ...newScan,
      status: 'completed' as const,
      progress: 100,
      companies_found: 45,
      companies_without_site: 12,
      companies_needing_refonte: 18,
      completed_at: new Date().toISOString()
    }

    setCurrentScan(completedScan)
    setScans(prev => prev.map(s => s.id === newScan.id ? completedScan : s))
    setIsScanning(false)
=======
    setScans([newScan, ...scans])

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commune: city.trim() || undefined,
          codePostal: codePostal.trim() || undefined,
          activite: query.trim() || undefined,
          nombreResultats: parseInt(nombreResultats)
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du scan')
      }

      // Succès !
      setScanResult(data.data)
      setScanStatus('completed')

      // Mettre à jour le scan dans l'historique
      const completedScan: SearchScan = {
        ...newScan,
        status: 'completed',
        progress: 100,
        companies_found: data.data.processed,
        companies_without_site: data.data.without_site,
        companies_needing_refonte: data.data.needing_refonte,
        completed_at: new Date().toISOString()
      }
      setScans(prev => prev.map(s => s.id === newScan.id ? completedScan : s))

    } catch (error) {
      console.error('Scan error:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Erreur inconnue')
      setScanStatus('error')

      // Mettre à jour le scan en erreur
      setScans(prev => prev.map(s => s.id === newScan.id ? {
        ...s,
        status: 'failed' as const,
        error_message: error instanceof Error ? error.message : 'Erreur'
      } : s))
    } finally {
      setIsScanning(false)
    }
  }

  const handleViewResults = () => {
    // TODO: Sauvegarder les résultats en base et rediriger vers /leads
    router.push('/leads')
>>>>>>> 0ce45b5 (v3)
  }

  return (
    <div className="min-h-screen">
      <Header 
        title="Scanner" 
<<<<<<< HEAD
        subtitle="Recherchez des entreprises dans une zone géographique"
      />
      
      <div className="p-6 space-y-6">
=======
        subtitle="Recherchez des entreprises via l'API Sirene (INSEE)"
      />
      
      <div className="p-6 space-y-6">
        {/* Formulaire de recherche */}
>>>>>>> 0ce45b5 (v3)
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radar className="h-5 w-5 text-amber-500" />
              Nouvelle recherche
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
<<<<<<< HEAD
                <label className="text-sm font-medium text-zinc-700">Ville *</label>
=======
                <label className="text-sm font-medium text-zinc-700">Ville</label>
>>>>>>> 0ce45b5 (v3)
                <Input
                  placeholder="Ex: Boulogne-Billancourt"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  icon={<MapPin className="h-4 w-4" />}
                />
              </div>
<<<<<<< HEAD
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">Recherche (optionnel)</label>
                <Input
                  placeholder="Ex: restaurants, coiffeurs..."
=======

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
>>>>>>> 0ce45b5 (v3)
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  icon={<Search className="h-4 w-4" />}
                />
              </div>
              
              <div className="space-y-2">
<<<<<<< HEAD
                <label className="text-sm font-medium text-zinc-700">Rayon</label>
                <Select
                  options={radiusOptions}
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">Secteur</label>
                <Select
                  options={sectorOptions}
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                />
              </div>
            </div>
=======
                <label className="text-sm font-medium text-zinc-700">Nombre max</label>
                <Select
                  options={nombreOptions}
                  value={nombreResultats}
                  onChange={(e) => setNombreResultats(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              <strong>💡 Conseil :</strong> L'API INSEE recherche dans la base SIRENE (toutes les entreprises françaises). 
              Renseignez au moins la ville ou le code postal.
            </div>
>>>>>>> 0ce45b5 (v3)
            
            <div className="flex justify-end mt-6">
              <Button
                onClick={handleStartScan}
<<<<<<< HEAD
                disabled={!city.trim() || isScanning}
=======
                disabled={(!city.trim() && !codePostal.trim()) || isScanning}
>>>>>>> 0ce45b5 (v3)
                loading={isScanning}
                className="min-w-[150px]"
              >
                <Play className="h-4 w-4" />
                {isScanning ? 'Scan en cours...' : 'Lancer le scan'}
              </Button>
            </div>
          </CardContent>
        </Card>

<<<<<<< HEAD
        {currentScan && currentScan.status === 'running' && (
=======
        {/* État du scan en cours */}
        {scanStatus === 'scanning' && (
>>>>>>> 0ce45b5 (v3)
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center">
<<<<<<< HEAD
                  <Radar className="h-6 w-6 text-amber-600 animate-pulse" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-zinc-900">{currentScan.query}</h3>
                  <p className="text-sm text-zinc-500">Scan en cours...</p>
                </div>
                <p className="text-2xl font-bold text-amber-600">{currentScan.progress}%</p>
              </div>
              
              <Progress value={currentScan.progress} color="warning" className="mb-4" />
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-zinc-900">{currentScan.companies_found}</p>
                  <p className="text-sm text-zinc-500">Entreprises trouvées</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600">{currentScan.companies_without_site}</p>
                  <p className="text-sm text-zinc-500">Sans site web</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{currentScan.companies_needing_refonte}</p>
                  <p className="text-sm text-zinc-500">Besoin refonte</p>
=======
                  <Loader2 className="h-6 w-6 text-amber-600 animate-spin" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-zinc-900">Recherche en cours...</h3>
                  <p className="text-sm text-zinc-500">
                    Interrogation de l'API Sirene et vérification des sites web
                  </p>
                </div>
              </div>
              <div className="text-center text-zinc-500">
                Cette opération peut prendre quelques minutes selon le nombre de résultats
              </div>
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
              {errorMessage.includes('INSEE') && (
                <div className="mt-4 p-3 bg-red-100 rounded-lg text-sm">
                  <strong>Configuration requise :</strong> Ajoutez vos credentials INSEE dans <code>.env.local</code> :
                  <pre className="mt-2 text-xs bg-red-200 p-2 rounded">
{`INSEE_CLIENT_ID=votre_client_id
INSEE_CLIENT_SECRET=votre_client_secret`}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Résultats du scan */}
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
                    {scanResult.total_found} entreprises trouvées dans la base SIRENE
                  </p>
                </div>
                <Button onClick={handleViewResults}>
                  Voir les résultats
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-white rounded-lg">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Building2 className="h-5 w-5 text-zinc-400" />
                  </div>
                  <p className="text-3xl font-bold text-zinc-900">{scanResult.processed}</p>
                  <p className="text-sm text-zinc-500">Entreprises traitées</p>
                </div>
                <div className="p-4 bg-white rounded-lg">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Globe className="h-5 w-5 text-amber-500" />
                  </div>
                  <p className="text-3xl font-bold text-amber-600">{scanResult.without_site}</p>
                  <p className="text-sm text-zinc-500">Sans site web</p>
                </div>
                <div className="p-4 bg-white rounded-lg">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Wrench className="h-5 w-5 text-blue-500" />
                  </div>
                  <p className="text-3xl font-bold text-blue-600">{scanResult.needing_refonte}</p>
                  <p className="text-sm text-zinc-500">Site à refaire</p>
>>>>>>> 0ce45b5 (v3)
                </div>
              </div>
            </CardContent>
          </Card>
        )}

<<<<<<< HEAD
=======
        {/* Historique */}
>>>>>>> 0ce45b5 (v3)
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historique des scans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
<<<<<<< HEAD
              {scans.map((scan) => (
                <div
                  key={scan.id}
                  className="flex items-center gap-4 p-4 bg-zinc-50 rounded-lg"
                >
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                    scan.status === 'completed' ? 'bg-emerald-100' :
                    scan.status === 'running' ? 'bg-amber-100' :
                    scan.status === 'failed' ? 'bg-red-100' : 'bg-zinc-200'
                  }`}>
                    {scan.status === 'completed' && <CheckCircle className="h-5 w-5 text-emerald-600" />}
                    {scan.status === 'running' && <Loader2 className="h-5 w-5 text-amber-600 animate-spin" />}
                    {scan.status === 'failed' && <XCircle className="h-5 w-5 text-red-600" />}
                    {scan.status === 'pending' && <Clock className="h-5 w-5 text-zinc-400" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-900 truncate">{scan.query}</p>
                    <p className="text-sm text-zinc-500">
                      {new Date(scan.started_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  
                  {scan.status === 'completed' && (
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-zinc-600">
                          <Building2 className="h-4 w-4" />
                          <span className="font-semibold">{scan.companies_found}</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-amber-600">
                          <Globe className="h-4 w-4" />
                          <span className="font-semibold">{scan.companies_without_site}</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-blue-600">
                          <Wrench className="h-4 w-4" />
                          <span className="font-semibold">{scan.companies_needing_refonte}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <Badge
                    variant={
                      scan.status === 'completed' ? 'success' :
                      scan.status === 'running' ? 'warning' :
                      scan.status === 'failed' ? 'destructive' : 'secondary'
                    }
                  >
                    {scan.status === 'completed' && 'Terminé'}
                    {scan.status === 'running' && 'En cours'}
                    {scan.status === 'failed' && 'Échoué'}
                    {scan.status === 'pending' && 'En attente'}
                  </Badge>
                </div>
              ))}
=======
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
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      scan.status === 'completed' ? 'bg-emerald-100' :
                      scan.status === 'running' ? 'bg-amber-100' :
                      scan.status === 'failed' ? 'bg-red-100' : 'bg-zinc-200'
                    }`}>
                      {scan.status === 'completed' && <CheckCircle className="h-5 w-5 text-emerald-600" />}
                      {scan.status === 'running' && <Loader2 className="h-5 w-5 text-amber-600 animate-spin" />}
                      {scan.status === 'failed' && <XCircle className="h-5 w-5 text-red-600" />}
                      {scan.status === 'pending' && <Clock className="h-5 w-5 text-zinc-400" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-zinc-900 truncate">{scan.query}</p>
                      <p className="text-sm text-zinc-500">
                        {new Date(scan.started_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    
                    {scan.status === 'completed' && (
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <div className="flex items-center gap-1 text-zinc-600">
                            <Building2 className="h-4 w-4" />
                            <span className="font-semibold">{scan.companies_found}</span>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center gap-1 text-amber-600">
                            <Globe className="h-4 w-4" />
                            <span className="font-semibold">{scan.companies_without_site}</span>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center gap-1 text-blue-600">
                            <Wrench className="h-4 w-4" />
                            <span className="font-semibold">{scan.companies_needing_refonte}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <Badge
                      variant={
                        scan.status === 'completed' ? 'success' :
                        scan.status === 'running' ? 'warning' :
                        scan.status === 'failed' ? 'destructive' : 'secondary'
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
>>>>>>> 0ce45b5 (v3)
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Header } from '@/components/layout'
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Select, Badge, Progress } from '@/components/ui'
import { sectorLabels } from '@/lib/utils'
import { Sector, SearchScan } from '@/types'
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
      status: 'running',
      progress: 0,
      companies_found: 0,
      companies_without_site: 0,
      companies_needing_refonte: 0,
      started_at: new Date().toISOString(),
      completed_at: null,
      error_message: null
    }

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
  }

  return (
    <div className="min-h-screen">
      <Header 
        title="Scanner" 
        subtitle="Recherchez des entreprises dans une zone géographique"
      />
      
      <div className="p-6 space-y-6">
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
                <label className="text-sm font-medium text-zinc-700">Ville *</label>
                <Input
                  placeholder="Ex: Boulogne-Billancourt"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  icon={<MapPin className="h-4 w-4" />}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">Recherche (optionnel)</label>
                <Input
                  placeholder="Ex: restaurants, coiffeurs..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  icon={<Search className="h-4 w-4" />}
                />
              </div>
              
              <div className="space-y-2">
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
            
            <div className="flex justify-end mt-6">
              <Button
                onClick={handleStartScan}
                disabled={!city.trim() || isScanning}
                loading={isScanning}
                className="min-w-[150px]"
              >
                <Play className="h-4 w-4" />
                {isScanning ? 'Scan en cours...' : 'Lancer le scan'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {currentScan && currentScan.status === 'running' && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center">
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
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historique des scans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout'
import { Card, CardHeader, CardTitle, CardContent, Button, CityAutocomplete } from '@/components/ui'
import { AdminCityScan } from '@/types'
import { Building2, Euro, History, Loader2, MapPin, Play, Shield, Users, Crown, UserCheck } from 'lucide-react'

interface UserRow {
  id: string
  email: string | null
  plan: string
  role: string
  created_at: string
}

const DEFAULT_CITY_SCAN_CATEGORIES = [
  'Restaurants',
  'Boulangeries',
  'Coiffeurs',
  'Instituts de beauté',
  'Plombiers',
  'Électriciens',
  'Maçons',
  'Serruriers',
  'Dentistes',
  'Médecins',
  'Pharmacies',
  'Garages auto',
  'Agences immobilières',
  'Avocats',
  'Comptables',
  'Salles de sport',
]

export default function AdminPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [scans, setScans] = useState<AdminCityScan[]>([])
  const [loading, setLoading] = useState(true)
  const [scanLoading, setScanLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [city, setCity] = useState('')
  const [maxPerCategory, setMaxPerCategory] = useState('20')
  const [selectedCategories, setSelectedCategories] = useState<string[]>(DEFAULT_CITY_SCAN_CATEGORIES.slice(0, 7))
  const [runningScan, setRunningScan] = useState(false)
  const [liveScan, setLiveScan] = useState<AdminCityScan | null>(null)

  // Poll for live progress while a scan is running
  useEffect(() => {
    if (!runningScan) {
      setLiveScan(null)
      return
    }
    const poll = async () => {
      try {
        const res = await fetch('/api/admin/city-scan')
        const data = await res.json()
        const active = (data.scans ?? []).find((s: AdminCityScan) => s.status === 'running')
        if (active) setLiveScan(active)
      } catch { /* silently ignore */ }
    }
    poll()
    const interval = setInterval(poll, 2000)
    return () => clearInterval(interval)
  }, [runningScan])

  useEffect(() => {
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error)
        else setUsers(data.users)
      })
      .catch(() => setError('Erreur réseau'))
      .finally(() => setLoading(false))

    fetch('/api/admin/city-scan')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setScanError(data.error)
        else setScans(data.scans ?? [])
      })
      .catch(() => setScanError('Erreur réseau'))
      .finally(() => setScanLoading(false))
  }, [])

  const handleToggleCategory = (category: string) => {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    )
  }

  const handleCityScan = async (resumeScan?: AdminCityScan) => {
    if (!resumeScan && (!city.trim() || selectedCategories.length === 0)) return
    setRunningScan(true)
    setScanError(null)
    try {
      const res = await fetch('/api/admin/city-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: resumeScan?.city ?? city.trim(),
          categories: resumeScan?.categories ?? selectedCategories,
          maxPerCategory: resumeScan?.max_per_category ?? Number(maxPerCategory),
          resumeScanId: resumeScan?.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur scan')
      setScans((prev) => [data.scan, ...prev.filter((scan) => scan.id !== data.scan.id)])
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Erreur scan')
    } finally {
      setRunningScan(false)
    }
  }

  const total = users.length
  const admins = users.filter((u) => u.role === 'admin').length
  const pro = users.filter((u) => u.plan === 'pro').length
  const free = users.filter((u) => u.plan !== 'pro').length

  return (
    <div className="min-h-screen">
      <Header
        title="Administration"
        subtitle="Gestion des utilisateurs"
      />

      <div className="p-6 max-w-6xl space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard icon={<Users className="h-5 w-5 text-zinc-400" />} label="Total utilisateurs" value={total} />
          <StatCard icon={<Shield className="h-5 w-5 text-violet-400" />} label="Admins" value={admins} />
          <StatCard icon={<Crown className="h-5 w-5 text-amber-400" />} label="Pro" value={pro} />
          <StatCard icon={<UserCheck className="h-5 w-5 text-zinc-400" />} label="Free" value={free} />
        </div>

        {/* Power scan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-violet-400" />
              Mode agence — agrégation Google Places par ville
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 lg:grid-cols-[1fr_180px_auto]">
              <CityAutocomplete
                value={city}
                onChange={setCity}
                placeholder="Ville à couvrir, ex: Lyon, Nantes, Paris 15"
              />
              <select
                value={maxPerCategory}
                onChange={(e) => setMaxPerCategory(e.target.value)}
                className="rounded-lg border border-white/[0.08] bg-zinc-900/60 px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="10">10 / catégorie</option>
                <option value="20">20 / catégorie</option>
                <option value="40">40 / catégorie</option>
                <option value="60">60 / catégorie</option>
              </select>
              <Button onClick={() => handleCityScan()} disabled={runningScan || !city.trim() || selectedCategories.length === 0}>
                {runningScan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {runningScan ? 'Scan en cours...' : 'Scanner la ville'}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {DEFAULT_CITY_SCAN_CATEGORIES.map((category) => {
                const selected = selectedCategories.includes(category)
                return (
                  <button
                    key={category}
                    onClick={() => handleToggleCategory(category)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      selected
                        ? 'border-violet-500 bg-violet-500/20 text-violet-200'
                        : 'border-white/[0.08] bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {category}
                  </button>
                )
              })}
            </div>

            <div className="grid gap-3 text-sm md:grid-cols-3">
              <InfoTile icon={<Building2 className="h-4 w-4 text-blue-400" />} label="Catégories" value={selectedCategories.length} />
              <InfoTile icon={<Users className="h-4 w-4 text-emerald-400" />} label="Max fiches" value={selectedCategories.length * Number(maxPerCategory || 0)} />
              <InfoTile icon={<Euro className="h-4 w-4 text-amber-400" />} label="Coût estimé" value={`~${estimateUiCost(selectedCategories.length, Number(maxPerCategory || 0))}€`} />
            </div>

            {scanError && <p className="text-sm text-red-400">{scanError}</p>}
          </CardContent>
        </Card>

        {/* Live scan progress */}
        {runningScan && (
          <Card className="border-violet-500/30 bg-violet-500/[0.04]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-violet-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                Scan en cours — {liveScan?.city ?? city}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress bar */}
              <div>
                <div className="mb-1.5 flex justify-between text-xs text-zinc-500">
                  <span>
                    {liveScan
                      ? `${liveScan.category_results?.length ?? 0} / ${liveScan.categories?.length ?? selectedCategories.length} catégories`
                      : 'Démarrage…'}
                  </span>
                  <span>{liveScan?.progress ?? 0}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${liveScan?.progress ?? 0}%` }}
                  />
                </div>
              </div>

              {/* Live counters */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-white/[0.06] bg-zinc-800/40 px-3 py-2.5">
                  <p className="text-lg font-bold text-white">{liveScan?.places_found ?? 0}</p>
                  <p className="text-xs text-zinc-500">Lieux trouvés</p>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-zinc-800/40 px-3 py-2.5">
                  <p className="text-lg font-bold text-emerald-400">{liveScan?.companies_created ?? 0}</p>
                  <p className="text-xs text-zinc-500">Créés</p>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-zinc-800/40 px-3 py-2.5">
                  <p className="text-lg font-bold text-amber-400">{liveScan?.duplicates_skipped ?? 0}</p>
                  <p className="text-xs text-zinc-500">Doublons</p>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-zinc-800/40 px-3 py-2.5">
                  <p className="text-lg font-bold text-zinc-300">{liveScan?.estimated_api_cost_eur ?? 0}€</p>
                  <p className="text-xs text-zinc-500">Coût réel</p>
                </div>
              </div>

              {/* Category chips */}
              {liveScan?.categories && (
                <div className="flex flex-wrap gap-1.5">
                  {liveScan.categories.map((cat) => {
                    const done = liveScan.category_results?.some((r) => r.category === cat)
                    return (
                      <span
                        key={cat}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          done
                            ? 'bg-violet-500/20 text-violet-300'
                            : 'bg-zinc-800/60 text-zinc-600'
                        }`}
                      >
                        {done ? '✓ ' : ''}{cat}
                      </span>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Scan history */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-zinc-400" />
              Historique des agrégations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scanLoading ? (
              <div className="flex items-center gap-2 text-zinc-400 text-sm py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement...
              </div>
            ) : scans.length === 0 ? (
              <p className="text-sm text-zinc-500 py-3">Aucun scan ville complète pour l&apos;instant.</p>
            ) : (
              <div className="space-y-3">
                {scans.map((scan) => (
                  <div key={scan.id} className="rounded-xl border border-white/[0.06] bg-zinc-900/50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{scan.city}</p>
                        <p className="text-xs text-zinc-500">
                          {scan.categories.length} catégories · {new Date(scan.started_at).toLocaleString('fr-FR')}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Metric label="Créés" value={scan.companies_created} tone="emerald" />
                        <Metric label="Doublons" value={scan.duplicates_skipped} tone="amber" />
                        <Metric label="Trouvés" value={scan.places_found} tone="blue" />
                        <Metric label="Coût" value={`${scan.estimated_api_cost_eur}€`} tone="zinc" />
                        {scan.status === 'failed' && (
                          <button
                            onClick={() => handleCityScan(scan)}
                            disabled={runningScan}
                            className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 font-medium text-violet-300 hover:bg-violet-500/20 disabled:opacity-60"
                          >
                            Reprendre
                          </button>
                        )}
                      </div>
                    </div>
                    {scan.category_results?.length > 0 && (
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {scan.category_results.map((result) => (
                          <div key={result.category} className="flex items-center justify-between rounded-lg bg-zinc-800/40 px-3 py-2 text-xs">
                            <span className="font-medium text-zinc-300">{result.category}</span>
                            <span className="text-zinc-500">
                              {result.created} créés · {result.duplicates} doublons · {result.without_site} sans site
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-violet-400" />
              Utilisateurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-zinc-400 text-sm py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement...
              </div>
            ) : error ? (
              <p className="text-red-500 text-sm">{error}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-left text-zinc-500">
                      <th className="pb-3 font-medium">Email</th>
                      <th className="pb-3 font-medium">Plan</th>
                      <th className="pb-3 font-medium">Rôle</th>
                      <th className="pb-3 font-medium">Inscrit le</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 text-zinc-200 font-medium">
                          {u.email ?? <span className="text-zinc-400 italic">—</span>}
                        </td>
                        <td className="py-3">
                          <PlanBadge plan={u.plan} />
                        </td>
                        <td className="py-3">
                          <RoleBadge role={u.role} />
                        </td>
                        <td className="py-3 text-zinc-500">
                          {new Date(u.created_at).toLocaleDateString('fr-FR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && (
                  <p className="text-center text-zinc-400 text-sm py-8">Aucun utilisateur trouvé.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-zinc-500">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-zinc-800/40 px-4 py-3">
      {icon}
      <div>
        <p className="font-semibold text-white">{value}</p>
        <p className="text-xs text-zinc-500">{label}</p>
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number
  tone: 'emerald' | 'amber' | 'blue' | 'zinc'
}) {
  const colors = {
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    blue: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    zinc: 'bg-zinc-800 text-zinc-300 border-white/[0.08]',
  }

  return (
    <span className={`rounded-full border px-2.5 py-1 font-medium ${colors[tone]}`}>
      {label}: {value}
    </span>
  )
}

function estimateUiCost(categories: number, maxPerCategory: number): string {
  const textSearchPages = Math.max(1, Math.ceil(maxPerCategory / 20))
  const estimated = categories * textSearchPages * 0.03 + categories * maxPerCategory * 0.02
  return estimated.toFixed(2)
}

function PlanBadge({ plan }: { plan: string }) {
  if (plan === 'pro') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white">
        <Crown className="h-2.5 w-2.5" />
        PRO
      </span>
    )
  }
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-400">
      FREE
    </span>
  )
}

function RoleBadge({ role }: { role: string }) {
  if (role === 'admin') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white">
        <Shield className="h-2.5 w-2.5" />
        ADMIN
      </span>
    )
  }
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-400">
      CLIENT
    </span>
  )
}

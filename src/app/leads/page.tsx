'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout'
import { LeadsTable, LeadsFilters, LeadCard, CsvImport } from '@/components/leads'
import { Card, Button, Skeleton, UpgradeModal, ProGate } from '@/components/ui'
import { leadsApi } from '@/lib/api'
import { exportLeadsToXLSX, exportLeadsToCSV, FREE_CSV_LIMIT } from '@/lib/export'
import { Company, LeadFilters, LeadStatus } from '@/types'
import { usePlan } from '@/hooks/usePlan'
import {
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Upload,
  Loader2,
  Mail,
  X,
  Copy,
  Check,
  ExternalLink,
  Users,
  Bell,
} from 'lucide-react'

// ============================================
// Bulk Contact Modal
// ============================================
function BulkContactModal({ filters, onClose }: { filters: LeadFilters; onClose: () => void }) {
  const [leads, setLeads] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [markedIds, setMarkedIds] = useState<Set<string>>(new Set())
  const [markingAll, setMarkingAll] = useState(false)

  useEffect(() => {
    leadsApi.getAll(filters, 1, 200).then((res) => {
      setLeads(res.data.filter((l) => l.email))
      setLoading(false)
    })
  }, [])

  const allEmails = leads.map((l) => l.email).join(', ')
  const leadsWithEmail = leads.filter((l) => !markedIds.has(l.id))

  const handleCopyEmails = () => {
    navigator.clipboard.writeText(allEmails)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleMarkAll = async () => {
    setMarkingAll(true)
    await Promise.all(leads.map((l) => leadsApi.updateStatus(l.id, 'contacted')))
    setMarkedIds(new Set(leads.map((l) => l.id)))
    setMarkingAll(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-white/[0.08] bg-zinc-900/95 backdrop-blur-xl shadow-2xl shadow-black/60 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15">
              <Users className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Contacter tous les leads</h2>
              {!loading && (
                <p className="text-sm text-zinc-500">
                  {leads.length} lead{leads.length > 1 ? 's' : ''} avec un email sur les filtres actifs
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:bg-white/5 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-400">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Chargement des leads...
          </div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center text-zinc-400">
            <Mail className="h-10 w-10 mx-auto mb-3 text-zinc-200" />
            <p className="font-medium">Aucun lead avec un email</p>
            <p className="text-sm mt-1">Ajoutez des emails depuis les fiches individuelles</p>
          </div>
        ) : (
          <>
            {/* Actions bar */}
            <div className="px-6 py-3 bg-zinc-800/40 border-b border-white/[0.06] flex items-center gap-3 flex-wrap">
              <button
                onClick={handleCopyEmails}
                className="flex items-center gap-1.5 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 border border-white/[0.08] rounded-lg px-3 py-1.5 transition-colors"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copié !' : 'Copier tous les emails'}
              </button>

              <a
                href={`mailto:?bcc=${encodeURIComponent(allEmails)}&subject=${encodeURIComponent('Proposition de services web')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-1.5 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Ouvrir en BCC dans ma messagerie
              </a>

              {markedIds.size < leads.length && (
                <button
                  onClick={handleMarkAll}
                  disabled={markingAll}
                  className="flex items-center gap-1.5 text-sm font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                >
                  {markingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Marquer tous comme contactés
                </button>
              )}
            </div>

            {/* Lead list */}
            <div className="overflow-y-auto flex-1 divide-y divide-white/[0.04]">
              {leads.map((lead) => (
                <div key={lead.id} className={`flex items-center justify-between px-6 py-3 ${markedIds.has(lead.id) ? 'opacity-40' : ''}`}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-200 truncate">{lead.name}</p>
                    <p className="text-xs text-zinc-500">{lead.city} · {lead.email}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    {markedIds.has(lead.id) ? (
                      <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" /> Contacté
                      </span>
                    ) : (
                      <>
                        <a
                          href={`mailto:${lead.email}?subject=${encodeURIComponent('Proposition de services web')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          Contacter
                        </a>
                        <button
                          onClick={async () => {
                            await leadsApi.updateStatus(lead.id, 'contacted')
                            setMarkedIds((prev) => new Set([...prev, lead.id]))
                          }}
                          className="text-xs text-zinc-500 hover:text-emerald-400 font-medium transition-colors"
                          title="Marquer comme contacté"
                        >
                          ✓
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-white/[0.06] bg-zinc-800/40 rounded-b-2xl">
              <p className="text-xs text-zinc-500 text-center">
                {markedIds.size > 0 ? `${markedIds.size} lead${markedIds.size > 1 ? 's' : ''} marqués comme contactés` : `${leads.length} email${leads.length > 1 ? 's' : ''} disponible${leads.length > 1 ? 's' : ''}`}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ============================================
// Leads Content
// ============================================
function LeadsContent() {
  const searchParams = useSearchParams()
  const { canExport, isPro } = usePlan()
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showBulkContact, setShowBulkContact] = useState(false)
  const [showCsvImport, setShowCsvImport] = useState(false)
  const [csvBanner, setCsvBanner] = useState<{ exported: number; total: number } | null>(null)

  const [leads, setLeads] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 20,
    total: 0,
    totalPages: 0,
  })

  const [filters, setFilters] = useState<LeadFilters>(() => {
    const initial: LeadFilters = {}
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const hasWebsite = searchParams.get('has_website')
    const search = searchParams.get('search')

    if (status) initial.status = status as LeadStatus
    if (priority) initial.priority = priority as LeadFilters['priority']
    if (hasWebsite) initial.has_website = hasWebsite === 'true'
    if (search) initial.search = search

    return initial
  })

  const loadLeads = useCallback(
    async (page = 1) => {
      setLoading(true)
      try {
        const response = await leadsApi.getAll(filters, page, pagination.perPage)
        setLeads(response.data)
        setPagination({
          page: response.page,
          perPage: response.per_page,
          total: response.total,
          totalPages: response.total_pages,
        })
      } catch (error) {
        console.error('Error loading leads:', error)
        setLeads([])
        setPagination({ page: 1, perPage: 20, total: 0, totalPages: 0 })
      } finally {
        setLoading(false)
      }
    },
    [filters, pagination.perPage]
  )

  useEffect(() => {
    loadLeads(1)
  }, [filters, loadLeads])

  const handleStatusChange = async (id: string, status: LeadStatus) => {
    try {
      await leadsApi.updateStatus(id, status)
      setLeads(leads.map((l) => (l.id === id ? { ...l, status } : l)))
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const handlePageChange = (newPage: number) => {
    loadLeads(newPage)
  }

  const handleExportCSV = () => {
    if (leads.length === 0) return
    const result = exportLeadsToCSV(leads, 'leads-leadhunter', isPro)
    if (!isPro && result.total > FREE_CSV_LIMIT) {
      setCsvBanner(result)
    }
  }

  const handleExportXLSX = async () => {
    if (!canExport) {
      setShowUpgradeModal(true)
      return
    }
    if (leads.length === 0) return
    setExporting(true)
    try {
      await exportLeadsToXLSX(leads, 'leads-leadhunter')
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason="contact"
      />

      {showBulkContact && (
        <BulkContactModal
          filters={filters}
          onClose={() => setShowBulkContact(false)}
        />
      )}

      {showCsvImport && (
        <CsvImport
          onImported={(count) => { if (count > 0) loadLeads(1) }}
          onClose={() => setShowCsvImport(false)}
        />
      )}

      {/* CSV free-tier banner */}
      {csvBanner && (
        <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm">
          <FileText className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="text-amber-300 flex-1">
            <span className="font-semibold">{csvBanner.exported} leads exportés</span> sur {csvBanner.total} — passez en Pro pour tout exporter.
          </span>
          <a href="/upgrade" className="text-xs font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-2">
            Passer Pro
          </a>
          <button onClick={() => setCsvBanner(null)} className="text-amber-500 hover:text-amber-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <LeadsFilters filters={filters} onChange={setFilters} onReset={() => setFilters({})} />
      </Card>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-zinc-500">
          {loading ? (
            'Chargement...'
          ) : (
            <>
              <span className="font-semibold text-zinc-200">{leads.length}</span> sur{' '}
              <span className="font-semibold text-zinc-200">{pagination.total}</span> resultats
            </>
          )}
        </p>

        <div className="flex items-center gap-2">
          {/* Follow-up filter */}
          <button
            onClick={() => setFilters((f) => ({ ...f, needs_followup: f.needs_followup ? undefined : true }))}
            className={`flex items-center gap-1.5 text-sm font-medium rounded-lg px-3 py-1.5 border transition-colors ${
              filters.needs_followup
                ? 'bg-orange-500/20 border-orange-500/30 text-orange-400'
                : 'border-white/[0.08] text-zinc-500 hover:text-amber-400'
            }`}
            title="Leads contactés il y a plus de 7 jours — à relancer"
          >
            <Bell className="h-4 w-4" />
            À relancer
          </button>

          {/* Bulk contact */}
          {isPro ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBulkContact(true)}
              disabled={loading || leads.length === 0}
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              Contacter tous
            </Button>
          ) : (
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-amber-400 border border-white/[0.08] rounded-lg px-3 py-1.5 transition-colors"
            >
              <Mail className="h-4 w-4" />
              Contacter tous
              <span className="bg-amber-500/20 text-amber-400 text-[9px] font-bold px-1 py-0.5 rounded-full leading-none">Pro</span>
            </button>
          )}

          {/* CSV import */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCsvImport(true)}
            className="flex items-center gap-2"
            title="Importer des leads depuis un fichier CSV"
          >
            <Upload className="h-4 w-4" />
            Importer CSV
          </Button>

          {/* CSV export — gratuit (limité) */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={loading || leads.length === 0}
            className="flex items-center gap-2"
            title={isPro ? 'Exporter en CSV' : `Exporter les ${FREE_CSV_LIMIT} premiers leads en CSV (gratuit)`}
          >
            <FileText className="h-4 w-4" />
            {isPro ? `CSV (${leads.length})` : `CSV (${Math.min(leads.length, FREE_CSV_LIMIT)})`}
          </Button>

          <ProGate
            isPro={canExport}
            reason="export"
            variant="badge"
            onUpgrade={() => setShowUpgradeModal(true)}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportXLSX}
              disabled={exporting || loading || leads.length === 0}
              className="flex items-center gap-2"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {exporting ? 'Export...' : `Exporter XLSX (${leads.length})`}
            </Button>
          </ProGate>

          <div className="flex items-center gap-0.5 bg-zinc-800/60 p-1 rounded-lg border border-white/[0.06]">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'table' ? 'bg-zinc-700 shadow-sm text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
              }`}
              title="Vue tableau"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'cards' ? 'bg-zinc-700 shadow-sm text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
              }`}
              title="Vue cartes"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        viewMode === 'table' ? (
          <Card>
            <div className="p-4 space-y-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-24 ml-auto" />
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-8 w-12" />
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </Card>
            ))}
          </div>
        )
      ) : leads.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            {Object.keys(filters).length > 0 ? (
              <>
                <p className="text-zinc-400 text-lg mb-2">Aucun résultat</p>
                <p className="text-zinc-500 text-sm mb-4">
                  Aucun lead ne correspond à vos filtres actifs.
                </p>
                <button
                  onClick={() => setFilters({})}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors"
                >
                  Réinitialiser les filtres
                </button>
              </>
            ) : (
              <>
                <p className="text-zinc-400 text-lg mb-2">Aucun lead</p>
                <p className="text-zinc-500 text-sm mb-4">
                  Vous n'avez pas encore de prospects. Lancez un scan pour en trouver.
                </p>
                <a
                  href="/scanner"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors"
                >
                  Lancer un scan
                </a>
              </>
            )}
          </div>
        </Card>
      ) : viewMode === 'table' ? (
        <Card>
          <LeadsTable leads={leads} onStatusChange={handleStatusChange} />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            Page {pagination.page} sur {pagination.totalPages}
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Precedent
            </Button>

            <div className="flex items-center gap-1">
              {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                const pageNum = i + 1
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                      pageNum === pagination.page
                        ? 'bg-amber-500 text-white'
                        : 'text-zinc-400 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
            >
              Suivant
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LeadsPage() {
  return (
    <div className="min-h-screen">
      <Header
        title="Leads"
        subtitle="Gerez vos prospects et exportez vos donnees"
        action={{
          label: 'Ajouter',
          onClick: () => console.log('Add lead'),
        }}
      />

      <Suspense fallback={<div className="p-6"><Skeleton className="h-96" /></div>}>
        <LeadsContent />
      </Suspense>
    </div>
  )
}

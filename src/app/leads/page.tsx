'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout'
import { LeadsTable, LeadsFilters, LeadCard } from '@/components/leads'
import { Card, Button, Skeleton, UpgradeModal, ProGate } from '@/components/ui'
import { leadsApi } from '@/lib/api'
import { exportLeadsToXLSX } from '@/lib/export'
import { Company, LeadFilters, LeadStatus } from '@/types'
import { usePlan } from '@/hooks/usePlan'
import {
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
} from 'lucide-react'

function LeadsContent() {
  const searchParams = useSearchParams()
  const { canExport } = usePlan()
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

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
        reason="export"
      />

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
              <span className="font-semibold text-zinc-900">{leads.length}</span> sur{' '}
              <span className="font-semibold text-zinc-900">{pagination.total}</span> resultats
            </>
          )}
        </p>

        <div className="flex items-center gap-2">
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

          <div className="flex items-center gap-0.5 bg-zinc-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'table' ? 'bg-white shadow-sm' : 'hover:bg-zinc-200'
              }`}
              title="Vue tableau"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'cards' ? 'bg-white shadow-sm' : 'hover:bg-zinc-200'
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
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 text-zinc-700 text-sm font-medium hover:bg-zinc-200 transition-colors"
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
                        ? 'bg-zinc-900 text-white'
                        : 'hover:bg-zinc-100'
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

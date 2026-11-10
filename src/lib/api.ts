import { supabase } from './supabase'
import {
  Company,
  LeadFilters,
  DashboardStats,
  SearchScan,
  CreateCompanyInput,
  UpdateCompanyInput,
  Note,
  CreateNoteInput,
  PaginatedResponse,
  LeadStatus,
  Sector,
  LeadSegment
} from '@/types'
import { pickAudit } from './utils'

// ============================================
// Leads / Companies API
// ============================================

// ============================================
// Sections de la page Leads
// ============================================
// - no_site  : pas de vrai site (rien, réseau social ou annuaire)
// - redesign : site audité, vieux ou moche (techno datée, copyright ancien, design jugé daté par l'IA)
//              ou pas adapté au mobile
// - seo      : site audité récent et propre : à référencer / maintenir
// - to_audit : site pas encore audité
function segmentSelect(segment?: LeadSegment, countOnly = false): string {
  if (segment === 'redesign' || segment === 'seo') return countOnly ? 'id, website_audits!inner(id)' : '*, website_audits!inner(*)'
  if (segment === 'to_audit') return countOnly ? 'id, website_audits(id)' : '*, website_audits(*)'
  return countOnly ? 'id' : '*, website_audits(*)'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applySegment<Q extends { eq: any; or: any; is: any }>(query: Q, segment?: LeadSegment): Q {
  switch (segment) {
    case 'no_site':
      return query.eq('has_website', false)
    case 'redesign':
      return query
        .eq('has_website', true)
        .or('is_outdated.eq.true,is_mobile_friendly.eq.false', { referencedTable: 'website_audits' })
    case 'seo':
      return query
        .eq('has_website', true)
        .eq('website_audits.is_outdated', false)
        .eq('website_audits.is_mobile_friendly', true)
    case 'to_audit':
      return query.eq('has_website', true).is('website_audits', null)
    default:
      return query
  }
}

export const leadsApi = {
  async getAll(
    filters?: LeadFilters,
    page = 1,
    perPage = 20
  ): Promise<PaginatedResponse<Company>> {
    let query = applySegment(
      supabase.from('companies').select(segmentSelect(filters?.segment), { count: 'exact' }),
      filters?.segment
    )

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,city.ilike.%${filters.search}%`)
    }
    if (filters?.city) {
      query = query.eq('city', filters.city)
    }
    if (filters?.sector) {
      query = query.eq('sector', filters.sector)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority)
    }
    if (filters?.has_website !== undefined) {
      query = query.eq('has_website', filters.has_website)
    }
    if (filters?.needs_followup) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      query = query.eq('status', 'contacted').lt('last_contacted_at', sevenDaysAgo)
    }

    const from = (page - 1) * perPage
    const to = from + perPage - 1

    // Par défaut : les leads les plus récents d'abord (le dernier scan en tête)
    const ordered = filters?.sort === 'score'
      ? query.order('prospect_score', { ascending: false }).order('created_at', { ascending: false })
      : query.order('created_at', { ascending: false }).order('prospect_score', { ascending: false })

    const { data, count, error } = await ordered.range(from, to)

    if (error) throw error

    return {
      data: ((data || []) as unknown as (Company & { website_audits?: Company['audit'] | Company['audit'][] })[]).map(d => ({
        ...d,
        audit: pickAudit(d.website_audits),
        notes: []
      })),
      total: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage)
    }
  },

  /** Leads sans email (et pas « ne pas contacter »), les plus récents d'abord */
  async getIdsMissingEmail(limit = 1000): Promise<string[]> {
    const { data, error } = await supabase
      .from('companies')
      .select('id')
      .is('email', null)
      .or('do_not_contact.is.null,do_not_contact.eq.false')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data ?? []).map((row) => row.id as string)
  },

  /** Nombre de leads par section (onglets de la page Leads) */
  async getSegmentCounts(): Promise<Record<LeadSegment, number>> {
    const segments: LeadSegment[] = ['no_site', 'redesign', 'seo', 'to_audit']
    const counts = await Promise.all(segments.map(async (segment) => {
      const { count } = await applySegment(
        supabase.from('companies').select(segmentSelect(segment, true), { count: 'exact', head: true }),
        segment
      )
      return [segment, count ?? 0] as const
    }))
    return Object.fromEntries(counts) as Record<LeadSegment, number>
  },

  async getById(id: string): Promise<Company | null> {
    const { data, error } = await supabase
      .from('companies')
      .select('*, website_audits(*), notes(*)')
      .eq('id', id)
      .single()

    if (error) throw error

    return data ? {
      ...data,
      audit: pickAudit(data.website_audits),
      notes: data.notes || []
    } : null
  },

  async create(input: CreateCompanyInput): Promise<Company> {
    const { data, error } = await supabase
      .from('companies')
      .insert(input)
      .select()
      .single()

    if (error) throw error
    return { ...data, notes: [], audit: null }
  },

  async update(id: string, input: UpdateCompanyInput): Promise<Company> {
    const { data, error } = await supabase
      .from('companies')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, website_audits(*), notes(*)')
      .single()

    if (error) throw error
    return {
      ...data,
      audit: data.website_audits?.[0] || null,
      notes: data.notes || []
    }
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async updateStatus(id: string, status: LeadStatus): Promise<Company> {
    const updates: UpdateCompanyInput = { status }
    if (status === 'contacted' || status === 'meeting' || status === 'proposal') {
      updates.last_contacted_at = new Date().toISOString()
    }
    const updated = await this.update(id, updates)

    if (['meeting', 'proposal', 'won', 'lost'].includes(status)) {
      await supabase
        .from('email_messages')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('company_id', id)
        .eq('status', 'scheduled')
        .not('followup_of', 'is', null)
    }

    return updated
  },

  // Le prospect a répondu : on stoppe les relances automatiques et on le garde en tête de liste
  async markReplied(id: string): Promise<Company> {
    const now = new Date().toISOString()
    const updated = await this.update(id, { replied_at: now, last_contacted_at: now })

    await supabase
      .from('email_messages')
      .update({ status: 'cancelled', updated_at: now })
      .eq('company_id', id)
      .eq('status', 'scheduled')
      .not('followup_of', 'is', null)

    return updated
  },

  /** Met des leads dans la liste « À appeler » (ou les en retire), par paquets */
  async setCallList(ids: string[], inList: boolean): Promise<void> {
    const now = new Date().toISOString()
    for (let i = 0; i < ids.length; i += 200) {
      let query = supabase
        .from('companies')
        .update({ call_list_at: inList ? now : null, updated_at: now })
        .in('id', ids.slice(i, i + 200))
      // Cocher ne change pas la date des leads déjà dans la liste (leur place dans la file est gardée)
      if (inList) query = query.is('call_list_at', null)
      const { error } = await query
      if (error) throw error
    }
  },

  /** Identifiants de tous les leads qui correspondent aux filtres (toutes pages) */
  async getAllIds(filters?: LeadFilters, max = 2000): Promise<string[]> {
    const ids: string[] = []
    for (let page = 1; ids.length < max; page++) {
      const res = await this.getAll(filters, page, 200)
      ids.push(...res.data.map((l) => l.id))
      if (page >= res.total_pages) break
    }
    return ids.slice(0, max)
  },

  async addNote(input: CreateNoteInput): Promise<Note> {
    const { data, error } = await supabase
      .from('notes')
      .insert(input)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getAuditHistory(companyId: string): Promise<import('@/types').WebsiteAudit[]> {
    const { data, error } = await supabase
      .from('website_audits')
      .select('*')
      .eq('company_id', companyId)
      .order('audited_at', { ascending: false })
      .limit(10)

    if (error) throw error
    return data ?? []
  }
}

// ============================================
// Dashboard / Stats API
// ============================================
export const statsApi = {
  async getStats(): Promise<DashboardStats> {
    const { data: companies, error } = await supabase
      .from('companies')
      .select('status, priority, has_website, sector, prospect_score, created_at, updated_at')

    if (error) throw error

    const all = companies || []
    const total = all.length
    const withoutSite = all.filter(c => !c.has_website).length
    const needingRefonte = all.filter(c => c.has_website && c.prospect_score >= 60).length

    const byStatus = {
      new: all.filter(c => c.status === 'new').length,
      contacted: all.filter(c => c.status === 'contacted').length,
      meeting: all.filter(c => c.status === 'meeting').length,
      proposal: all.filter(c => c.status === 'proposal').length,
      won: all.filter(c => c.status === 'won').length,
      lost: all.filter(c => c.status === 'lost').length,
    }

    const byPriority = {
      hot: all.filter(c => c.priority === 'hot').length,
      warm: all.filter(c => c.priority === 'warm').length,
      cold: all.filter(c => c.priority === 'cold').length,
    }

    const sectorCounts: Record<string, number> = {}
    all.forEach(c => {
      if (c.sector) {
        sectorCounts[c.sector] = (sectorCounts[c.sector] || 0) + 1
      }
    })

    const topSectors = Object.entries(sectorCounts)
      .map(([sector, count]) => ({ sector: sector as Sector, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Tendance sur les 30 derniers jours (groupés par jour)
    const trend: { date: string; new_leads: number; contacted: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const new_leads = all.filter(c => c.created_at && c.created_at.startsWith(dateStr)).length
      const contacted = all.filter(c => c.status === 'contacted' && c.updated_at && c.updated_at.startsWith(dateStr)).length
      trend.push({ date: dateStr, new_leads, contacted })
    }

    return {
      total_leads: total,
      leads_without_site: withoutSite,
      leads_needing_refonte: needingRefonte,
      hot_leads: byPriority.hot,
      warm_leads: byPriority.warm,
      cold_leads: byPriority.cold,
      by_status: byStatus,
      trend,
      top_sectors: topSectors
    }
  }
}

// ============================================
// Scanner API
// ============================================
export const scannerApi = {
  async getAll(): Promise<SearchScan[]> {
    const { data, error } = await supabase
      .from('search_scans')
      .select('*')
      .order('started_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<SearchScan | null> {
    const { data, error } = await supabase
      .from('search_scans')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async startScan(query: string, location: { lat: number; lng: number; radius: number }, sectorFilter?: string): Promise<SearchScan> {
    const scan: Omit<SearchScan, 'id'> = {
      query,
      location,
      sector_filter: (sectorFilter as Sector | undefined) || null,
      status: 'pending',
      progress: 0,
      companies_found: 0,
      companies_without_site: 0,
      companies_needing_refonte: 0,
      started_at: new Date().toISOString(),
      completed_at: null,
      error_message: null
    }

    const { data, error } = await supabase
      .from('search_scans')
      .insert(scan)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

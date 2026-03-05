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
  LeadStatus
} from '@/types'

// ============================================
// Leads / Companies API
// ============================================
export const leadsApi = {
  async getAll(
    filters?: LeadFilters,
    page = 1,
    perPage = 20
  ): Promise<PaginatedResponse<Company>> {
    let query = supabase
      .from('companies')
      .select('*, website_audits(*)', { count: 'exact' })

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

    const { data, count, error } = await query
      .order('prospect_score', { ascending: false })
      .range(from, to)

    if (error) throw error

    return {
      data: (data || []).map(d => ({
        ...d,
        audit: d.website_audits?.[0] || null,
        notes: []
      })),
      total: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage)
    }
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
      audit: data.website_audits?.[0] || null,
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
    return this.update(id, updates)
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
      .map(([sector, count]) => ({ sector: sector as any, count }))
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
      sector_filter: sectorFilter as any || null,
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

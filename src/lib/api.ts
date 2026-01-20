import { supabase, isSupabaseConfigured } from './supabase'
import { mockApi, mockLeads, mockDashboardStats, mockScans } from './mock-data'
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
// Mode détection
// ============================================
const USE_MOCK = !isSupabaseConfigured()

if (USE_MOCK) {
  console.log('🔶 Running in MOCK mode - Supabase not configured')
}

// ============================================
// Leads / Companies API
// ============================================
export const leadsApi = {
  /**
   * Récupère tous les leads avec filtres et pagination
   */
  async getAll(
    filters?: LeadFilters,
    page = 1,
    perPage = 20
  ): Promise<PaginatedResponse<Company>> {
    if (USE_MOCK) {
      let filtered = [...mockLeads]
      
      // Apply filters
      if (filters?.search) {
        const search = filters.search.toLowerCase()
        filtered = filtered.filter(l => 
          l.name.toLowerCase().includes(search) ||
          l.city.toLowerCase().includes(search)
        )
      }
      if (filters?.city) {
        filtered = filtered.filter(l => l.city === filters.city)
      }
      if (filters?.sector) {
        filtered = filtered.filter(l => l.sector === filters.sector)
      }
      if (filters?.status) {
        filtered = filtered.filter(l => l.status === filters.status)
      }
      if (filters?.priority) {
        filtered = filtered.filter(l => l.priority === filters.priority)
      }
      if (filters?.has_website !== undefined) {
        filtered = filtered.filter(l => l.has_website === filters.has_website)
      }
      
      // Sort by score desc
      filtered.sort((a, b) => b.prospect_score - a.prospect_score)
      
      // Paginate
      const start = (page - 1) * perPage
      const data = filtered.slice(start, start + perPage)
      
      return {
        data,
        total: filtered.length,
        page,
        per_page: perPage,
        total_pages: Math.ceil(filtered.length / perPage)
      }
    }
    
    // Supabase query
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
  
  /**
   * Récupère un lead par ID
   */
  async getById(id: string): Promise<Company | null> {
    if (USE_MOCK) {
      return mockLeads.find(l => l.id === id) || null
    }
    
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
  
  /**
   * Crée un nouveau lead
   */
  async create(input: CreateCompanyInput): Promise<Company> {
    if (USE_MOCK) {
      const newLead: Company = {
        ...input,
        id: `mock-${Date.now()}`,
        notes: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      mockLeads.unshift(newLead)
      return newLead
    }
    
    const { data, error } = await supabase
      .from('companies')
      .insert(input)
      .select()
      .single()
    
    if (error) throw error
    return { ...data, notes: [], audit: null }
  },
  
  /**
   * Met à jour un lead
   */
  async update(id: string, input: UpdateCompanyInput): Promise<Company> {
    if (USE_MOCK) {
      const index = mockLeads.findIndex(l => l.id === id)
      if (index === -1) throw new Error('Lead not found')
      
      mockLeads[index] = {
        ...mockLeads[index],
        ...input,
        updated_at: new Date().toISOString()
      }
      return mockLeads[index]
    }
    
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
  
  /**
   * Supprime un lead
   */
  async delete(id: string): Promise<void> {
    if (USE_MOCK) {
      const index = mockLeads.findIndex(l => l.id === id)
      if (index !== -1) mockLeads.splice(index, 1)
      return
    }
    
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },
  
  /**
   * Met à jour le statut d'un lead
   */
  async updateStatus(id: string, status: LeadStatus): Promise<Company> {
    const updates: UpdateCompanyInput = { status }
    if (status === 'contacted' || status === 'meeting' || status === 'proposal') {
      updates.last_contacted_at = new Date().toISOString()
    }
    return this.update(id, updates)
  },
  
  /**
   * Ajoute une note à un lead
   */
  async addNote(input: CreateNoteInput): Promise<Note> {
    if (USE_MOCK) {
      const note: Note = {
        ...input,
        id: `note-${Date.now()}`,
        created_at: new Date().toISOString()
      }
      const lead = mockLeads.find(l => l.id === input.company_id)
      if (lead) lead.notes.unshift(note)
      return note
    }
    
    const { data, error } = await supabase
      .from('notes')
      .insert(input)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}

// ============================================
// Dashboard / Stats API
// ============================================
export const statsApi = {
  /**
   * Récupère les stats du dashboard
   */
  async getStats(): Promise<DashboardStats> {
    if (USE_MOCK) {
      return mockDashboardStats
    }
    
    // Requêtes Supabase pour calculer les stats
    const { data: companies, error } = await supabase
      .from('companies')
      .select('status, priority, has_website, sector, prospect_score, created_at')
    
    if (error) throw error
    
    const total = companies?.length || 0
    const withoutSite = companies?.filter(c => !c.has_website).length || 0
    const needingRefonte = companies?.filter(c => c.has_website && c.prospect_score >= 60).length || 0
    
    const byStatus = {
      new: companies?.filter(c => c.status === 'new').length || 0,
      contacted: companies?.filter(c => c.status === 'contacted').length || 0,
      meeting: companies?.filter(c => c.status === 'meeting').length || 0,
      proposal: companies?.filter(c => c.status === 'proposal').length || 0,
      won: companies?.filter(c => c.status === 'won').length || 0,
      lost: companies?.filter(c => c.status === 'lost').length || 0,
    }
    
    const byPriority = {
      hot: companies?.filter(c => c.priority === 'hot').length || 0,
      warm: companies?.filter(c => c.priority === 'warm').length || 0,
      cold: companies?.filter(c => c.priority === 'cold').length || 0,
    }
    
    // Calcul des secteurs
    const sectorCounts: Record<string, number> = {}
    companies?.forEach(c => {
      if (c.sector) {
        sectorCounts[c.sector] = (sectorCounts[c.sector] || 0) + 1
      }
    })
    
    const topSectors = Object.entries(sectorCounts)
      .map(([sector, count]) => ({ sector: sector as any, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
    
    return {
      total_leads: total,
      leads_without_site: withoutSite,
      leads_needing_refonte: needingRefonte,
      hot_leads: byPriority.hot,
      warm_leads: byPriority.warm,
      cold_leads: byPriority.cold,
      by_status: byStatus,
      trend: [], // À implémenter avec des requêtes groupées par date
      top_sectors: topSectors
    }
  }
}

// ============================================
// Scanner API
// ============================================
export const scannerApi = {
  /**
   * Récupère tous les scans
   */
  async getAll(): Promise<SearchScan[]> {
    if (USE_MOCK) {
      return mockScans
    }
    
    const { data, error } = await supabase
      .from('search_scans')
      .select('*')
      .order('started_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },
  
  /**
   * Récupère un scan par ID
   */
  async getById(id: string): Promise<SearchScan | null> {
    if (USE_MOCK) {
      return mockScans.find(s => s.id === id) || null
    }
    
    const { data, error } = await supabase
      .from('search_scans')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },
  
  /**
   * Lance un nouveau scan
   */
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
    
    if (USE_MOCK) {
      const newScan: SearchScan = {
        ...scan,
        id: `scan-${Date.now()}`
      }
      mockScans.unshift(newScan)
      return newScan
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

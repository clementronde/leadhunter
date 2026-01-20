// ============================================
// LEADHUNTER - Types principaux
// ============================================

// Statuts CRM pour le pipeline de prospection
export type LeadStatus = 
  | 'new'        // Nouveau lead détecté
  | 'contacted'  // Premier contact effectué
  | 'meeting'    // RDV planifié
  | 'proposal'   // Devis envoyé
  | 'won'        // Client gagné
  | 'lost'       // Perdu

// Priorité calculée selon le score
export type Priority = 'hot' | 'warm' | 'cold'

// Source de la donnée
export type DataSource = 'google_places' | 'sirene' | 'manual' | 'import'

// Secteurs d'activité
export type Sector = 
  | 'restaurant'
  | 'retail'
  | 'health'
  | 'beauty'
  | 'construction'
  | 'professional_services'
  | 'real_estate'
  | 'automotive'
  | 'education'
  | 'other'

// ============================================
// Entreprise / Lead
// ============================================
export interface Company {
  id: string
  name: string
  address: string | null
  city: string
  postal_code: string
  coordinates: { lat: number; lng: number } | null
  phone: string | null
  email: string | null
  siret: string | null
  sector: Sector | null
  source: DataSource
  
  // Website info
  website: string | null
  has_website: boolean
  
  // Scoring (0-100)
  prospect_score: number
  priority: Priority
  
  // CRM
  status: LeadStatus
  notes: Note[]
  last_contacted_at: string | null
  
  // Metadata
  created_at: string
  updated_at: string
  
  // Relations
  audit?: WebsiteAudit | null
}

// ============================================
// Audit de site web
// ============================================
export interface WebsiteAudit {
  id: string
  company_id: string
  url: string
  
  // Scores Lighthouse (0-100)
  performance_score: number | null
  accessibility_score: number | null
  seo_score: number | null
  best_practices_score: number | null
  
  // Technique
  is_https: boolean
  is_mobile_friendly: boolean
  load_time_ms: number | null
  
  // Stack détectée
  cms: string | null           // WordPress, Wix, Squarespace, etc.
  cms_version: string | null
  framework: string | null     // React, Vue, etc.
  is_outdated: boolean
  
  // Visuel
  screenshot_url: string | null
  
  // Problèmes détectés
  issues: AuditIssue[]
  
  // Score global calculé (0-100, plus c'est bas = plus de potentiel)
  overall_score: number
  
  audited_at: string
}

// ============================================
// Problème détecté lors d'un audit
// ============================================
export type IssueType = 
  | 'performance'
  | 'security'
  | 'seo'
  | 'mobile'
  | 'outdated'
  | 'design'
  | 'accessibility'

export type IssueSeverity = 'critical' | 'warning' | 'info'

export interface AuditIssue {
  type: IssueType
  severity: IssueSeverity
  title: string
  message: string
  recommendation: string
}

// ============================================
// Notes / Commentaires
// ============================================
export interface Note {
  id: string
  company_id: string
  content: string
  created_at: string
}

// ============================================
// Scan de recherche
// ============================================
export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface SearchScan {
  id: string
  query: string                    // "restaurants Boulogne-Billancourt"
  location: {
    lat: number
    lng: number
    radius: number                 // en mètres
  }
  sector_filter: Sector | null
  
  // État
  status: ScanStatus
  progress: number                 // 0-100
  
  // Résultats
  companies_found: number
  companies_without_site: number
  companies_needing_refonte: number
  
  // Timing
  started_at: string
  completed_at: string | null
  
  // Erreur éventuelle
  error_message: string | null
}

// ============================================
// Stats pour le dashboard
// ============================================
export interface DashboardStats {
  total_leads: number
  leads_without_site: number
  leads_needing_refonte: number
  hot_leads: number
  warm_leads: number
  cold_leads: number
  
  // Par statut CRM
  by_status: Record<LeadStatus, number>
  
  // Évolution (7 derniers jours)
  trend: {
    date: string
    new_leads: number
    contacted: number
  }[]
  
  // Top secteurs
  top_sectors: {
    sector: Sector
    count: number
  }[]
}

// ============================================
// Filtres pour la liste des leads
// ============================================
export interface LeadFilters {
  search?: string
  city?: string
  sector?: Sector
  status?: LeadStatus
  priority?: Priority
  has_website?: boolean
  min_score?: number
  max_score?: number
}

// ============================================
// Pagination
// ============================================
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

// ============================================
// API Response types
// ============================================
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// ============================================
// Création / Mise à jour
// ============================================
export type CreateCompanyInput = Omit<Company, 'id' | 'created_at' | 'updated_at' | 'notes' | 'audit'>

export type UpdateCompanyInput = Partial<Omit<Company, 'id' | 'created_at' | 'notes' | 'audit'>>

export type CreateNoteInput = Omit<Note, 'id' | 'created_at'>

import { Company, WebsiteAudit, SearchScan, DashboardStats, Note } from '@/types'

// ============================================
// Mock Companies / Leads
// ============================================
export const mockLeads: Company[] = [
  {
    id: '1',
    name: 'Boulangerie Martin',
    address: '15 Rue de Paris',
    city: 'Boulogne-Billancourt',
    postal_code: '92100',
    coordinates: { lat: 48.8417, lng: 2.2394 },
    phone: '01 46 05 12 34',
    email: null,
    siret: '12345678901234',
    sector: 'retail',
    source: 'google_places',
    website: null,
    has_website: false,
    prospect_score: 95,
    priority: 'hot',
    status: 'new',
    notes: [],
    last_contacted_at: null,
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    name: 'Restaurant Le Petit Nice',
    address: '42 Avenue Jean-Baptiste Clément',
    city: 'Boulogne-Billancourt',
    postal_code: '92100',
    coordinates: { lat: 48.8396, lng: 2.2419 },
    phone: '01 46 03 98 76',
    email: 'contact@lepetitnice.fr',
    siret: '98765432109876',
    sector: 'restaurant',
    source: 'google_places',
    website: 'http://lepetitnice.fr',
    has_website: true,
    prospect_score: 72,
    priority: 'warm',
    status: 'contacted',
    notes: [
      { id: 'n1', company_id: '2', content: 'Appelé le 10/01 - intéressé mais pas dispo avant mars', created_at: '2024-01-10T14:00:00Z' }
    ],
    last_contacted_at: '2024-01-10T14:00:00Z',
    created_at: '2024-01-08T09:15:00Z',
    updated_at: '2024-01-10T14:00:00Z',
    audit: {
      id: 'a2',
      company_id: '2',
      url: 'http://lepetitnice.fr',
      performance_score: 35,
      accessibility_score: 62,
      seo_score: 45,
      best_practices_score: 58,
      is_https: false,
      is_mobile_friendly: false,
      load_time_ms: 4500,
      cms: 'WordPress',
      cms_version: '4.9.8',
      framework: null,
      is_outdated: true,
      screenshot_url: null,
      issues: [
        { type: 'security', severity: 'critical', title: 'Pas de HTTPS', message: 'Le site n\'utilise pas de certificat SSL', recommendation: 'Installer un certificat SSL Let\'s Encrypt' },
        { type: 'mobile', severity: 'critical', title: 'Non responsive', message: 'Le site n\'est pas adapté aux mobiles', recommendation: 'Refonte responsive ou thème adaptatif' },
        { type: 'outdated', severity: 'warning', title: 'WordPress obsolète', message: 'Version 4.9.8 (actuelle: 6.4)', recommendation: 'Mise à jour vers la dernière version' },
        { type: 'performance', severity: 'warning', title: 'Temps de chargement', message: '4.5s (recommandé: <3s)', recommendation: 'Optimisation des images et mise en cache' }
      ],
      overall_score: 38,
      audited_at: '2024-01-08T09:20:00Z'
    }
  },
  {
    id: '3',
    name: 'Garage Auto Plus',
    address: '8 Rue Guynemer',
    city: 'Issy-les-Moulineaux',
    postal_code: '92130',
    coordinates: { lat: 48.8234, lng: 2.2567 },
    phone: '01 41 08 45 67',
    email: 'contact@autoplus92.com',
    siret: '45678901234567',
    sector: 'automotive',
    source: 'sirene',
    website: 'https://autoplus92.com',
    has_website: true,
    prospect_score: 45,
    priority: 'cold',
    status: 'proposal',
    notes: [
      { id: 'n2', company_id: '3', content: 'Devis envoyé: 3500€ pour refonte complète', created_at: '2024-01-12T16:30:00Z' },
      { id: 'n3', company_id: '3', content: 'RDV effectué, ils hésitent avec un autre prestataire', created_at: '2024-01-11T11:00:00Z' }
    ],
    last_contacted_at: '2024-01-12T16:30:00Z',
    created_at: '2024-01-05T08:00:00Z',
    updated_at: '2024-01-12T16:30:00Z',
    audit: {
      id: 'a3',
      company_id: '3',
      url: 'https://autoplus92.com',
      performance_score: 78,
      accessibility_score: 85,
      seo_score: 72,
      best_practices_score: 80,
      is_https: true,
      is_mobile_friendly: true,
      load_time_ms: 2100,
      cms: 'Wix',
      cms_version: null,
      framework: null,
      is_outdated: false,
      screenshot_url: null,
      issues: [
        { type: 'seo', severity: 'info', title: 'Meta descriptions', message: 'Quelques pages sans meta description', recommendation: 'Compléter les meta descriptions' }
      ],
      overall_score: 78,
      audited_at: '2024-01-05T08:05:00Z'
    }
  },
  {
    id: '4',
    name: 'Coiffure Élégance',
    address: '23 Rue du Château',
    city: 'Boulogne-Billancourt',
    postal_code: '92100',
    coordinates: { lat: 48.8445, lng: 2.2356 },
    phone: '01 46 04 33 22',
    email: null,
    siret: '78901234567890',
    sector: 'beauty',
    source: 'google_places',
    website: null,
    has_website: false,
    prospect_score: 92,
    priority: 'hot',
    status: 'meeting',
    notes: [
      { id: 'n4', company_id: '4', content: 'RDV prévu jeudi 18/01 à 14h', created_at: '2024-01-16T09:00:00Z' }
    ],
    last_contacted_at: '2024-01-16T09:00:00Z',
    created_at: '2024-01-14T11:20:00Z',
    updated_at: '2024-01-16T09:00:00Z',
  },
  {
    id: '5',
    name: 'Cabinet Dr. Dupont',
    address: '5 Avenue de Verdun',
    city: 'Meudon',
    postal_code: '92190',
    coordinates: { lat: 48.8123, lng: 2.2345 },
    phone: '01 45 07 88 99',
    email: 'secretariat@drdupont.fr',
    siret: '56789012345678',
    sector: 'health',
    source: 'manual',
    website: 'https://drdupont.fr',
    has_website: true,
    prospect_score: 28,
    priority: 'cold',
    status: 'lost',
    notes: [
      { id: 'n5', company_id: '5', content: 'Pas intéressé - site refait l\'année dernière', created_at: '2024-01-09T10:15:00Z' }
    ],
    last_contacted_at: '2024-01-09T10:15:00Z',
    created_at: '2024-01-07T15:45:00Z',
    updated_at: '2024-01-09T10:15:00Z',
    audit: {
      id: 'a5',
      company_id: '5',
      url: 'https://drdupont.fr',
      performance_score: 92,
      accessibility_score: 88,
      seo_score: 95,
      best_practices_score: 90,
      is_https: true,
      is_mobile_friendly: true,
      load_time_ms: 1200,
      cms: 'WordPress',
      cms_version: '6.4',
      framework: null,
      is_outdated: false,
      screenshot_url: null,
      issues: [],
      overall_score: 91,
      audited_at: '2024-01-07T15:50:00Z'
    }
  },
  {
    id: '6',
    name: 'Fleuriste Les Roses',
    address: '78 Rue de Silly',
    city: 'Boulogne-Billancourt',
    postal_code: '92100',
    coordinates: { lat: 48.8398, lng: 2.2378 },
    phone: '01 46 21 55 66',
    email: null,
    siret: null,
    sector: 'retail',
    source: 'google_places',
    website: null,
    has_website: false,
    prospect_score: 88,
    priority: 'hot',
    status: 'new',
    notes: [],
    last_contacted_at: null,
    created_at: '2024-01-17T08:30:00Z',
    updated_at: '2024-01-17T08:30:00Z',
  },
  {
    id: '7',
    name: 'Pizzeria Bella Napoli',
    address: '112 Boulevard Jean Jaurès',
    city: 'Boulogne-Billancourt',
    postal_code: '92100',
    coordinates: { lat: 48.8367, lng: 2.2456 },
    phone: '01 46 99 12 34',
    email: 'bellanapoli@gmail.com',
    siret: '34567890123456',
    sector: 'restaurant',
    source: 'google_places',
    website: 'http://bella-napoli-boulogne.fr',
    has_website: true,
    prospect_score: 68,
    priority: 'warm',
    status: 'contacted',
    notes: [
      { id: 'n6', company_id: '7', content: 'Mail envoyé, pas de réponse', created_at: '2024-01-13T11:00:00Z' }
    ],
    last_contacted_at: '2024-01-13T11:00:00Z',
    created_at: '2024-01-11T14:00:00Z',
    updated_at: '2024-01-13T11:00:00Z',
    audit: {
      id: 'a7',
      company_id: '7',
      url: 'http://bella-napoli-boulogne.fr',
      performance_score: 42,
      accessibility_score: 55,
      seo_score: 38,
      best_practices_score: 45,
      is_https: false,
      is_mobile_friendly: true,
      load_time_ms: 3800,
      cms: null,
      cms_version: null,
      framework: null,
      is_outdated: true,
      screenshot_url: null,
      issues: [
        { type: 'security', severity: 'critical', title: 'Pas de HTTPS', message: 'Le site n\'utilise pas de certificat SSL', recommendation: 'Installer un certificat SSL' },
        { type: 'performance', severity: 'warning', title: 'Performance faible', message: 'Score Lighthouse: 42/100', recommendation: 'Optimisation complète nécessaire' },
        { type: 'seo', severity: 'warning', title: 'SEO insuffisant', message: 'Nombreux problèmes SEO détectés', recommendation: 'Audit SEO et corrections' }
      ],
      overall_score: 42,
      audited_at: '2024-01-11T14:05:00Z'
    }
  },
  {
    id: '8',
    name: 'Pharmacie du Centre',
    address: '1 Place Marcel Sembat',
    city: 'Boulogne-Billancourt',
    postal_code: '92100',
    coordinates: { lat: 48.8412, lng: 2.2389 },
    phone: '01 46 05 00 11',
    email: 'pharmacie.centre@orange.fr',
    siret: '23456789012345',
    sector: 'health',
    source: 'sirene',
    website: null,
    has_website: false,
    prospect_score: 75,
    priority: 'warm',
    status: 'new',
    notes: [],
    last_contacted_at: null,
    created_at: '2024-01-16T16:00:00Z',
    updated_at: '2024-01-16T16:00:00Z',
  },
]

// ============================================
// Mock Scans
// ============================================
export const mockScans: SearchScan[] = [
  {
    id: 's1',
    query: 'commerces Boulogne-Billancourt',
    location: { lat: 48.8417, lng: 2.2394, radius: 2000 },
    sector_filter: null,
    status: 'completed',
    progress: 100,
    companies_found: 45,
    companies_without_site: 12,
    companies_needing_refonte: 18,
    started_at: '2024-01-15T10:00:00Z',
    completed_at: '2024-01-15T10:15:00Z',
    error_message: null
  },
  {
    id: 's2',
    query: 'restaurants Issy-les-Moulineaux',
    location: { lat: 48.8234, lng: 2.2567, radius: 1500 },
    sector_filter: 'restaurant',
    status: 'completed',
    progress: 100,
    companies_found: 23,
    companies_without_site: 5,
    companies_needing_refonte: 11,
    started_at: '2024-01-14T14:30:00Z',
    completed_at: '2024-01-14T14:42:00Z',
    error_message: null
  },
]

// ============================================
// Mock Dashboard Stats
// ============================================
export const mockDashboardStats: DashboardStats = {
  total_leads: 8,
  leads_without_site: 4,
  leads_needing_refonte: 3,
  hot_leads: 3,
  warm_leads: 3,
  cold_leads: 2,
  
  by_status: {
    new: 4,
    contacted: 2,
    meeting: 1,
    proposal: 1,
    won: 0,
    lost: 1
  },
  
  trend: [
    { date: '2024-01-11', new_leads: 2, contacted: 1 },
    { date: '2024-01-12', new_leads: 1, contacted: 0 },
    { date: '2024-01-13', new_leads: 0, contacted: 1 },
    { date: '2024-01-14', new_leads: 3, contacted: 0 },
    { date: '2024-01-15', new_leads: 1, contacted: 1 },
    { date: '2024-01-16', new_leads: 2, contacted: 0 },
    { date: '2024-01-17', new_leads: 1, contacted: 0 },
  ],
  
  top_sectors: [
    { sector: 'retail', count: 2 },
    { sector: 'restaurant', count: 2 },
    { sector: 'health', count: 2 },
    { sector: 'beauty', count: 1 },
    { sector: 'automotive', count: 1 },
  ]
}

// ============================================
// Helper pour simuler un délai
// ============================================
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// ============================================
// Mock API functions
// ============================================
export const mockApi = {
  async getLeads() {
    await delay(500)
    return mockLeads
  },
  
  async getLead(id: string) {
    await delay(300)
    return mockLeads.find(l => l.id === id) || null
  },
  
  async getStats() {
    await delay(400)
    return mockDashboardStats
  },
  
  async getScans() {
    await delay(300)
    return mockScans
  }
}

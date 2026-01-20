import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Priority, LeadStatus, Sector, AuditIssue, IssueSeverity } from '@/types'

// ============================================
// Tailwind class merger
// ============================================
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================
// Scoring Algorithm
// ============================================

interface ScoreFactors {
  hasWebsite: boolean
  performanceScore?: number | null
  seoScore?: number | null
  isHttps?: boolean
  isMobileFriendly?: boolean
  isOutdated?: boolean
  issuesCount?: number
}

/**
 * Calcule le score de prospect (0-100)
 * Plus le score est élevé, plus l'entreprise est un bon prospect
 */
export function calculateProspectScore(factors: ScoreFactors): number {
  let score = 50 // Base

  // Pas de site web = prospect idéal
  if (!factors.hasWebsite) {
    return 95
  }

  // Mauvaise performance = bon prospect
  if (factors.performanceScore !== undefined && factors.performanceScore !== null) {
    if (factors.performanceScore < 30) score += 25
    else if (factors.performanceScore < 50) score += 15
    else if (factors.performanceScore < 70) score += 5
    else score -= 10
  }

  // Mauvais SEO = bon prospect
  if (factors.seoScore !== undefined && factors.seoScore !== null) {
    if (factors.seoScore < 30) score += 20
    else if (factors.seoScore < 50) score += 10
    else if (factors.seoScore < 70) score += 5
    else score -= 5
  }

  // Pas de HTTPS = bon prospect
  if (factors.isHttps === false) {
    score += 15
  }

  // Pas mobile-friendly = bon prospect
  if (factors.isMobileFriendly === false) {
    score += 20
  }

  // Technologies obsolètes = bon prospect
  if (factors.isOutdated) {
    score += 15
  }

  // Nombre de problèmes
  if (factors.issuesCount !== undefined) {
    score += Math.min(factors.issuesCount * 3, 15)
  }

  return Math.max(0, Math.min(100, score))
}

/**
 * Détermine la priorité en fonction du score
 */
export function getPriorityFromScore(score: number): Priority {
  if (score >= 75) return 'hot'
  if (score >= 50) return 'warm'
  return 'cold'
}

// ============================================
// Formatters
// ============================================

export const statusLabels: Record<LeadStatus, string> = {
  new: 'Nouveau',
  contacted: 'Contacté',
  meeting: 'RDV',
  proposal: 'Devis envoyé',
  won: 'Gagné',
  lost: 'Perdu'
}

export const statusColors: Record<LeadStatus, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  meeting: 'bg-purple-100 text-purple-800',
  proposal: 'bg-orange-100 text-orange-800',
  won: 'bg-green-100 text-green-800',
  lost: 'bg-gray-100 text-gray-800'
}

export const priorityLabels: Record<Priority, string> = {
  hot: '🔥 Chaud',
  warm: '🌤️ Tiède',
  cold: '❄️ Froid'
}

export const priorityColors: Record<Priority, string> = {
  hot: 'bg-red-100 text-red-800 border-red-200',
  warm: 'bg-amber-100 text-amber-800 border-amber-200',
  cold: 'bg-sky-100 text-sky-800 border-sky-200'
}

export const sectorLabels: Record<Sector, string> = {
  restaurant: '🍽️ Restaurant',
  retail: '🛍️ Commerce',
  health: '🏥 Santé',
  beauty: '💇 Beauté',
  construction: '🏗️ BTP',
  professional_services: '💼 Services',
  real_estate: '🏠 Immobilier',
  automotive: '🚗 Automobile',
  education: '📚 Éducation',
  other: '📦 Autre'
}

export const severityColors: Record<IssueSeverity, string> = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  warning: 'bg-amber-100 text-amber-800 border-amber-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200'
}

// ============================================
// Date helpers
// ============================================

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

export function timeAgo(date: string | Date): string {
  const now = new Date()
  const past = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000)
  
  if (diffInSeconds < 60) return "À l'instant"
  if (diffInSeconds < 3600) return `Il y a ${Math.floor(diffInSeconds / 60)} min`
  if (diffInSeconds < 86400) return `Il y a ${Math.floor(diffInSeconds / 3600)}h`
  if (diffInSeconds < 604800) return `Il y a ${Math.floor(diffInSeconds / 86400)} jours`
  
  return formatDate(date)
}

// ============================================
// URL helpers
// ============================================

export function normalizeUrl(url: string): string {
  if (!url) return ''
  
  let normalized = url.trim().toLowerCase()
  
  // Ajouter le protocole si manquant
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized
  }
  
  // Retirer le trailing slash
  normalized = normalized.replace(/\/$/, '')
  
  return normalized
}

export function getDomain(url: string): string {
  try {
    const parsed = new URL(normalizeUrl(url))
    return parsed.hostname.replace('www.', '')
  } catch {
    return url
  }
}

// ============================================
// Validation
// ============================================

export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s.-]/g, '')
  return /^(\+33|0)[1-9][0-9]{8}$/.test(cleaned)
}

export function isValidSiret(siret: string): boolean {
  const cleaned = siret.replace(/\s/g, '')
  return /^\d{14}$/.test(cleaned)
}

// ============================================
// Score display helpers
// ============================================

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-red-600'   // Hot prospect
  if (score >= 60) return 'text-amber-600' // Warm
  if (score >= 40) return 'text-blue-600'  // Lukewarm
  return 'text-gray-400'                   // Cold
}

export function getScoreBackground(score: number): string {
  if (score >= 80) return 'bg-red-500'
  if (score >= 60) return 'bg-amber-500'
  if (score >= 40) return 'bg-blue-500'
  return 'bg-gray-300'
}

export function getLighthouseColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return 'text-gray-400'
  if (score >= 90) return 'text-green-600'
  if (score >= 50) return 'text-amber-600'
  return 'text-red-600'
}

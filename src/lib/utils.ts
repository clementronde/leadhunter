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

export interface ScoreFactors {
  hasWebsite: boolean
  // 'social' / 'directory' = visible en ligne mais sans vrai site ; 'unknown' = non vérifié (ex: Sirene)
  webPresence?: 'website' | 'social' | 'directory' | 'none' | 'unknown'
  performanceScore?: number | null
  seoScore?: number | null
  isHttps?: boolean
  isMobileFriendly?: boolean
  isOutdated?: boolean
  copyrightYear?: number | null
  // Note IA de 1 (moderne) à 10 (très daté) à partir de la capture d'écran
  designDatedScore?: number | null
  issuesCount?: number
  // Signaux d'activité : une entreprise avec des avis tourne et peut payer
  googleReviewsCount?: number | null
  googleRating?: number | null
}

/**
 * Calcule le score de prospect (0-100) et les raisons qui l'expliquent.
 * Plus le score est élevé, plus l'entreprise a besoin d'un site ET a les moyens d'en payer un.
 */
export function scoreProspect(factors: ScoreFactors): { score: number; reasons: string[] } {
  const reasons: string[] = []
  const reviews = factors.googleReviewsCount ?? null
  let score: number

  if (!factors.hasWebsite) {
    if (factors.webPresence === 'unknown') {
      score = 45
      reasons.push('Présence web non vérifiée')
    } else {
      score = 55
      reasons.push('Pas de site web')
    }

    if (factors.webPresence === 'social') {
      score += 15
      reasons.push('Présent seulement sur les réseaux sociaux')
    } else if (factors.webPresence === 'directory') {
      score += 12
      reasons.push('Présent seulement sur un annuaire')
    }
  } else {
    score = 40

    if (factors.performanceScore !== undefined && factors.performanceScore !== null) {
      if (factors.performanceScore < 30) { score += 20; reasons.push(`Site très lent (${factors.performanceScore}/100)`) }
      else if (factors.performanceScore < 50) { score += 12; reasons.push(`Site lent (${factors.performanceScore}/100)`) }
      else if (factors.performanceScore < 70) score += 4
      else if (factors.performanceScore >= 90) score -= 10
    }

    if (factors.seoScore !== undefined && factors.seoScore !== null) {
      if (factors.seoScore < 50) { score += 8; reasons.push(`SEO faible (${factors.seoScore}/100)`) }
      else if (factors.seoScore < 70) score += 3
    }

    if (factors.isHttps === false) {
      score += 15
      reasons.push('Pas de HTTPS')
    }

    if (factors.isMobileFriendly === false) {
      score += 20
      reasons.push('Pas adapté au mobile')
    }

    if (factors.isOutdated) {
      score += 15
      reasons.push('Technologies obsolètes')
    }

    if (factors.copyrightYear) {
      const age = new Date().getFullYear() - factors.copyrightYear
      if (age >= 5) { score += 10; reasons.push(`Site pas mis à jour depuis ${factors.copyrightYear}`) }
      else if (age >= 3) score += 5
    }

    if (factors.designDatedScore) {
      if (factors.designDatedScore >= 8) { score += 15; reasons.push(`Design très daté (${factors.designDatedScore}/10)`) }
      else if (factors.designDatedScore >= 6) { score += 8; reasons.push(`Design vieillissant (${factors.designDatedScore}/10)`) }
      else if (factors.designDatedScore <= 3) score -= 8
    }

    if (factors.issuesCount !== undefined) {
      score += Math.min(factors.issuesCount * 2, 10)
    }
  }

  // Activité réelle de l'entreprise (avis Google)
  if (reviews !== null) {
    if (reviews >= 50) { score += factors.hasWebsite ? 8 : 20; reasons.push(`${reviews} avis Google : entreprise active`) }
    else if (reviews >= 20) { score += factors.hasWebsite ? 5 : 15; reasons.push(`${reviews} avis Google`) }
    else if (reviews >= 5) score += factors.hasWebsite ? 2 : 8
    else if (reviews === 0) { score -= 10; reasons.push('Aucun avis Google') }
  }

  if ((factors.googleRating ?? 0) >= 4.3 && (reviews ?? 0) >= 20) {
    score += 5
  }

  return { score: Math.max(0, Math.min(100, score)), reasons }
}

export function calculateProspectScore(factors: ScoreFactors): number {
  return scoreProspect(factors).score
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
  new: 'bg-blue-500/15 text-blue-300',
  contacted: 'bg-yellow-500/15 text-yellow-300',
  meeting: 'bg-purple-500/15 text-purple-300',
  proposal: 'bg-orange-500/15 text-orange-300',
  won: 'bg-green-500/15 text-green-300',
  lost: 'bg-zinc-500/15 text-zinc-400'
}

export const priorityLabels: Record<Priority, string> = {
  hot: '🔥 Chaud',
  warm: '🌤️ Tiède',
  cold: '❄️ Froid'
}

export const priorityColors: Record<Priority, string> = {
  hot: 'bg-red-500/15 text-red-300 border-red-500/30',
  warm: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  cold: 'bg-sky-500/15 text-sky-300 border-sky-500/30'
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
  critical: 'bg-red-500/15 text-red-300 border-red-500/30',
  warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  info: 'bg-blue-500/15 text-blue-300 border-blue-500/30'
}

// ============================================
// Date helpers
// ============================================

/** Délai avant relance après un premier contact sans réponse */
export const FOLLOWUP_DELAY_DAYS = 7

/** Date de relance prévue : dernier contact + 7 jours, tant que le lead n'a pas répondu */
export function getFollowUpDate(lead: { status: string; last_contacted_at?: string | null; replied_at?: string | null }): Date | null {
  if (lead.status !== 'contacted' || lead.replied_at || !lead.last_contacted_at) return null
  return new Date(new Date(lead.last_contacted_at).getTime() + FOLLOWUP_DELAY_DAYS * 24 * 60 * 60 * 1000)
}

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
  // Mêmes seuils que getPriorityFromScore
  if (score >= 75) return 'text-red-400'   // Hot
  if (score >= 50) return 'text-amber-400' // Warm
  return 'text-blue-400'                   // Cold
}

export function getScoreBackground(score: number): string {
  if (score >= 80) return 'bg-red-500'
  if (score >= 60) return 'bg-amber-500'
  if (score >= 40) return 'bg-blue-500'
  return 'bg-gray-300'
}

export function getLighthouseColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return 'text-gray-400'
  if (score >= 90) return 'text-green-400'
  if (score >= 50) return 'text-amber-400'
  return 'text-red-400'
}

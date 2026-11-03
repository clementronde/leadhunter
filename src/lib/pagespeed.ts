/**
 * Service d'audit de sites web avec Google PageSpeed Insights API
 * Documentation : https://developers.google.com/speed/docs/insights/v5/get-started
 * 
 * L'API est gratuite jusqu'à 25,000 requêtes/jour sans clé
 * Avec une clé API : 25,000 requêtes/jour (plus fiable)
 */

import { AuditIssue, WebsiteAudit } from '@/types'
import { scoreProspect, type ScoreFactors } from './utils'
import { analyzeSiteSignals, siteSignalsToIssues } from './site-signals'

interface LighthouseCategory {
  id: string
  title: string
  score: number | null
}

interface LighthouseAudit {
  id: string
  title: string
  description: string
  score: number | null
  displayValue?: string
  numericValue?: number
  details?: { type?: string; data?: string }
}

interface PageSpeedResponse {
  captchaResult?: string
  kind: string
  id: string
  loadingExperience?: {
    metrics: Record<string, any>
    overall_category: string
  }
  lighthouseResult: {
    requestedUrl: string
    finalUrl: string
    lighthouseVersion: string
    fetchTime: string
    runWarnings: string[]
    categories: {
      performance?: LighthouseCategory
      accessibility?: LighthouseCategory
      'best-practices'?: LighthouseCategory
      seo?: LighthouseCategory
    }
    audits: Record<string, LighthouseAudit>
    stackPacks?: Array<{
      id: string
      title: string
      iconDataURL: string
      descriptions: Record<string, string>
    }>
  }
  analysisUTCTimestamp: string
}

/**
 * Analyse un site web avec PageSpeed Insights
 */
export async function analyzeWebsite(url: string): Promise<{
  success: boolean
  data?: Partial<WebsiteAudit>
  // Capture mobile de la page (data URI JPEG), à stocker à part : ce n'est pas une colonne
  screenshot?: string
  error?: string
}> {
  try {
    // Normaliser l'URL
    let normalizedUrl = url.trim()
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl
    }

    // Signaux "site vieux" (HTML de la page d'accueil) en parallèle de PageSpeed
    const signalsPromise = analyzeSiteSignals(normalizedUrl)

    // Construire l'URL de l'API
    const apiUrl = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed')
    apiUrl.searchParams.set('url', normalizedUrl)
    apiUrl.searchParams.append('category', 'performance')
    apiUrl.searchParams.append('category', 'accessibility')
    apiUrl.searchParams.append('category', 'best-practices')
    apiUrl.searchParams.append('category', 'seo')
    apiUrl.searchParams.set('strategy', 'mobile') // Test sur mobile (plus strict)

    // Ajouter la clé API si disponible
    if (process.env.PAGESPEED_API_KEY) {
      apiUrl.searchParams.set('key', process.env.PAGESPEED_API_KEY)
    }

    // PageSpeed mobile prend souvent 25 à 45 s : 2 tentatives de 55 s max
    let response: Response | null = null
    let lastError = ''
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        response = await fetch(apiUrl.toString(), {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(55000),
        })
        if (response.ok) break
        lastError = `HTTP ${response.status}`
        console.warn(`PageSpeed tentative ${attempt}/2 échouée: ${lastError} (${normalizedUrl})`)
        // 400 = site injoignable ou URL refusée : inutile de réessayer
        if (response.status >= 400 && response.status < 500 && response.status !== 429) break
      } catch (e) {
        lastError = e instanceof Error ? e.message : 'timeout'
        console.warn(`PageSpeed tentative ${attempt}/2 échouée: ${lastError} (${normalizedUrl})`)
        response = null
      }
      if (attempt < 2) await new Promise((r) => setTimeout(r, 2000))
    }

    if (!response?.ok) {
      return { success: false, error: `PageSpeed API error: ${lastError}` }
    }

    const data: PageSpeedResponse = await response.json()
    const lighthouse = data.lighthouseResult
    const categories = lighthouse.categories
    const audits = lighthouse.audits

    // Extraire les scores (0-100) — attention : un score de 0 est un vrai score (site catastrophique)
    const toPercent = (category?: LighthouseCategory) =>
      typeof category?.score === 'number' ? Math.round(category.score * 100) : null
    const performanceScore = toPercent(categories.performance)
    const accessibilityScore = toPercent(categories.accessibility)
    const seoScore = toPercent(categories.seo)
    const bestPracticesScore = toPercent(categories['best-practices'])

    // Détecter HTTPS
    const isHttps = lighthouse.finalUrl.startsWith('https://')

    const signals = await signalsPromise

    // Détecter mobile-friendly : audit viewport si présent, sinon le HTML, sinon on ne pénalise pas
    const viewportAudit = audits['viewport']
    const isMobileFriendly = typeof viewportAudit?.score === 'number'
      ? viewportAudit.score === 1
      : signals?.has_viewport ?? true

    // Temps de chargement (Speed Index en ms)
    const speedIndex = audits['speed-index']?.numericValue
    const loadTimeMs = speedIndex ? Math.round(speedIndex) : null

    // Détecter les technologies (via stackPacks)
    let cms: string | null = signals?.cms ?? null
    const cmsVersion: string | null = signals?.cms_version ?? null
    let framework: string | null = null
    const isOutdated = signals?.is_outdated ?? false

    if (lighthouse.stackPacks) {
      for (const pack of lighthouse.stackPacks) {
        const packId = pack.id.toLowerCase()
        if (!cms && ['wordpress', 'drupal', 'joomla', 'wix', 'squarespace', 'shopify', 'magento', 'prestashop'].includes(packId)) {
          cms = pack.title
        }
        if (['react', 'vue', 'angular', 'next.js', 'nuxt', 'gatsby'].includes(packId)) {
          framework = pack.title
        }
      }
    }

    // Construire la liste des problèmes
    const issues: AuditIssue[] = signals ? siteSignalsToIssues(signals) : []

    // Problème HTTPS
    if (!isHttps) {
      issues.push({
        type: 'security',
        severity: 'critical',
        title: 'Pas de HTTPS',
        message: 'Le site n\'utilise pas de connexion sécurisée SSL/TLS',
        recommendation: 'Installer un certificat SSL (Let\'s Encrypt est gratuit)'
      })
    }

    // Problème mobile
    if (!isMobileFriendly) {
      issues.push({
        type: 'mobile',
        severity: 'critical',
        title: 'Non optimisé pour mobile',
        message: 'Le site n\'est pas correctement configuré pour les appareils mobiles',
        recommendation: 'Ajouter une balise viewport et rendre le design responsive'
      })
    }

    // Problème performance
    if (performanceScore !== null && performanceScore < 50) {
      issues.push({
        type: 'performance',
        severity: performanceScore < 25 ? 'critical' : 'warning',
        title: 'Performance insuffisante',
        message: `Score de performance: ${performanceScore}/100`,
        recommendation: 'Optimiser les images, activer la compression, utiliser le cache'
      })
    }

    // Problème SEO
    if (seoScore !== null && seoScore < 50) {
      issues.push({
        type: 'seo',
        severity: seoScore < 25 ? 'critical' : 'warning',
        title: 'SEO insuffisant',
        message: `Score SEO: ${seoScore}/100`,
        recommendation: 'Ajouter des balises meta, optimiser les titres, améliorer la structure'
      })
    }

    // Problème accessibilité
    if (accessibilityScore !== null && accessibilityScore < 50) {
      issues.push({
        type: 'accessibility',
        severity: 'warning',
        title: 'Accessibilité limitée',
        message: `Score accessibilité: ${accessibilityScore}/100`,
        recommendation: 'Ajouter des attributs alt, améliorer les contrastes, structurer les titres'
      })
    }

    // Problème temps de chargement
    if (loadTimeMs && loadTimeMs > 4000) {
      issues.push({
        type: 'performance',
        severity: loadTimeMs > 8000 ? 'critical' : 'warning',
        title: 'Temps de chargement élevé',
        message: `Speed Index: ${(loadTimeMs / 1000).toFixed(1)}s (recommandé < 3s)`,
        recommendation: 'Optimiser les ressources, utiliser un CDN, activer la compression'
      })
    }

    // Calcul du score global (inversé pour le prospect score)
    // Plus le site est mauvais, plus c'est un bon prospect
    const avgScore = [performanceScore, accessibilityScore, seoScore, bestPracticesScore]
      .filter((s): s is number => s !== null)
    const overallScore = avgScore.length > 0 
      ? Math.round(avgScore.reduce((a, b) => a + b, 0) / avgScore.length)
      : 50

    const screenshot = audits['final-screenshot']?.details?.data

    return {
      success: true,
      screenshot,
      data: {
        url: lighthouse.finalUrl,
        performance_score: performanceScore,
        accessibility_score: accessibilityScore,
        seo_score: seoScore,
        best_practices_score: bestPracticesScore,
        is_https: isHttps,
        is_mobile_friendly: isMobileFriendly,
        load_time_ms: loadTimeMs,
        cms,
        cms_version: cmsVersion,
        framework,
        is_outdated: isOutdated,
        copyright_year: signals?.copyright_year ?? null,
        site_signals: signals ?? undefined,
        issues,
        overall_score: overallScore,
        audited_at: new Date().toISOString()
      }
    }
  } catch (error) {
    console.error('Error analyzing website:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Vérifie si un site web existe et est accessible
 */
export async function checkWebsiteExists(url: string): Promise<{
  exists: boolean
  finalUrl?: string
  isHttps?: boolean
  error?: string
}> {
  try {
    let normalizedUrl = url.trim()
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl
    }

    // Essayer HTTPS d'abord
    let response = await fetch(normalizedUrl, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(10000), // Timeout 10s
    })

    if (response.ok) {
      return {
        exists: true,
        finalUrl: response.url,
        isHttps: response.url.startsWith('https://')
      }
    }

    // Essayer HTTP si HTTPS échoue
    if (normalizedUrl.startsWith('https://')) {
      const httpUrl = normalizedUrl.replace('https://', 'http://')
      response = await fetch(httpUrl, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
      })

      if (response.ok) {
        return {
          exists: true,
          finalUrl: response.url,
          isHttps: false
        }
      }
    }

    return { exists: false, error: `HTTP ${response.status}` }
  } catch (error) {
    return { 
      exists: false, 
      error: error instanceof Error ? error.message : 'Connection failed'
    }
  }
}

/**
 * Recherche un site web potentiel pour une entreprise
 * En essayant différentes variations du nom
 */
export async function findWebsiteForCompany(companyName: string, city?: string): Promise<string | null> {
  // Normaliser le nom pour créer des URLs potentielles
  const normalized = companyName
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Retirer accents
    .replace(/[^a-z0-9\s]/g, '') // Garder que lettres et chiffres
    .replace(/\s+/g, '-') // Espaces -> tirets
    .substring(0, 30) // Limiter la longueur

  // Variations à essayer
  const variations = [
    `${normalized}.fr`,
    `${normalized}.com`,
    `www.${normalized}.fr`,
    `www.${normalized}.com`,
  ]

  // Ajouter des variations avec la ville
  if (city) {
    const normalizedCity = city
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
    
    variations.push(
      `${normalized}-${normalizedCity}.fr`,
      `${normalized}${normalizedCity}.fr`
    )
  }

  // Tester chaque variation
  for (const domain of variations) {
    const result = await checkWebsiteExists(domain)
    if (result.exists) {
      return result.finalUrl || `https://${domain}`
    }
  }

  return null
}

/**
 * Calcule le score prospect à partir des données d'audit (et des avis Google du lead)
 */
export function scoreProspectFromAudit(
  audit: Partial<WebsiteAudit>,
  company?: { google_reviews_count?: number | null; google_rating?: number | null }
): { score: number; reasons: string[] } {
  const factors: ScoreFactors = {
    hasWebsite: true,
    webPresence: 'website',
    performanceScore: audit.performance_score,
    seoScore: audit.seo_score,
    isHttps: audit.is_https,
    isMobileFriendly: audit.is_mobile_friendly,
    isOutdated: audit.is_outdated,
    copyrightYear: audit.copyright_year,
    designDatedScore: audit.design_score,
    issuesCount: audit.issues?.filter((issue) => issue.severity !== 'info').length,
    googleReviewsCount: company?.google_reviews_count,
    googleRating: company?.google_rating,
  }
  return scoreProspect(factors)
}

export function calculateProspectScoreFromAudit(audit: Partial<WebsiteAudit>): number {
  return scoreProspectFromAudit(audit).score
}

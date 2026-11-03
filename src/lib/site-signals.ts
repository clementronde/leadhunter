/**
 * Détection des signaux "site vieux / pas à jour" à partir du HTML de la page d'accueil.
 * PageSpeed mesure la vitesse, pas l'âge : ici on cherche l'année du copyright,
 * les versions de CMS / jQuery et les techniques d'intégration d'une autre époque.
 */

import type { AuditIssue } from '@/types'

export interface SiteSignals {
  copyright_year: number | null
  generator: string | null
  cms: string | null
  cms_version: string | null
  jquery_version: string | null
  has_viewport: boolean
  uses_flash: boolean
  uses_table_layout: boolean
  uses_font_tags: boolean
  uses_frames: boolean
  has_favicon: boolean
  has_og_image: boolean
  is_outdated: boolean
}

const MAX_HTML_BYTES = 1_500_000

/**
 * Refuse les URLs internes (localhost, IP privées) : l'URL vient de données externes
 * (Google, import CSV) et est récupérée côté serveur.
 */
function isSafePublicUrl(url: URL): boolean {
  if (!['http:', 'https:'].includes(url.protocol)) return false
  const host = url.hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return false
  if (/^\[?::1\]?$/.test(host) || host.startsWith('[fc') || host.startsWith('[fd') || host.startsWith('[fe80')) return false
  const ipv4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])]
    if (a === 10 || a === 127 || a === 0 || a >= 224) return false
    if (a === 169 && b === 254) return false
    if (a === 172 && b >= 16 && b <= 31) return false
    if (a === 192 && b === 168) return false
    if (a === 100 && b >= 64 && b <= 127) return false
  }
  return true
}

async function fetchHomepageHtml(rawUrl: string): Promise<string | null> {
  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`)
  } catch {
    return null
  }
  if (!isSafePublicUrl(url)) return null

  try {
    const response = await fetch(url.toString(), {
      redirect: 'follow',
      signal: AbortSignal.timeout(12000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LeadHunterAudit/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
    })
    if (!response.ok) return null
    if (!isSafePublicUrl(new URL(response.url))) return null
    const contentType = response.headers.get('content-type') ?? ''
    if (contentType && !contentType.includes('html')) return null
    const html = await response.text()
    return html.slice(0, MAX_HTML_BYTES)
  } catch {
    return null
  }
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0)
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

// Versions en dessous desquelles on considère le CMS comme obsolète
const OUTDATED_CMS_BELOW: Record<string, string> = {
  WordPress: '6.0',
  Joomla: '4.0',
  Drupal: '9.0',
  PrestaShop: '8.0',
  Magento: '2.0',
  TYPO3: '11.0',
}

export function extractSiteSignals(html: string): SiteSignals {
  const currentYear = new Date().getFullYear()

  // Année de copyright : on garde la plus récente trouvée ("© 2012-2019" → 2019)
  let copyrightYear: number | null = null
  const copyrightRegex = /(?:©|&copy;|&#169;|copyright)[^<]{0,40}?((?:19|20)\d{2})(?:\s*[-–]\s*((?:19|20)\d{2}))?/gi
  for (const match of html.matchAll(copyrightRegex)) {
    const year = Number(match[2] ?? match[1])
    if (year >= 1995 && year <= currentYear && (copyrightYear === null || year > copyrightYear)) {
      copyrightYear = year
    }
  }
  // Un copyright généré en JS (new Date().getFullYear()) n'apparaît pas : ne pas conclure dans ce cas
  if (/getFullYear\(\)/.test(html) && copyrightYear !== null && copyrightYear < currentYear) {
    copyrightYear = null
  }

  const generator =
    html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']generator["']/i)?.[1] ??
    null

  let cms: string | null = null
  let cmsVersion: string | null = null
  if (generator) {
    const known = generator.match(/(WordPress|Joomla!?|Drupal|PrestaShop|Magento|TYPO3|Wix\.com|Squarespace|Webflow|Jimdo|Shopify)\s*([\d.]+)?/i)
    if (known) {
      cms = known[1].replace('!', '').replace('.com', '')
      cms = cms.charAt(0).toUpperCase() + cms.slice(1)
      if (cms.toLowerCase() === 'wordpress') cms = 'WordPress'
      if (cms.toLowerCase() === 'prestashop') cms = 'PrestaShop'
      cmsVersion = known[2] ?? null
    }
  }
  if (!cms) {
    if (/wp-content\/|wp-includes\//i.test(html)) cms = 'WordPress'
    else if (/static\.wixstatic\.com|wix\.com/i.test(html)) cms = 'Wix'
    else if (/jimdo/i.test(html)) cms = 'Jimdo'
    else if (/squarespace/i.test(html)) cms = 'Squarespace'
    else if (/cdn\.shopify\.com/i.test(html)) cms = 'Shopify'
    else if (/prestashop/i.test(html)) cms = 'PrestaShop'
  }
  if (cms === 'WordPress' && !cmsVersion) {
    cmsVersion = html.match(/wp-(?:includes|content)[^"']*\?ver=(\d+\.\d+(?:\.\d+)?)/i)?.[1] ?? null
  }

  const jqueryVersion =
    html.match(/jquery[.-](\d+\.\d+(?:\.\d+)?)(?:\.min)?\.js/i)?.[1] ??
    html.match(/jquery(?:\.min)?\.js\?ver=(\d+\.\d+(?:\.\d+)?)/i)?.[1] ??
    null

  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html)
  const usesFlash = /\.swf\b|application\/x-shockwave-flash/i.test(html)
  const usesFrames = /<frameset|<frame\s/i.test(html)
  const usesFontTags = /<font[\s>]/i.test(html)
  const tableCount = (html.match(/<table/gi) ?? []).length
  const usesTableLayout = tableCount >= 3 && !/<(?:header|nav|main|section|footer)[\s>]/i.test(html)
  const hasFavicon = /<link[^>]+rel=["'][^"']*icon[^"']*["']/i.test(html)
  const hasOgImage = /<meta[^>]+property=["']og:image["']/i.test(html)

  const outdatedCms =
    !!cms && !!cmsVersion && !!OUTDATED_CMS_BELOW[cms] && compareVersions(cmsVersion, OUTDATED_CMS_BELOW[cms]) < 0
  const outdatedJquery = !!jqueryVersion && compareVersions(jqueryVersion, '3.0') < 0

  const isOutdated =
    outdatedCms ||
    outdatedJquery ||
    usesFlash ||
    usesFrames ||
    usesFontTags ||
    usesTableLayout ||
    (copyrightYear !== null && currentYear - copyrightYear >= 5)

  return {
    copyright_year: copyrightYear,
    generator,
    cms,
    cms_version: cmsVersion,
    jquery_version: jqueryVersion,
    has_viewport: hasViewport,
    uses_flash: usesFlash,
    uses_table_layout: usesTableLayout,
    uses_font_tags: usesFontTags,
    uses_frames: usesFrames,
    has_favicon: hasFavicon,
    has_og_image: hasOgImage,
    is_outdated: isOutdated,
  }
}

export function siteSignalsToIssues(signals: SiteSignals): AuditIssue[] {
  const issues: AuditIssue[] = []
  const currentYear = new Date().getFullYear()

  if (signals.copyright_year !== null && currentYear - signals.copyright_year >= 3) {
    issues.push({
      type: 'outdated',
      severity: currentYear - signals.copyright_year >= 5 ? 'critical' : 'warning',
      title: 'Site pas mis à jour',
      message: `Le pied de page affiche © ${signals.copyright_year}`,
      recommendation: 'Mettre à jour le contenu et le design du site',
    })
  }

  if (signals.cms && signals.cms_version && OUTDATED_CMS_BELOW[signals.cms] &&
      compareVersions(signals.cms_version, OUTDATED_CMS_BELOW[signals.cms]) < 0) {
    issues.push({
      type: 'outdated',
      severity: 'critical',
      title: `${signals.cms} obsolète`,
      message: `Version ${signals.cms_version} détectée (failles de sécurité connues)`,
      recommendation: `Mettre à jour ${signals.cms} ou refondre le site`,
    })
  }

  if (signals.jquery_version && compareVersions(signals.jquery_version, '3.0') < 0) {
    issues.push({
      type: 'outdated',
      severity: 'warning',
      title: 'Librairies JavaScript anciennes',
      message: `jQuery ${signals.jquery_version} (sorti il y a plus de 10 ans)`,
      recommendation: 'Moderniser le code front-end',
    })
  }

  if (signals.uses_flash || signals.uses_frames || signals.uses_font_tags || signals.uses_table_layout) {
    const techniques = [
      signals.uses_flash && 'Flash',
      signals.uses_frames && 'frames',
      signals.uses_font_tags && 'balises <font>',
      signals.uses_table_layout && 'mise en page en tableaux',
    ].filter(Boolean)
    issues.push({
      type: 'design',
      severity: 'critical',
      title: 'Intégration d\'une autre époque',
      message: `Techniques dépassées : ${techniques.join(', ')}`,
      recommendation: 'Refondre le site avec une intégration moderne et responsive',
    })
  }

  if (!signals.has_og_image) {
    issues.push({
      type: 'seo',
      severity: 'info',
      title: 'Pas d\'aperçu pour les réseaux sociaux',
      message: 'Aucune image de partage (og:image) : les liens partagés s\'affichent sans visuel',
      recommendation: 'Ajouter les balises Open Graph',
    })
  }

  return issues
}

export async function analyzeSiteSignals(url: string): Promise<SiteSignals | null> {
  const html = await fetchHomepageHtml(url)
  if (!html) return null
  return extractSiteSignals(html)
}

import type { Company, OutreachSettings } from '@/types'

/**
 * Gestion des templates email personnalisables
 * Stockés en localStorage — pas de migration SQL nécessaire
 */

const STORAGE_KEY = 'leadhunter:email_templates'

export interface CustomTemplate {
  label: string
  subject: string  // avec variables {name}, {agency_name}, etc.
  body: string     // avec variables lead + agence
}

export type TemplateId = 'sans-site' | 'refonte' | 'generique'

export const DEFAULT_TEMPLATES: Record<TemplateId, CustomTemplate> = {
  'sans-site': {
    label: 'Sans site web',
    subject: 'Création de site web pour {name}',
    body: `Bonjour,

Je me permets de vous contacter au sujet de {name}.

J'ai remarqué que votre établissement n'a pas encore de site internet. Aujourd'hui, une présence en ligne est indispensable pour attirer de nouveaux clients et renforcer votre crédibilité.

Je serais ravi(e) de vous proposer une solution clé en main, adaptée à votre activité et à votre budget.

{personalized_reason}

Seriez-vous disponible pour un échange rapide cette semaine ?

Cordialement,

{signature}`,
  },
  refonte: {
    label: 'Refonte de site',
    subject: 'Modernisation de votre site web — {name}',
    body: `Bonjour,

Je me permets de vous contacter au sujet de votre site internet ({website}).

Après analyse, j'ai identifié plusieurs points d'amélioration qui pourraient significativement augmenter votre visibilité et votre taux de conversion : performances, compatibilité mobile, et SEO.

{personalized_reason}

Je serais heureux(se) de vous présenter nos solutions de refonte, adaptées aux dernières attentes des moteurs de recherche.

Êtes-vous disponible pour un appel de 15 minutes cette semaine ?

Cordialement,

{signature}`,
  },
  generique: {
    label: 'Contact général',
    subject: 'Proposition de collaboration — {name}',
    body: `Bonjour,

Je me permets de vous contacter concernant {name}.

Dans le cadre de mon activité de création et refonte de sites web, je travaille avec de nombreuses entreprises locales pour améliorer leur présence digitale.

{personalized_reason}

Je serais ravi(e) d'échanger avec vous sur vos besoins et de voir comment je pourrais vous accompagner.

N'hésitez pas à me répondre ou à me rappeler.

Cordialement,

{signature}`,
  },
}

export function loadTemplates(): Record<TemplateId, CustomTemplate> {
  if (typeof window === 'undefined') return DEFAULT_TEMPLATES
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_TEMPLATES
    const parsed = JSON.parse(raw)
    // Merge with defaults to handle missing keys
    return {
      'sans-site': { ...DEFAULT_TEMPLATES['sans-site'], ...parsed['sans-site'] },
      refonte: { ...DEFAULT_TEMPLATES.refonte, ...parsed.refonte },
      generique: { ...DEFAULT_TEMPLATES.generique, ...parsed.generique },
    }
  } catch {
    return DEFAULT_TEMPLATES
  }
}

export function saveTemplates(templates: Record<TemplateId, CustomTemplate>): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
}

export function applyTemplate(
  template: CustomTemplate,
  leadOrName: Company | string,
  website?: string | null,
  settings?: Partial<OutreachSettings> | null
): { subject: string; body: string } {
  const lead = typeof leadOrName === 'string' ? null : leadOrName
  const name = typeof leadOrName === 'string' ? leadOrName : leadOrName.name
  const site = (lead?.website ?? website)
    ? (lead?.website ?? website ?? '').replace(/^https?:\/\//, '')
    : ''
  const variables = buildTemplateVariables(lead, settings, name, site)
  const replaceVariables = (value: string) =>
    Object.entries(variables).reduce(
      (next, [key, replacement]) => next.replace(new RegExp(`\\{${key}\\}`, 'g'), replacement),
      value
    )

  return {
    subject: replaceVariables(template.subject),
    body: replaceVariables(template.body),
  }
}

export function buildPersonalizedReason(lead: Company | null): string {
  if (!lead) return ''
  if (!lead.has_website) {
    return "Je n'ai pas trouvé de site officiel associé à votre fiche Google, ce qui peut faire perdre des demandes entrantes à des clients qui vous recherchent en ligne."
  }

  const audit = lead.audit
  if (audit?.performance_score !== null && audit?.performance_score !== undefined && audit.performance_score < 55) {
    return `J'ai notamment vu que votre site semble lent sur mobile, avec un score performance de ${audit.performance_score}/100.`
  }
  if (audit && !audit.is_https) {
    return "J'ai notamment remarqué que votre site n'est pas servi en HTTPS, ce qui peut nuire à la confiance et au référencement."
  }
  if (audit && !audit.is_mobile_friendly) {
    return "J'ai notamment remarqué que l'expérience mobile pourrait être améliorée, alors qu'une grande partie des recherches locales se fait depuis un téléphone."
  }
  if ((lead.google_rating ?? 5) < 4 && (lead.google_reviews_count ?? 0) >= 5) {
    return `Votre fiche Google affiche ${lead.google_rating}/5 sur ${lead.google_reviews_count} avis : un site clair peut aider à rassurer avant la prise de contact.`
  }
  if ((lead.google_reviews_count ?? 0) > 0 && (lead.google_reviews_count ?? 0) < 10) {
    return `Votre fiche Google compte ${lead.google_reviews_count} avis : une présence web plus complète peut aider à renforcer la crédibilité locale.`
  }

  return "Votre présence locale est déjà visible, mais un parcours web plus clair peut aider à convertir davantage de recherches en demandes concrètes."
}

export function buildTemplateVariables(
  lead: Company | null,
  settings?: Partial<OutreachSettings> | null,
  fallbackName = '',
  fallbackWebsite = ''
): Record<string, string> {
  const signature = settings?.signature?.trim()
    || [
      settings?.sender_name,
      settings?.agency_name,
      settings?.agency_website,
      settings?.agency_phone,
    ].filter(Boolean).join('\n')

  return {
    name: lead?.name ?? fallbackName,
    city: lead?.city ?? '',
    sector: lead?.sector ?? '',
    website: lead?.website?.replace(/^https?:\/\//, '') ?? fallbackWebsite,
    google_rating: lead?.google_rating?.toString() ?? '',
    google_reviews_count: lead?.google_reviews_count?.toString() ?? '',
    prospect_score: lead?.prospect_score?.toString() ?? '',
    agency_name: settings?.agency_name ?? '',
    agency_website: settings?.agency_website ?? '',
    agency_phone: settings?.agency_phone ?? '',
    sender_name: settings?.sender_name ?? '',
    sender_email: settings?.sender_email ?? '',
    signature,
    personalized_reason: buildPersonalizedReason(lead),
  }
}

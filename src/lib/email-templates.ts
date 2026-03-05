/**
 * Gestion des templates email personnalisables
 * Stockés en localStorage — pas de migration SQL nécessaire
 */

const STORAGE_KEY = 'leadhunter:email_templates'

export interface CustomTemplate {
  label: string
  subject: string  // avec {name}
  body: string     // avec {name} et {website}
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

Seriez-vous disponible pour un échange rapide cette semaine ?

Cordialement`,
  },
  refonte: {
    label: 'Refonte de site',
    subject: 'Modernisation de votre site web — {name}',
    body: `Bonjour,

Je me permets de vous contacter au sujet de votre site internet ({website}).

Après analyse, j'ai identifié plusieurs points d'amélioration qui pourraient significativement augmenter votre visibilité et votre taux de conversion : performances, compatibilité mobile, et SEO.

Je serais heureux(se) de vous présenter nos solutions de refonte, adaptées aux dernières attentes des moteurs de recherche.

Êtes-vous disponible pour un appel de 15 minutes cette semaine ?

Cordialement`,
  },
  generique: {
    label: 'Contact général',
    subject: 'Proposition de collaboration — {name}',
    body: `Bonjour,

Je me permets de vous contacter concernant {name}.

Dans le cadre de mon activité de création et refonte de sites web, je travaille avec de nombreuses entreprises locales pour améliorer leur présence digitale.

Je serais ravi(e) d'échanger avec vous sur vos besoins et de voir comment je pourrais vous accompagner.

N'hésitez pas à me répondre ou à me rappeler.

Cordialement`,
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
  name: string,
  website?: string | null
): { subject: string; body: string } {
  const site = website ? website.replace(/^https?:\/\//, '') : ''
  return {
    subject: template.subject.replace(/\{name\}/g, name),
    body: template.body.replace(/\{name\}/g, name).replace(/\{website\}/g, site),
  }
}

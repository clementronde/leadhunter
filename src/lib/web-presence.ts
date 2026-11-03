/**
 * Classe l'URL "site web" d'une fiche Google : un lien Facebook, Instagram
 * ou PagesJaunes n'est pas un vrai site — c'est même un excellent prospect
 * (l'entreprise veut être visible en ligne mais n'a pas de site à elle).
 */

export type WebPresence = 'website' | 'social' | 'directory' | 'none' | 'unknown'

const SOCIAL_HOSTS = [
  'facebook.com',
  'fb.me',
  'fb.com',
  'instagram.com',
  'linkedin.com',
  'linktr.ee',
  'tiktok.com',
  'twitter.com',
  'x.com',
  'youtube.com',
  'snapchat.com',
  'pinterest.com',
  'wa.me',
  'whatsapp.com',
]

// Pages hébergées gratuitement / mini-sites générés : comptent comme "pas de vrai site"
const BUILDER_PAGE_HOSTS = ['business.site', 'sites.google.com', 'g.page', 'maps.app.goo.gl']

const DIRECTORY_HOSTS = [
  'pagesjaunes.fr',
  'yelp.fr',
  'yelp.com',
  'tripadvisor.fr',
  'tripadvisor.com',
  'thefork.fr',
  'lafourchette.com',
  'doctolib.fr',
  'planity.com',
  'treatwell.fr',
  'houzz.fr',
  'societe.com',
  'justacote.com',
  'mappy.com',
  'uber.com',
  'deliveroo.fr',
  'just-eat.fr',
]

function hostMatches(hostname: string, hosts: string[]): boolean {
  return hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))
}

export function classifyWebsiteUrl(url: string | null | undefined): {
  presence: WebPresence
  website: string | null
  socialUrl: string | null
} {
  if (!url?.trim()) return { presence: 'none', website: null, socialUrl: null }

  let hostname: string
  try {
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`
    hostname = new URL(normalized).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return { presence: 'none', website: null, socialUrl: null }
  }

  if (hostMatches(hostname, SOCIAL_HOSTS) || hostMatches(hostname, BUILDER_PAGE_HOSTS)) {
    return { presence: 'social', website: null, socialUrl: url }
  }
  if (hostMatches(hostname, DIRECTORY_HOSTS)) {
    return { presence: 'directory', website: null, socialUrl: url }
  }
  return { presence: 'website', website: url, socialUrl: null }
}

export const webPresenceLabels: Record<WebPresence, string> = {
  website: 'Site web',
  social: 'Réseaux sociaux uniquement',
  directory: 'Annuaire uniquement',
  none: 'Aucune présence web',
  unknown: 'Non vérifié',
}

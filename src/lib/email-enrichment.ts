export function cleanDomain(input: string): string | null {
  const domain = input
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .toLowerCase()
    .trim()

  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) return null
  return domain
}

interface HunterEmail {
  value: string
  confidence: number
  type?: 'personal' | 'generic'
  seniority?: string | null
  position?: string | null
}

const DECISION_MAKER_POSITION = /g[ée]rant|fondat|founder|owner|propri[ée]taire|directeur|director|ceo|pdg|pr[ée]sident|associ[ée]|manager|responsable/i

function rankEmail(email: HunterEmail): number {
  let rank = email.confidence ?? 0
  if (email.type === 'personal') rank += 20
  if (email.seniority === 'executive') rank += 40
  else if (email.seniority === 'senior') rank += 20
  if (email.position && DECISION_MAKER_POSITION.test(email.position)) rank += 40
  if (/^(contact|info|bonjour|hello|accueil)@/i.test(email.value)) rank += 10 // mieux qu'un noreply/compta
  if (/^(noreply|no-reply|compta|factur|rh|jobs|recrutement)/i.test(email.value)) rank -= 60
  return rank
}

export async function findBestEmailForDomain(domain: string): Promise<{
  email: string | null
  confidence?: number
  message?: string
}> {
  const hunterKey = process.env.HUNTER_API_KEY
  if (!hunterKey) {
    throw new Error('HUNTER_API_KEY non configurée')
  }

  const clean = cleanDomain(domain)
  if (!clean) {
    throw new Error('Domaine invalide')
  }

  const response = await fetch(
    `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(clean)}&api_key=${hunterKey}&limit=10`
  )

  if (!response.ok) {
    throw new Error('Erreur du service d\'enrichissement')
  }

  const data = await response.json()
  const emails: HunterEmail[] = data?.data?.emails ?? []

  if (emails.length === 0) {
    return { email: null, message: 'Aucun email trouvé pour ce domaine' }
  }

  // Le gérant ou un décideur répond bien plus qu'un contact@ générique
  const best = [...emails].sort((a, b) => rankEmail(b) - rankEmail(a))[0]
  return { email: best.value, confidence: best.confidence }
}

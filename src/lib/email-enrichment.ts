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
    `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(clean)}&api_key=${hunterKey}&limit=1`
  )

  if (!response.ok) {
    throw new Error('Erreur du service d\'enrichissement')
  }

  const data = await response.json()
  const emails: { value: string; confidence: number }[] = data?.data?.emails ?? []

  if (emails.length === 0) {
    return { email: null, message: 'Aucun email trouvé pour ce domaine' }
  }

  const best = emails.sort((a, b) => b.confidence - a.confidence)[0]
  return { email: best.value, confidence: best.confidence }
}

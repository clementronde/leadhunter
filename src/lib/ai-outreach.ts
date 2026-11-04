/**
 * Prospection assistée par Claude :
 * - findContactsWithAI : cherche sur le web l'email / téléphone pro d'une entreprise
 * - draftOutreachEmail : rédige un email personnalisé à partir de la fiche Google Maps et de l'audit
 * Nécessite ANTHROPIC_API_KEY.
 */

import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { COLD_EMAIL_RULES, SHORT_MESSAGE_RULES, rulesAsPrompt } from '@/lib/cold-email-playbook'

// Haiku : tâches simples et répétées sur chaque lead, ~40x moins cher qu'Opus.
// La recherche web de Haiku utilise la variante de base de l'outil ; si elle est refusée,
// on bascule sur Sonnet avec la variante à filtrage dynamique.
const MODEL = 'claude-haiku-5-5'
const SEARCH_FALLBACK_MODEL = 'claude-sonnet-5-5'

let client: Anthropic | null = null
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY non configurée')
  client ??= new Anthropic()
  return client
}

// ============================================
// Recherche de contacts
// ============================================

const ContactsSchema = z.object({
  email: z.string().nullable(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  social_url: z.string().nullable(),
  source: z.string().nullable(),
})

export type FoundContacts = z.infer<typeof ContactsSchema>

export interface BusinessForSearch {
  name: string
  address?: string | null
  city?: string | null
  postal_code?: string | null
  phone?: string | null
  website?: string | null
  social_url?: string | null
}

const CONTACT_PROMPT = `Trouve les coordonnées professionnelles publiques de cette entreprise française :
Nom : {name}
Adresse : {address}
{known}

Cherche sur le web (site officiel, page contact, mentions légales, Pages Jaunes, Facebook, Instagram, LinkedIn, annuaires professionnels).
Règles :
- Ne renvoie un email que s'il est publié et appartient clairement à CETTE entreprise (même nom, même ville). Jamais d'email deviné ou reconstruit.
- Préfère un email de contact générique (contact@, accueil@, le nom de l'entreprise) à l'email personnel d'un salarié.
- "source" : l'URL où tu as trouvé l'email (ou le téléphone si pas d'email).
- Mets null pour tout ce que tu n'as pas trouvé avec certitude.

Termine ta réponse par un unique bloc JSON entre balises <json></json> avec exactement les clés : email, phone, website, social_url, source.`

/** Extrait et valide le bloc <json> de la réponse (les citations web empêchent le format structuré) */
function parseContacts(text: string): FoundContacts | null {
  const match = text.match(/<json>([\s\S]*?)<\/json>/)
  if (!match) return null
  try {
    const parsed = ContactsSchema.safeParse(JSON.parse(match[1].trim()))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i

export async function findContactsWithAI(business: BusinessForSearch): Promise<FoundContacts> {
  const anthropic = getClient()
  const known = [
    business.phone && `Téléphone connu : ${business.phone}`,
    business.website && `Site connu : ${business.website}`,
    business.social_url && `Page connue : ${business.social_url}`,
  ].filter(Boolean).join('\n')

  const prompt = CONTACT_PROMPT
    .replace('{name}', business.name)
    .replace('{address}', [business.address, business.postal_code, business.city].filter(Boolean).join(', ') || 'inconnue')
    .replace('{known}', known)

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: prompt }]
  const location = { type: 'approximate' as const, country: 'FR' }

  const run = (useFallback: boolean, history: Anthropic.MessageParam[]) =>
    anthropic.messages.create({
      model: useFallback ? SEARCH_FALLBACK_MODEL : MODEL,
      max_tokens: 8000,
      output_config: { effort: 'low' },
      tools: [
        useFallback
          ? { type: 'web_search_20260209', name: 'web_search', max_uses: 4, user_location: location }
          : { type: 'web_search_20250305', name: 'web_search', max_uses: 4, user_location: location },
      ],
      messages: history,
    })

  let useFallback = false
  let response: Anthropic.Message
  try {
    response = await run(false, messages)
  } catch (error) {
    if (!(error instanceof Anthropic.BadRequestError)) throw error
    console.warn('Recherche web Haiku refusée, bascule sur Sonnet:', error.message)
    useFallback = true
    response = await run(true, messages)
  }

  // Boucle serveur de la recherche web interrompue : on la laisse reprendre (2 fois max)
  for (let i = 0; i < 2 && response.stop_reason === 'pause_turn'; i++) {
    response = await run(useFallback, [...messages, { role: 'assistant', content: response.content }])
  }

  if (response.stop_reason === 'refusal') throw new Error('Recherche refusée par le modèle')

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
  let contacts = parseContacts(text)

  // Le modèle a parfois oublié le bloc <json> : on extrait les contacts de sa réponse
  // avec un appel sans outil et à sortie structurée (garantie conforme au schéma)
  if (!contacts && text.trim()) {
    const extraction = await anthropic.messages.parse({
      model: MODEL,
      max_tokens: 2000,
      output_config: { effort: 'low', format: zodOutputFormat(ContactsSchema) },
      messages: [{
        role: 'user',
        content: `Voici le résultat d'une recherche des coordonnées de "${business.name}". Extrais uniquement les coordonnées qui y figurent explicitement (null sinon) :\n\n${text}`,
      }],
    })
    contacts = extraction.parsed_output ?? null
  }

  if (!contacts) {
    console.warn('Recherche contacts sans résultat exploitable:', response.stop_reason, text.slice(-500))
    throw new Error('Réponse de recherche illisible')
  }

  return {
    ...contacts,
    email: contacts.email && EMAIL_RE.test(contacts.email.trim()) ? contacts.email.trim().toLowerCase() : null,
  }
}

// ============================================
// Rédaction de l'email personnalisé
// ============================================

const DraftSchema = z.object({
  subject: z.string(),
  body: z.string(),
})

export type OutreachDraft = z.infer<typeof DraftSchema>

export interface DraftContext {
  company: {
    name: string
    city?: string | null
    sector?: string | null
    google_rating?: number | null
    google_reviews_count?: number | null
    has_website: boolean
    web_presence?: string | null
    website?: string | null
    score_reasons?: string[] | null
  }
  audit?: {
    performance_score?: number | null
    seo_score?: number | null
    is_mobile_friendly?: boolean
    is_https?: boolean
    copyright_year?: number | null
    design_verdict?: string | null
    issues?: { title: string; message: string }[]
  } | null
  sender: {
    name?: string | null
    agency?: string | null
    signature: string
  }
}

const DRAFT_PROMPT = `Tu écris un premier email de prospection (cold email) pour un freelance / une petite agence web française.
Objectif : obtenir une réponse positive du gérant (intérêt, puis court échange).

Données réelles sur le prospect (n'invente rien d'autre) :
{facts}

Règles d'écriture, tirées des études sur les cold emails les plus performants :
${rulesAsPrompt(COLD_EMAIL_RULES)}

Format :
- Le corps commence par "Bonjour," puis se termine par cette signature exacte, suivie du P.S. :
{signature}`

const SHORT_PROMPT = `Tu écris un premier message WhatsApp / SMS de prospection pour un freelance / une petite agence web française.
Objectif : que le gérant réponde.

Données réelles sur le prospect (n'invente rien d'autre) :
{facts}

Règles :
${rulesAsPrompt(SHORT_MESSAGE_RULES)}
- Commence par "Bonjour," et termine par la signature courte : {sender}
- "subject" : chaîne vide.`

function buildFacts(ctx: DraftContext): string {
  const { company, audit } = ctx
  return [
    `Entreprise : ${company.name}${company.city ? ` (${company.city})` : ''}`,
    company.sector && `Activité : ${company.sector}`,
    company.google_rating != null && `Note Google : ${company.google_rating}/5${company.google_reviews_count ? ` sur ${company.google_reviews_count} avis` : ''}`,
    company.has_website
      ? `Site web : ${company.website}`
      : company.web_presence === 'social'
      ? 'Pas de site web : seulement une page sur les réseaux sociaux'
      : company.web_presence === 'directory'
      ? 'Pas de site web : seulement une fiche annuaire'
      : 'Aucun site web trouvé',
    company.score_reasons?.length && `Constats : ${company.score_reasons.join(' ; ')}`,
    audit?.performance_score != null && `Performance mobile (Google PageSpeed) : ${audit.performance_score}/100`,
    audit?.is_mobile_friendly === false && 'Site non adapté au mobile',
    audit?.is_https === false && 'Site sans HTTPS (affiché "non sécurisé")',
    audit?.copyright_year && `Pied de page : © ${audit.copyright_year}`,
    audit?.design_verdict && `Avis design : ${audit.design_verdict}`,
    audit?.issues?.length && `Problèmes détectés : ${audit.issues.slice(0, 4).map((i) => `${i.title} (${i.message})`).join(' ; ')}`,
    ctx.sender.agency && `Expéditeur : ${ctx.sender.name ?? ''} ${ctx.sender.agency ? `de ${ctx.sender.agency}` : ''}`.trim(),
  ].filter(Boolean).join('\n')
}

/** channel 'email' : objet + corps signé ; 'short' : message WhatsApp / SMS de 280 caractères */
export async function draftOutreachEmail(ctx: DraftContext, channel: 'email' | 'short' = 'email'): Promise<OutreachDraft> {
  const anthropic = getClient()
  const facts = buildFacts(ctx)
  // Nom + agence, sans doublon quand les deux sont identiques ("Artichaud studio, Artichaud Studio")
  const senderParts = [ctx.sender.name, ctx.sender.agency].filter((part): part is string => !!part?.trim())
  const shortSender = senderParts
    .filter((part, i) => senderParts.findIndex((other) => other.trim().toLowerCase() === part.trim().toLowerCase()) === i)
    .join(', ') || 'votre interlocuteur web'
  const prompt = channel === 'short'
    ? SHORT_PROMPT.replace('{facts}', facts).replace('{sender}', shortSender)
    : DRAFT_PROMPT.replace('{facts}', facts).replace('{signature}', ctx.sender.signature || '(pas de signature)')

  const response = await anthropic.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    output_config: {
      effort: 'low',
      format: zodOutputFormat(DraftSchema),
    },
    messages: [{
      role: 'user',
      content: prompt,
    }],
  })

  if (response.stop_reason === 'refusal' || !response.parsed_output) {
    throw new Error('Rédaction impossible pour ce lead')
  }
  return response.parsed_output
}

// ============================================
// Rédaction libre : l'utilisateur décrit l'entreprise, l'IA propose 3 versions
// ============================================

// Sonnet : une seule rédaction à la fois, on privilégie la qualité d'écriture
const COMPOSE_MODEL = 'claude-sonnet-5-5'

const ComposeSchema = z.object({
  variants: z.array(z.object({
    angle: z.string(),
    subject: z.string(),
    body: z.string(),
    why: z.string(),
  })),
})

export type ComposedEmail = z.infer<typeof ComposeSchema>['variants'][number]

export interface ComposeInput {
  companyName: string
  activity?: string | null
  city?: string | null
  contactName?: string | null
  website?: string | null
  googleRating?: string | null
  observations?: string | null
  offer?: string | null
  channel: 'email' | 'short'
  sender: { name?: string | null; agency?: string | null; signature: string }
}

const COMPOSE_PROMPT = `Tu es un expert du cold email B2B en France. Tu écris pour un freelance / une petite agence web qui prospecte des petites entreprises locales.

Informations sur l'entreprise ciblée, données par l'utilisateur (n'invente rien d'autre) :
{facts}

Ce que l'expéditeur propose : {offer}

Avant d'écrire, identifie le problème le plus probable et le plus coûteux pour CE type d'activité, à partir des faits fournis. Puis écris 3 versions différentes, chacune avec un angle distinct :
1. "Question douleur" : ouvre sur le problème formulé en une question.
2. "Constat précis" : ouvre sur le fait observé le plus parlant, puis son impact.
3. "Ultra court" : 40 mots maximum, une observation et une demande oui / non.

Règles, tirées des études sur les cold emails les plus performants (à respecter dans chaque version) :
{rules}

Format de chaque version :
- "angle" : le nom de l'angle.
- "subject" : {subjectRule}
- "body" : commence par "Bonjour{greeting}," et se termine par la signature exacte ci-dessous{psRule}.
- "why" : une phrase qui explique pourquoi cette version devrait obtenir une réponse.

Signature :
{signature}`

export async function composeColdEmail(input: ComposeInput): Promise<ComposedEmail[]> {
  const anthropic = getClient()
  const facts = [
    `Entreprise : ${input.companyName}${input.city ? ` (${input.city})` : ''}`,
    input.activity && `Activité : ${input.activity}`,
    input.contactName && `Gérant / contact : ${input.contactName}`,
    input.website ? `Site web : ${input.website}` : 'Site web : non précisé',
    input.googleRating && `Note / avis Google : ${input.googleRating}`,
    input.observations && `Ce que l'expéditeur a remarqué : ${input.observations}`,
  ].filter(Boolean).join('\n')

  const isShort = input.channel === 'short'
  const senderParts = [input.sender.name, input.sender.agency].filter((part): part is string => !!part?.trim())
  const shortSender = senderParts
    .filter((part, i) => senderParts.findIndex((other) => other.trim().toLowerCase() === part.trim().toLowerCase()) === i)
    .join(', ') || 'votre interlocuteur web'

  const prompt = COMPOSE_PROMPT
    .replace('{facts}', facts)
    .replace('{offer}', input.offer?.trim() || 'création ou refonte de site web')
    .replace('{rules}', rulesAsPrompt(isShort ? [...SHORT_MESSAGE_RULES, COLD_EMAIL_RULES[2]] : COLD_EMAIL_RULES))
    .replace('{subjectRule}', isShort ? 'chaîne vide (message WhatsApp / SMS).' : '2 à 4 mots.')
    .replace('{greeting}', input.contactName ? ` ${input.contactName}` : '')
    .replace('{psRule}', isShort ? '' : ', suivie du P.S.')
    .replace('{signature}', isShort ? shortSender : input.sender.signature || '(pas de signature)')

  const response = await anthropic.messages.parse({
    model: COMPOSE_MODEL,
    max_tokens: 6000,
    output_config: { effort: 'medium', format: zodOutputFormat(ComposeSchema) },
    messages: [{ role: 'user', content: prompt }],
  })

  if (response.stop_reason === 'refusal' || !response.parsed_output?.variants.length) {
    throw new Error('Rédaction impossible pour cette entreprise')
  }
  return response.parsed_output.variants.slice(0, 3)
}

import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server-auth'
import { rateLimit } from '@/lib/rate-limit'
import { cleanDomain, findBestEmailForDomain } from '@/lib/email-enrichment'
import { findContactsWithAI } from '@/lib/ai-outreach'

export const maxDuration = 120

/**
 * Trouve les contacts manquants d'un lead :
 * 1. l'email publié sur son site (rapide, gratuit)
 * 2. sinon une recherche web par l'IA (site, mentions légales, annuaires, réseaux sociaux)
 * Ne remplace jamais une donnée déjà présente.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, response } = await requireUser()
  if (response || !user) return response

  const { id } = await params

  const rl = rateLimit(`find-contacts:${user.id}`, { windowMs: 60_000, max: 10 })
  if (!rl.success) {
    return NextResponse.json({ error: 'Trop de recherches, réessayez dans une minute' }, { status: 429 })
  }

  const { data: profile } = await supabase.from('profiles').select('plan, role').eq('id', user.id).single()
  if (profile?.plan !== 'pro' && profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Recherche de contacts réservée au plan Pro' }, { status: 403 })
  }

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, address, city, postal_code, phone, email, website, has_website, social_url')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!company) return NextResponse.json({ error: 'Lead introuvable' }, { status: 404 })

  const updates: Record<string, string> = {}
  let source: string | null = null

  // 1. Email publié sur le site
  if (!company.email && company.has_website && company.website) {
    const domain = cleanDomain(company.website)
    if (domain) {
      const found = await findBestEmailForDomain(domain).catch(() => null)
      if (found?.email) {
        updates.email = found.email
        source = company.website
      }
    }
  }

  // 2. Recherche web par l'IA pour ce qui manque encore
  if (!updates.email && (!company.email || !company.phone)) {
    try {
      const contacts = await findContactsWithAI(company)
      if (!company.email && contacts.email) updates.email = contacts.email
      if (!company.phone && contacts.phone) updates.phone = contacts.phone
      if (!company.website && !company.social_url && contacts.social_url) updates.social_url = contacts.social_url
      source = contacts.source
    } catch (error) {
      console.warn('Recherche IA de contacts échouée:', error instanceof Error ? error.message : error)
      if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'La recherche n’a pas abouti, réessayez plus tard' }, { status: 502 })
      }
    }
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from('companies')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', company.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    found: updates,
    source,
    message: updates.email
      ? 'Email trouvé'
      : updates.phone
      ? 'Pas d’email public, mais un téléphone a été trouvé'
      : 'Aucun contact public trouvé pour cette entreprise',
  })
}

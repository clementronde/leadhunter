import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'
import { cleanDomain, findBestEmailForDomain } from '@/lib/email-enrichment'

const enrichSchema = z.object({
  domain: z.string().min(1).max(253),
  companyId: z.string().uuid().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // Rate limit : 10 enrichissements par minute par utilisateur
    const rl = rateLimit(`enrich:${user.id}`, { windowMs: 60_000, max: 10 })
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes, réessayez dans une minute' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
      )
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
    }

    const parsed = enrichSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { domain, companyId } = parsed.data

    // Si companyId fourni, vérifier l'ownership
    if (companyId) {
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('id', companyId)
        .eq('user_id', user.id)
        .single()
      if (!company) return NextResponse.json({ error: 'Lead introuvable' }, { status: 404 })
    }

    if (!process.env.HUNTER_API_KEY) {
      return NextResponse.json({ error: 'Service non configuré' }, { status: 503 })
    }

    const cleanedDomain = cleanDomain(domain)
    if (!cleanedDomain) {
      return NextResponse.json({ error: 'Domaine invalide' }, { status: 400 })
    }

    const result = await findBestEmailForDomain(cleanedDomain)
    if (!result.email) {
      return NextResponse.json({ email: null, message: result.message || 'Aucun email trouvé pour ce domaine' })
    }

    if (companyId) {
      await supabase
        .from('companies')
        .update({ email: result.email, updated_at: new Date().toISOString() })
        .eq('id', companyId)
        .eq('user_id', user.id)
    }

    return NextResponse.json({ email: result.email, confidence: result.confidence })
  } catch (err) {
    console.error('Enrich email error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

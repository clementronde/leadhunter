import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'

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

    const hunterKey = process.env.HUNTER_API_KEY
    if (!hunterKey) {
      return NextResponse.json({ error: 'Service non configuré' }, { status: 503 })
    }

    // Nettoyage du domaine
    const cleanDomain = domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      .toLowerCase()

    // Valider que c'est un domaine avec au moins un point
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(cleanDomain)) {
      return NextResponse.json({ error: 'Domaine invalide' }, { status: 400 })
    }

    const res = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(cleanDomain)}&api_key=${hunterKey}&limit=1`
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'Erreur du service d\'enrichissement' }, { status: 502 })
    }

    const data = await res.json()
    const emails: { value: string; confidence: number }[] = data?.data?.emails ?? []

    if (emails.length === 0) {
      return NextResponse.json({ email: null, message: 'Aucun email trouvé pour ce domaine' })
    }

    const best = emails.sort((a, b) => b.confidence - a.confidence)[0]
    const email = best.value

    if (companyId) {
      await supabase
        .from('companies')
        .update({ email, updated_at: new Date().toISOString() })
        .eq('id', companyId)
        .eq('user_id', user.id)
    }

    return NextResponse.json({ email, confidence: best.confidence })
  } catch (err) {
    console.error('Enrich email error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

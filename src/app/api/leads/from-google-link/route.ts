import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { z } from 'zod'
import { enrichGooglePlace, findPlaceFromMapsUrl, googlePlaceToCompany } from '@/lib/google-maps'
import { rateLimit } from '@/lib/rate-limit'

const bodySchema = z.object({
  url: z.string().url().max(2000),
  addToCallList: z.boolean().optional(),
  note: z.string().max(2000).optional(),
})

function createSupabaseFromRequest(request: NextRequest) {
  const response = NextResponse.next({ request })
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })
}

/**
 * Ajoute un lead à partir du lien d'une fiche Google Maps collé par l'utilisateur.
 * Si la fiche est déjà dans ses leads, on ne crée pas de doublon : on renvoie la fiche existante.
 */
export async function POST(request: NextRequest) {
  const supabase = createSupabaseFromRequest(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const rl = rateLimit(`google-link:${user.id}`, { windowMs: 60_000, max: 20 })
  if (!rl.success) return NextResponse.json({ error: 'Trop de fiches ajoutées, réessayez dans une minute' }, { status: 429 })

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Collez le lien complet de la fiche Google Maps' }, { status: 400 })
  const { url, addToCallList, note } = parsed.data

  if (!process.env.GOOGLE_MAPS_API_KEY) return NextResponse.json({ error: 'Service non configuré' }, { status: 503 })

  let place
  try {
    place = await findPlaceFromMapsUrl(url)
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (/fiche Google Maps|Lien invalide/.test(message)) return NextResponse.json({ error: message }, { status: 400 })
    console.error('Fiche Google introuvable:', err)
    return NextResponse.json({ error: 'Impossible de lire cette fiche Google pour le moment' }, { status: 502 })
  }
  if (!place) {
    return NextResponse.json({ error: 'Fiche introuvable. Ouvrez la fiche dans Google Maps, puis « Partager » et copiez le lien.' }, { status: 404 })
  }

  const callListAt = addToCallList ? new Date().toISOString() : null

  // Déjà dans les leads ?
  const { data: existing } = await supabase
    .from('companies')
    .select('id, name, call_list_at')
    .eq('user_id', user.id)
    .eq('google_place_id', place.place_id)
    .maybeSingle()

  let companyId: string
  let created = false
  let closedOnGoogle = false
  if (existing) {
    companyId = existing.id as string
    if (addToCallList && !existing.call_list_at) {
      await supabase.from('companies').update({ call_list_at: callListAt, updated_at: new Date().toISOString() }).eq('id', companyId)
    }
  } else {
    const company = googlePlaceToCompany(enrichGooglePlace(place))
    // Fiche marquée « fermé définitivement » par Google : rangée directement dans les radiés
    const closed = place.business_status === 'CLOSED_PERMANENTLY'
    const { data: inserted, error } = await supabase
      .from('companies')
      .insert({
        user_id: user.id,
        ...company,
        google_place_id: place.place_id,
        call_list_at: closed ? null : callListAt,
        ...(closed ? { disqualified_reason: 'struck_off', disqualified_at: new Date().toISOString() } : {}),
      })
      .select('id')
      .single()
    if (error || !inserted) {
      console.error('Ajout fiche Google impossible:', error?.message)
      return NextResponse.json({ error: "Le lead n'a pas pu être enregistré" }, { status: 500 })
    }
    companyId = inserted.id as string
    created = true
    closedOnGoogle = closed

    // Audit automatique du site, comme pour un scan (réservé Pro)
    const { data: profile } = await supabase.from('profiles').select('plan, role').eq('id', user.id).single()
    const hasFullAccess = profile?.plan === 'pro' || profile?.role === 'admin'
    if (hasFullAccess && company.has_website && company.website) {
      await supabase.from('audit_jobs').insert({ user_id: user.id, company_id: companyId, url: company.website, status: 'pending' })
    }
  }

  if (note?.trim()) {
    await supabase.from('notes').insert({ user_id: user.id, company_id: companyId, content: note.trim() })
  }

  return NextResponse.json({
    success: true,
    data: {
      id: companyId,
      name: place.name,
      created,
      closedOnGoogle,
      inCallList: !closedOnGoogle && (addToCallList || !!existing?.call_list_at),
    },
  })
}

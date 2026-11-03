import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import {
  searchGooglePlaces,
  enrichGooglePlace,
  googlePlaceToCompany,
  GooglePlaceEnriched,
  PlaceSearchResult,
} from '@/lib/google-maps'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'

const scanSchema = z.object({
  query: z.string().min(1).max(200),
  location: z.string().min(1).max(200),
  maxResults: z.number().int().min(1).max(60).optional(),
})

export const maxDuration = 120

/** Valeur envoyée par le Scanner pour « Tous types d'entreprises » */
const ALL_TYPES_QUERY = '__all__'
const ALL_TYPES_CATEGORIES = [
  'restaurants', 'coiffeurs', 'boulangeries', 'instituts de beauté', 'plombiers', 'électriciens',
  'maçons', 'menuisiers', 'garages automobiles', 'agences immobilières', 'cabinets médicaux',
  'dentistes', 'hôtels', 'bars', 'fleuristes', 'boutiques de vêtements', 'salles de sport',
  'paysagistes', 'photographes', 'avocats', 'experts-comptables', 'auto-écoles', 'opticiens', 'traiteurs',
]

function createSupabaseFromRequest(request: NextRequest) {
  const response = NextResponse.next({ request })
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseFromRequest(request)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Rate limit : 5 scans/min max
    const rl = rateLimit(`google-scan:${user.id}`, { windowMs: 60_000, max: 5 })
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes, réessayez dans une minute' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
      )
    }

    const { data: profile } = await supabase.from('profiles').select('plan, role').eq('id', user.id).single()
    const hasFullAccess = profile?.plan === 'pro' || profile?.role === 'admin'
    if (!hasFullAccess) {
      const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0)
      const { count } = await supabase.from('search_scans')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id).gte('started_at', startOfMonth.toISOString())
      if ((count ?? 0) >= 3)
        return NextResponse.json({ error: 'Limite atteinte', code: 'SCAN_LIMIT_REACHED' }, { status: 403 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
    }

    const parsed = scanSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { query, location, maxResults: requestedMax = 20 } = parsed.data

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return NextResponse.json({ error: 'Service non configuré' }, { status: 503 })
    }

    const maxResults = hasFullAccess ? Math.min(requestedMax, 60) : Math.min(requestedMax, 10)

    console.log(`🗺️ Scan Google Maps: q=${query.length}c loc=${location.length}c max=${maxResults} [user: ${user.id}]`)

    // 1. Charger tous les place_ids déjà connus pour cet utilisateur
    const { data: existingRows } = await supabase
      .from('companies')
      .select('google_place_id, name, phone, city')
      .eq('user_id', user.id)

    const knownPlaceIds = new Set(
      existingRows?.map((r) => r.google_place_id).filter(Boolean) ?? []
    )
    const knownBusinessKeys = new Set(
      existingRows?.map((r) => businessKey(r.name, r.phone, r.city)).filter(Boolean) ?? []
    )

    // 2. Text Search — paginer jusqu'à avoir maxResults NOUVELLES fiches
    const newPlaces: PlaceSearchResult[] = []
    let skippedCount = 0
    const allTypes = query.trim() === ALL_TYPES_QUERY

    // Ajoute les fiches nouvelles d'une page, au plus `cap` ; renvoie le nombre ajouté
    const takeNew = (pagePlaces: PlaceSearchResult[], cap: number) => {
      let added = 0
      for (const place of pagePlaces) {
        if (newPlaces.length >= maxResults || added >= cap) break
        if (place.business_status === 'CLOSED_PERMANENTLY') continue
        if (knownPlaceIds.has(place.place_id)) {
          skippedCount++
          continue
        }
        knownPlaceIds.add(place.place_id) // éviter doublons dans ce scan
        newPlaces.push(place)
        added++
      }
      return added
    }

    if (allTypes) {
      // Tous types : on balaie plusieurs familles de métiers pour varier les résultats
      const categories = [...ALL_TYPES_CATEGORIES].sort(() => Math.random() - 0.5)
      const perCategory = Math.max(3, Math.ceil(maxResults / 8))
      const firstPages: PlaceSearchResult[][] = []
      for (const category of categories) {
        if (newPlaces.length >= maxResults) break
        const { places } = await searchGooglePlaces({ query: category, location: location.trim() })
        firstPages.push(places)
        takeNew(places, perCategory)
      }
      // 2e passe sans plafond si la zone est petite
      for (const places of firstPages) {
        if (newPlaces.length >= maxResults) break
        takeNew(places, Infinity)
      }
    } else {
      let pageToken: string | undefined = undefined
      while (newPlaces.length < maxResults) {
        const { places: pagePlaces, nextPageToken } = await searchGooglePlaces({
          query: query.trim(),
          location: location.trim(),
          pageToken,
        })

        if (pagePlaces.length === 0) break
        takeNew(pagePlaces, Infinity)
        if (!nextPageToken || newPlaces.length >= maxResults) break
        pageToken = nextPageToken
      }
    }

    console.log(`📊 ${newPlaces.length} nouvelles fiches, ${skippedCount} déjà en base`)

    // 3. Convertir les nouvelles fiches (Text Search New renvoie déjà site web et téléphone)
    const enrichedPlaces: GooglePlaceEnriched[] = newPlaces.map(enrichGooglePlace)

    const withWebsite = enrichedPlaces.filter((p) => p.has_website).length
    const withoutWebsite = enrichedPlaces.filter((p) => !p.has_website).length

    // 4. Sauvegarder les entreprises et récupérer les IDs DB
    let savedCount = 0
    const savedCompanies: Array<ReturnType<typeof googlePlaceToCompany> & {
      id?: string
      google_place_id: string
      google_maps_url: string | null
      google_rating: number | null
    }> = []

    for (const place of enrichedPlaces) {
      const company = googlePlaceToCompany(place)
      const duplicateBusinessKey = businessKey(company.name, company.phone, company.city)
      if (duplicateBusinessKey && knownBusinessKeys.has(duplicateBusinessKey)) {
        skippedCount++
        continue
      }
      if (duplicateBusinessKey) knownBusinessKeys.add(duplicateBusinessKey)

      const companyWithMeta = {
        ...company,
        google_place_id: place.place_id,
        google_maps_url: place.google_maps_url,
        google_rating: place.rating,
      }

      try {
        const { data: inserted, error: insertError } = await supabase
          .from('companies')
          .insert({
            user_id: user.id,
            name: company.name,
            address: company.address,
            city: company.city,
            postal_code: company.postal_code,
            phone: company.phone,
            coordinates: company.coordinates,
            sector: company.sector,
            source: company.source,
            website: company.website,
            has_website: company.has_website,
            web_presence: company.web_presence,
            social_url: company.social_url,
            google_place_id: place.place_id,
            google_rating: place.rating,
            google_reviews_count: place.reviews_count,
            google_maps_url: place.google_maps_url,
            prospect_score: company.prospect_score,
            priority: company.priority,
            score_reasons: company.score_reasons,
            status: 'new',
          })
          .select('id')
          .single()

        if (insertError) {
          console.warn(`Erreur insertion ${company.name}:`, insertError.message)
          savedCompanies.push(companyWithMeta)
        } else {
          savedCount++
          savedCompanies.push({ ...companyWithMeta, id: inserted.id })
        }
      } catch (saveErr) {
        console.warn(`Erreur sauvegarde ${company.name}:`, saveErr)
        savedCompanies.push(companyWithMeta)
      }
    }

    // 5. Mettre automatiquement en file d'audit les nouveaux leads qui ont un vrai site
    const auditJobs = savedCompanies
      .filter((company) => company.id && company.has_website && company.website)
      .map((company) => ({
        user_id: user.id,
        company_id: company.id as string,
        url: company.website as string,
        status: 'pending',
      }))
    if (hasFullAccess && auditJobs.length > 0) {
      const { error: queueError } = await supabase.from('audit_jobs').insert(auditJobs)
      if (queueError) console.warn('Mise en file des audits impossible:', queueError.message)
    }

    // 6. Enregistrer le scan
    await supabase.from('search_scans').insert({
      user_id: user.id,
      query: `${query.trim() === ALL_TYPES_QUERY ? 'Tous types' : query} - ${location}`,
      location: { lat: 0, lng: 0, radius: 0 },
      status: 'completed',
      progress: 100,
      companies_found: savedCompanies.length,
      companies_without_site: withoutWebsite,
      companies_needing_refonte: 0,
      completed_at: new Date().toISOString(),
    })

    console.log(`💾 ${savedCount}/${enrichedPlaces.length} nouvelles entreprises sauvegardees [user: ${user.id}]`)

    return NextResponse.json({
      success: true,
      data: {
        total_found: newPlaces.length + skippedCount,
        processed: enrichedPlaces.length,
        skipped: skippedCount,
        without_site: withoutWebsite,
        with_site: withWebsite,
        needing_refonte: 0,
        saved: savedCount,
        companies: savedCompanies,
      },
    })
  } catch (error) {
    console.error('Google Maps scan error:', error)

    if (error instanceof Error) {
      if (error.message.includes('REQUEST_DENIED') || error.message.includes('invalide')) {
        return NextResponse.json({ error: 'Clé API Google Maps invalide ou non autorisée' }, { status: 403 })
      }
      if (error.message.includes('OVER_QUERY_LIMIT')) {
        return NextResponse.json({ error: 'Quota Google Places API dépassé' }, { status: 429 })
      }
    }

    return NextResponse.json({ error: 'Erreur lors du scan' }, { status: 500 })
  }
}

function businessKey(name?: string | null, phone?: string | null, city?: string | null): string | null {
  const cleanName = normalizeText(name)
  const cleanCity = normalizeText(city)
  const cleanPhone = phone?.replace(/\D/g, '').slice(-9) ?? ''
  if (!cleanName || !cleanCity) return null
  return `${cleanName}:${cleanPhone || 'no-phone'}:${cleanCity}`
}

function normalizeText(value?: string | null): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

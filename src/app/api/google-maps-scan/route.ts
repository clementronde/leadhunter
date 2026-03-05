import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import {
  searchGooglePlaces,
  enrichGooglePlace,
  googlePlaceToCompany,
  GooglePlaceEnriched,
  PlaceSearchResult,
} from '@/lib/google-maps'

export const maxDuration = 60

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
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
    }

    const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
    const isProUser = profile?.plan === 'pro'
    if (!isProUser) {
      const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0)
      const { count } = await supabase.from('search_scans')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id).gte('started_at', startOfMonth.toISOString())
      if ((count ?? 0) >= 3)
        return NextResponse.json({ error: 'Limite atteinte', code: 'SCAN_LIMIT_REACHED' }, { status: 403 })
    }

    const body = await request.json()
    const { query, location, maxResults: requestedMax = 20 } = body

    if (!query || !query.trim()) {
      return NextResponse.json(
        { error: 'Le champ "query" est requis (ex: restaurants, coiffeurs...)' },
        { status: 400 }
      )
    }

    if (!location || !location.trim()) {
      return NextResponse.json(
        { error: 'Le champ "location" est requis (ex: Paris, Boulogne-Billancourt...)' },
        { status: 400 }
      )
    }

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return NextResponse.json(
        { error: 'GOOGLE_MAPS_API_KEY non configuree', details: 'Ajoutez votre cle API Google Maps dans .env.local' },
        { status: 500 }
      )
    }

    const maxResults = isProUser ? Math.min(requestedMax, 60) : Math.min(requestedMax, 10)

    console.log(`🗺️ Scan Google Maps: "${query}" à "${location}" (max ${maxResults}) [user: ${user.id}]`)

    // 1. Charger tous les place_ids déjà connus pour cet utilisateur
    const { data: existingRows } = await supabase
      .from('companies')
      .select('google_place_id')
      .eq('user_id', user.id)
      .not('google_place_id', 'is', null)

    const knownPlaceIds = new Set(
      existingRows?.map((r) => r.google_place_id).filter(Boolean) ?? []
    )

    // 2. Text Search — paginer jusqu'à avoir maxResults NOUVELLES fiches
    const newPlaces: PlaceSearchResult[] = []
    let pageToken: string | undefined = undefined
    let skippedCount = 0

    while (newPlaces.length < maxResults) {
      const { places: pagePlaces, nextPageToken } = await searchGooglePlaces({
        query: query.trim(),
        location: location.trim(),
        pageToken,
      })

      if (pagePlaces.length === 0) break

      for (const place of pagePlaces) {
        if (place.business_status === 'CLOSED_PERMANENTLY') continue
        if (knownPlaceIds.has(place.place_id)) {
          skippedCount++
          continue
        }
        knownPlaceIds.add(place.place_id) // éviter doublons dans ce scan
        newPlaces.push(place)
        if (newPlaces.length >= maxResults) break
      }

      if (!nextPageToken || newPlaces.length >= maxResults) break

      await new Promise((resolve) => setTimeout(resolve, 2000))
      pageToken = nextPageToken
    }

    console.log(`📊 ${newPlaces.length} nouvelles fiches, ${skippedCount} déjà en base`)

    // 3. Enrichir uniquement les nouvelles fiches (Place Details — coûteux)
    const enrichedPlaces: GooglePlaceEnriched[] = []
    const BATCH_SIZE = 5

    for (let i = 0; i < newPlaces.length; i += BATCH_SIZE) {
      const batch = newPlaces.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(batch.map((p) => enrichGooglePlace(p)))
      for (const result of results) {
        if (result.status === 'fulfilled') enrichedPlaces.push(result.value)
        else console.warn('Erreur enrichissement:', result.reason)
      }
      if (i + BATCH_SIZE < newPlaces.length) {
        await new Promise((resolve) => setTimeout(resolve, 300))
      }
    }

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
            google_place_id: place.place_id,
            google_rating: place.rating,
            google_reviews_count: place.reviews_count,
            google_maps_url: place.google_maps_url,
            prospect_score: company.prospect_score,
            priority: company.priority,
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

    // 5. Enregistrer le scan
    await supabase.from('search_scans').insert({
      user_id: user.id,
      query: `${query} - ${location}`,
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
      if (error.message.includes('GOOGLE_MAPS_API_KEY')) {
        return NextResponse.json(
          { error: 'Cle API Google Maps manquante', details: error.message },
          { status: 500 }
        )
      }
      if (error.message.includes('REQUEST_DENIED') || error.message.includes('invalide')) {
        return NextResponse.json(
          { error: 'Cle API Google Maps invalide ou non autorisee', details: 'Verifiez que votre cle API a bien acces a "Places API" dans Google Cloud Console' },
          { status: 403 }
        )
      }
      if (error.message.includes('OVER_QUERY_LIMIT')) {
        return NextResponse.json(
          { error: 'Quota Google Places API depasse', details: 'Verifiez votre facturation Google Cloud ou attendez la remise a zero du quota' },
          { status: 429 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Erreur lors du scan Google Maps', details: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    )
  }
}

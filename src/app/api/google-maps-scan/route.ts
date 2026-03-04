import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { searchAndEnrichGooglePlaces, googlePlaceToCompany } from '@/lib/google-maps'
import { analyzeWebsite, calculateProspectScoreFromAudit } from '@/lib/pagespeed'
import { getPriorityFromScore } from '@/lib/utils'

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

    // Get authenticated user
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
    const { query, location, maxResults: requestedMax = 20, auditWebsites = false } = body

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

    console.log(`🗺️ Demarrage scan Google Maps: "${query}" a "${location}" (max ${maxResults}) [user: ${user.id}]`)

    // 1. Search Google Places
    const { places, total, withWebsite, withoutWebsite } =
      await searchAndEnrichGooglePlaces({
        query: query.trim(),
        location: location.trim(),
        maxResults: maxResults,
      })

    console.log(`📊 ${total} lieux trouves: ${withWebsite} avec site, ${withoutWebsite} sans site`)

    // 2. Convert to Company and optionally audit
    const companies = []
    let needingRefonte = 0
    let auditedCount = 0

    // Limiter les audits à 5 max pour rester dans le timeout Vercel
    const MAX_AUDITS = 5
    let auditQueue = 0

    for (const place of places) {
      const company = googlePlaceToCompany(place)

      if (auditWebsites && place.website && auditQueue < MAX_AUDITS) {
        auditQueue++
        try {
          console.log(`🔍 Audit ${place.website}... (${auditQueue}/${MAX_AUDITS})`)
          const auditResult = await analyzeWebsite(place.website)

          if (auditResult.success && auditResult.data) {
            const prospectScore = calculateProspectScoreFromAudit(auditResult.data)
            company.prospect_score = prospectScore
            company.priority = getPriorityFromScore(prospectScore)

            const isUnderperforming =
              (auditResult.data.performance_score !== null &&
                auditResult.data.performance_score !== undefined &&
                auditResult.data.performance_score < 50) ||
              !auditResult.data.is_https ||
              !auditResult.data.is_mobile_friendly ||
              auditResult.data.is_outdated

            if (isUnderperforming) needingRefonte++
            auditedCount++
          }
        } catch (auditErr) {
          console.warn(`Audit echoue pour ${place.website}:`, auditErr)
        }
      }

      companies.push({
        ...company,
        google_place_id: place.place_id,
        google_maps_url: place.google_maps_url,
        google_rating: place.rating,
      })
    }

    // 3. Save companies to Supabase with user_id
    let savedCount = 0
    for (const company of companies) {
      try {
        const { data: existing } = await supabase
          .from('companies')
          .select('id')
          .eq('name', company.name)
          .eq('city', company.city)
          .eq('user_id', user.id)
          .maybeSingle()

        if (existing) {
          await supabase
            .from('companies')
            .update({
              phone: company.phone,
              website: company.website,
              has_website: company.has_website,
              google_rating: company.google_rating,
              google_reviews_count: company.google_reviews_count,
              google_maps_url: company.google_maps_url || (company.google_place_id ? `https://www.google.com/maps/place/?q=place_id:${company.google_place_id}` : null),
              prospect_score: company.prospect_score,
              priority: company.priority,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
          savedCount++
        } else {
          const { error: insertError } = await supabase
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
              google_rating: company.google_rating,
              google_reviews_count: company.google_reviews_count,
              google_maps_url: company.google_maps_url,
              prospect_score: company.prospect_score,
              priority: company.priority,
              status: 'new',
            })

          if (insertError) {
            console.warn(`Erreur insertion ${company.name}:`, insertError.message)
          } else {
            savedCount++
          }
        }
      } catch (saveErr) {
        console.warn(`Erreur sauvegarde ${company.name}:`, saveErr)
      }
    }

    // 4. Save scan record
    await supabase.from('search_scans').insert({
      user_id: user.id,
      query: `${query} - ${location}`,
      location: { lat: 0, lng: 0, radius: 0 },
      status: 'completed',
      progress: 100,
      companies_found: companies.length,
      companies_without_site: withoutWebsite,
      companies_needing_refonte: needingRefonte,
      completed_at: new Date().toISOString(),
    })

    console.log(`💾 ${savedCount}/${companies.length} entreprises sauvegardees [user: ${user.id}]`)

    return NextResponse.json({
      success: true,
      data: {
        total_found: total,
        processed: companies.length,
        without_site: withoutWebsite,
        with_site: withWebsite,
        needing_refonte: needingRefonte,
        audited: auditedCount,
        saved: savedCount,
        companies,
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

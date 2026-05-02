import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/server-auth'
import {
  enrichGooglePlace,
  googlePlaceToCompany,
  searchGooglePlaces,
  PlaceSearchResult,
} from '@/lib/google-maps'

export const maxDuration = 300

const DEFAULT_CATEGORIES = [
  'Restaurants',
  'Coiffeurs',
  'Plombiers',
  'Électriciens',
  'Dentistes',
  'Garages auto',
  'Agences immobilières',
]

const COST_PER_TEXT_SEARCH_EUR = 0.03
const COST_PER_PLACE_DETAILS_EUR = 0.02

const cityScanSchema = z.object({
  city: z.string().min(2).max(160),
  categories: z.array(z.string().min(2).max(80)).min(1).max(20).optional(),
  maxPerCategory: z.number().int().min(5).max(60).optional(),
  resumeScanId: z.string().uuid().optional(),
})

export async function GET() {
  const { supabase, user, response } = await requireAdmin()
  if (response || !user) return response

  const { data, error } = await supabase
    .from('admin_city_scans')
    .select('*')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ scans: data ?? [] })
}

export async function POST(request: Request) {
  const { supabase, user, response } = await requireAdmin()
  if (response || !user) return response

  const body = await request.json().catch(() => null)
  const parsed = cityScanSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return NextResponse.json({ error: 'GOOGLE_MAPS_API_KEY non configurée' }, { status: 503 })
  }

  let city = parsed.data.city.trim()
  let categories = parsed.data.categories?.length ? parsed.data.categories : DEFAULT_CATEGORIES
  let maxPerCategory = parsed.data.maxPerCategory ?? 60
  let placesFound = 0
  let created = 0
  let duplicates = 0
  let existingCategoryResults: {
    category: string
    found: number
    created: number
    duplicates: number
    without_site: number
    with_site: number
    error?: string
  }[] = []

  let scan: { id: string }
  if (parsed.data.resumeScanId) {
    const { data: existingScan, error: fetchError } = await supabase
      .from('admin_city_scans')
      .select('*')
      .eq('id', parsed.data.resumeScanId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingScan) {
      return NextResponse.json({ error: 'Scan introuvable' }, { status: 404 })
    }

    city = existingScan.city
    categories = existingScan.categories
    maxPerCategory = existingScan.max_per_category
    placesFound = existingScan.places_found ?? 0
    created = existingScan.companies_created ?? 0
    duplicates = existingScan.duplicates_skipped ?? 0
    existingCategoryResults = existingScan.category_results ?? []

    const completedCategories = new Set(existingCategoryResults.map((result) => result.category))
    categories = categories.filter((category) => !completedCategories.has(category))

    const { data: resumedScan, error: resumeError } = await supabase
      .from('admin_city_scans')
      .update({ status: 'running', error_message: null, progress: Math.max(existingScan.progress ?? 1, 1) })
      .eq('id', existingScan.id)
      .select('id')
      .single()

    if (resumeError) return NextResponse.json({ error: resumeError.message }, { status: 500 })
    scan = resumedScan
  } else {
    const { data: createdScan, error: scanError } = await supabase
      .from('admin_city_scans')
      .insert({
        user_id: user.id,
        city,
        categories,
        max_per_category: maxPerCategory,
        status: 'running',
        progress: 1,
      })
      .select('id')
      .single()

    if (scanError) return NextResponse.json({ error: scanError.message }, { status: 500 })
    scan = createdScan
  }

  let textSearchCalls = 0
  let detailsCalls = 0
  const categoryResults: {
    category: string
    found: number
    created: number
    duplicates: number
    without_site: number
    with_site: number
    error?: string
  }[] = [...existingCategoryResults]
  const totalCategories = parsed.data.resumeScanId
    ? (parsed.data.categories?.length ? parsed.data.categories.length : categoryResults.length + categories.length)
    : categories.length

  if (categories.length === 0) {
    const { data: completedScan } = await supabase
      .from('admin_city_scans')
      .update({ status: 'completed', progress: 100, completed_at: new Date().toISOString() })
      .eq('id', scan.id)
      .select()
      .single()

    return NextResponse.json({ scan: completedScan, categoryResults })
  }

  const { data: existingRows } = await supabase
    .from('companies')
    .select('google_place_id')
    .eq('user_id', user.id)
    .not('google_place_id', 'is', null)

  const knownPlaceIds = new Set(
    existingRows?.map((row) => row.google_place_id).filter(Boolean) ?? []
  )

  try {
    for (let categoryIndex = 0; categoryIndex < categories.length; categoryIndex++) {
      const category = categories[categoryIndex]
      const categoryPlaces: PlaceSearchResult[] = []
      let pageToken: string | undefined
      let categoryDuplicates = 0

      while (categoryPlaces.length < maxPerCategory) {
        const { places, nextPageToken } = await searchGooglePlaces({
          query: category,
          location: city,
          pageToken,
        })
        textSearchCalls++
        if (places.length === 0) break

        for (const place of places) {
          if (place.business_status === 'CLOSED_PERMANENTLY') continue
          if (knownPlaceIds.has(place.place_id)) {
            categoryDuplicates++
            duplicates++
            continue
          }
          knownPlaceIds.add(place.place_id)
          categoryPlaces.push(place)
          if (categoryPlaces.length >= maxPerCategory) break
        }

        if (!nextPageToken || categoryPlaces.length >= maxPerCategory) break
        await new Promise((resolve) => setTimeout(resolve, 2000))
        pageToken = nextPageToken
      }

      placesFound += categoryPlaces.length
      let categoryCreated = 0
      let withoutSite = 0
      let withSite = 0

      for (let i = 0; i < categoryPlaces.length; i += 5) {
        const batch = categoryPlaces.slice(i, i + 5)
        const enriched = await Promise.allSettled(batch.map((place) => enrichGooglePlace(place)))
        detailsCalls += batch.length

        for (const result of enriched) {
          if (result.status !== 'fulfilled') continue
          const place = result.value
          const company = googlePlaceToCompany(place)
          if (company.has_website) withSite++
          else withoutSite++

          const { error } = await supabase.from('companies').insert({
            user_id: user.id,
            name: company.name,
            address: company.address,
            city: company.city || city,
            postal_code: company.postal_code || '',
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

          if (!error) {
            created++
            categoryCreated++
          } else {
            duplicates++
            categoryDuplicates++
          }
        }

        if (i + 5 < categoryPlaces.length) await new Promise((resolve) => setTimeout(resolve, 300))
      }

      categoryResults.push({
        category,
        found: categoryPlaces.length,
        created: categoryCreated,
        duplicates: categoryDuplicates,
        without_site: withoutSite,
        with_site: withSite,
      })

      await supabase
        .from('admin_city_scans')
        .update({
          progress: Math.round((categoryResults.length / totalCategories) * 100),
          places_found: placesFound,
          companies_created: created,
          duplicates_skipped: duplicates,
          estimated_api_cost_eur: estimateCost(textSearchCalls, detailsCalls),
          category_results: categoryResults,
        })
        .eq('id', scan.id)
    }

    const completedAt = new Date().toISOString()
    const { data: completedScan } = await supabase
      .from('admin_city_scans')
      .update({
        status: 'completed',
        progress: 100,
        places_found: placesFound,
        companies_created: created,
        duplicates_skipped: duplicates,
        estimated_api_cost_eur: estimateCost(textSearchCalls, detailsCalls),
        category_results: categoryResults,
        completed_at: completedAt,
      })
      .eq('id', scan.id)
      .select()
      .single()

    return NextResponse.json({ scan: completedScan, categoryResults })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur scan ville'
    await supabase
      .from('admin_city_scans')
      .update({
        status: 'failed',
        error_message: message,
        category_results: categoryResults,
        estimated_api_cost_eur: estimateCost(textSearchCalls, detailsCalls),
        completed_at: new Date().toISOString(),
      })
      .eq('id', scan.id)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function estimateCost(textSearchCalls: number, detailsCalls: number): number {
  return Number(
    (textSearchCalls * COST_PER_TEXT_SEARCH_EUR + detailsCalls * COST_PER_PLACE_DETAILS_EUR).toFixed(2)
  )
}

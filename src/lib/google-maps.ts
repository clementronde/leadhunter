/**
 * Service d'intégration avec Google Places API
 * Documentation : https://developers.google.com/maps/documentation/places/web-service
 *
 * Utilise deux endpoints :
 * - Text Search : recherche d'entreprises par mot-clé + ville
 * - Place Details : récupération des détails (téléphone, site web, coordonnées)
 *
 * Nécessite : GOOGLE_MAPS_API_KEY dans .env.local
 */

import { Sector } from '@/types'

// ============================================
// Types internes Google Places API
// ============================================

interface PlaceSearchResult {
  place_id: string
  name: string
  formatted_address: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  types: string[]
  rating?: number
  user_ratings_total?: number
  business_status?: string
  website?: string // Pas disponible dans le search, seulement dans details
}

interface PlaceDetailsResult {
  place_id: string
  name: string
  formatted_address: string
  formatted_phone_number?: string
  international_phone_number?: string
  website?: string
  url: string // Lien Google Maps
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  types: string[]
  rating?: number
  user_ratings_total?: number
  business_status?: string
  opening_hours?: {
    open_now: boolean
  }
}

interface PlaceTextSearchResponse {
  status: string
  results: PlaceSearchResult[]
  next_page_token?: string
  error_message?: string
}

interface PlaceDetailsResponse {
  status: string
  result: PlaceDetailsResult
  error_message?: string
}

// ============================================
// Résultat enrichi d'un lieu
// ============================================

export interface GooglePlaceEnriched {
  place_id: string
  name: string
  address: string
  city: string
  postal_code: string
  phone: string | null
  website: string | null
  has_website: boolean
  coordinates: { lat: number; lng: number }
  types: string[]
  sector: Sector
  google_maps_url: string
  rating: number | null         // Note moyenne (ex: 4.3)
  reviews_count: number | null  // Nombre total d'avis Google
}

// ============================================
// Mapping des types Google Places vers nos secteurs
// ============================================

const googleTypesToSector: Record<string, Sector> = {
  // Restauration
  restaurant: 'restaurant',
  cafe: 'restaurant',
  bar: 'restaurant',
  bakery: 'restaurant',
  meal_delivery: 'restaurant',
  meal_takeaway: 'restaurant',
  food: 'restaurant',

  // Commerce de détail
  store: 'retail',
  clothing_store: 'retail',
  shoe_store: 'retail',
  jewelry_store: 'retail',
  book_store: 'retail',
  convenience_store: 'retail',
  department_store: 'retail',
  electronics_store: 'retail',
  furniture_store: 'retail',
  hardware_store: 'retail',
  home_goods_store: 'retail',
  pet_store: 'retail',
  shopping_mall: 'retail',
  supermarket: 'retail',
  grocery_or_supermarket: 'retail',
  florist: 'retail',

  // Santé
  doctor: 'health',
  dentist: 'health',
  hospital: 'health',
  pharmacy: 'health',
  physiotherapist: 'health',
  health: 'health',
  veterinary_care: 'health',
  optician: 'health',

  // Beauté
  beauty_salon: 'beauty',
  hair_care: 'beauty',
  spa: 'beauty',
  nail_salon: 'beauty',

  // BTP / Construction
  electrician: 'construction',
  plumber: 'construction',
  roofing_contractor: 'construction',
  general_contractor: 'construction',
  painter: 'construction',
  moving_company: 'construction',

  // Automobile
  car_dealer: 'automotive',
  car_repair: 'automotive',
  car_wash: 'automotive',
  gas_station: 'automotive',

  // Immobilier
  real_estate_agency: 'real_estate',

  // Services professionnels
  lawyer: 'professional_services',
  accounting: 'professional_services',
  insurance_agency: 'professional_services',
  travel_agency: 'professional_services',
  bank: 'professional_services',
  finance: 'professional_services',
  establishment: 'professional_services',

  // Éducation
  school: 'education',
  university: 'education',
  gym: 'education',
  library: 'education',
}

/**
 * Détermine le secteur à partir des types Google Places
 */
function googleTypesToOurSector(types: string[]): Sector {
  for (const type of types) {
    const sector = googleTypesToSector[type]
    if (sector) return sector
  }
  return 'other'
}

/**
 * Extrait la ville et le code postal depuis une adresse formatée Google
 * Format typique : "123 Rue Example, 75001 Paris, France"
 */
function parseAddressComponents(formattedAddress: string): {
  city: string
  postal_code: string
  street: string
} {
  // Séparer les parties de l'adresse
  const parts = formattedAddress.split(',').map((p) => p.trim())

  let city = ''
  let postal_code = ''
  let street = parts[0] || ''

  // Chercher la partie avec code postal (5 chiffres)
  for (const part of parts) {
    const postalMatch = part.match(/(\d{5})\s+(.+)/)
    if (postalMatch) {
      postal_code = postalMatch[1]
      city = postalMatch[2].trim()
      break
    }
  }

  // Fallback si pas trouvé
  if (!city && parts.length >= 2) {
    city = parts[parts.length - 2] || parts[0]
  }

  return { city, postal_code, street }
}

// ============================================
// Fonctions principales
// ============================================

/**
 * Recherche des entreprises via Google Places Text Search
 * @param query - Terme de recherche (ex: "restaurants", "coiffeurs")
 * @param location - Ville ou localisation (ex: "Paris 15ème", "Boulogne-Billancourt")
 * @param pageToken - Token pour la page suivante (pagination)
 */
export async function searchGooglePlaces(params: {
  query: string
  location: string
  pageToken?: string
}): Promise<{ places: PlaceSearchResult[]; nextPageToken?: string }> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY non configurée. Ajoutez-la dans .env.local')
  }

  const searchQuery = `${params.query} ${params.location}`

  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json')
  url.searchParams.set('query', searchQuery)
  url.searchParams.set('language', 'fr')
  url.searchParams.set('region', 'fr')
  url.searchParams.set('key', apiKey)

  if (params.pageToken) {
    url.searchParams.set('pagetoken', params.pageToken)
  }

  console.log(`🗺️ Google Places search: "${searchQuery}"`)

  const response = await fetch(url.toString())

  if (!response.ok) {
    throw new Error(`Google Places API error: ${response.status}`)
  }

  const data: PlaceTextSearchResponse = await response.json()

  if (data.status === 'REQUEST_DENIED') {
    throw new Error(`Google Places API refusée: ${data.error_message || 'Clé API invalide ou non autorisée'}`)
  }

  if (data.status === 'INVALID_REQUEST') {
    throw new Error(`Requête invalide: ${data.error_message || 'Paramètres incorrects'}`)
  }

  if (data.status === 'OVER_QUERY_LIMIT') {
    throw new Error('Quota Google Places API dépassé. Vérifiez votre facturation.')
  }

  // ZERO_RESULTS est valide (pas d'erreur)
  const places = data.results || []

  console.log(`📍 ${places.length} lieux trouvés`)

  return {
    places,
    nextPageToken: data.next_page_token,
  }
}

/**
 * Récupère les détails complets d'un lieu (téléphone, site web, etc.)
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetailsResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY non configurée')
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
  url.searchParams.set('place_id', placeId)
  // Champs nécessaires uniquement (pour optimiser le coût API)
  url.searchParams.set(
    'fields',
    'place_id,name,formatted_address,formatted_phone_number,international_phone_number,website,url,geometry,types,rating,user_ratings_total,business_status'
  )
  url.searchParams.set('language', 'fr')
  url.searchParams.set('key', apiKey)

  const response = await fetch(url.toString())

  if (!response.ok) {
    console.error(`Place Details API error: ${response.status} for place_id: ${placeId}`)
    return null
  }

  const data: PlaceDetailsResponse = await response.json()

  if (data.status !== 'OK') {
    console.warn(`Place Details status: ${data.status} for place_id: ${placeId}`)
    return null
  }

  return data.result
}

/**
 * Enrichit un lieu Google Places avec ses détails complets
 * et le convertit en format exploitable par LeadHunter
 */
export async function enrichGooglePlace(
  place: PlaceSearchResult
): Promise<GooglePlaceEnriched> {
  // Récupérer les détails (téléphone, site web précis)
  const details = await getPlaceDetails(place.place_id)

  const { city, postal_code, street } = parseAddressComponents(
    details?.formatted_address || place.formatted_address
  )

  const website = details?.website || null
  const phone =
    details?.formatted_phone_number ||
    details?.international_phone_number ||
    null

  return {
    place_id: place.place_id,
    name: details?.name || place.name,
    address: street,
    city,
    postal_code,
    phone,
    website,
    has_website: !!website,
    coordinates: {
      lat: details?.geometry?.location?.lat || place.geometry.location.lat,
      lng: details?.geometry?.location?.lng || place.geometry.location.lng,
    },
    types: details?.types || place.types,
    sector: googleTypesToOurSector(details?.types || place.types),
    google_maps_url: details?.url || '',
    rating: details?.rating ?? place.rating ?? null,
    reviews_count: details?.user_ratings_total ?? place.user_ratings_total ?? null,
  }
}

/**
 * Recherche complète avec enrichissement des lieux Google Maps
 * Gère la pagination automatiquement jusqu'à maxResults
 */
export async function searchAndEnrichGooglePlaces(params: {
  query: string
  location: string
  maxResults?: number
}): Promise<{
  places: GooglePlaceEnriched[]
  total: number
  withWebsite: number
  withoutWebsite: number
}> {
  const maxResults = params.maxResults || 20
  const enrichedPlaces: GooglePlaceEnriched[] = []

  let pageToken: string | undefined = undefined
  let fetchedCount = 0

  // Google Places retourne max 20 résultats par page, 3 pages max (60 résultats)
  while (fetchedCount < maxResults) {
    const { places, nextPageToken } = await searchGooglePlaces({
      query: params.query,
      location: params.location,
      pageToken,
    })

    if (places.length === 0) break

    // Traiter chaque lieu (jusqu'à la limite)
    const toProcess = places.slice(0, maxResults - fetchedCount)

    for (const place of toProcess) {
      try {
        // Ignorer les entreprises fermées définitivement
        if (place.business_status === 'CLOSED_PERMANENTLY') continue

        const enriched = await enrichGooglePlace(place)
        enrichedPlaces.push(enriched)

        // Pause pour respecter les rate limits Google API
        await new Promise((resolve) => setTimeout(resolve, 200))
      } catch (err) {
        console.warn(`Erreur enrichissement ${place.name}:`, err)
        // On continue avec les autres même si un lieu échoue
      }
    }

    fetchedCount += toProcess.length

    if (!nextPageToken || fetchedCount >= maxResults) break

    // Google impose une pause entre les pages (2 secondes minimum)
    await new Promise((resolve) => setTimeout(resolve, 2000))
    pageToken = nextPageToken
  }

  const withWebsite = enrichedPlaces.filter((p) => p.has_website).length
  const withoutWebsite = enrichedPlaces.filter((p) => !p.has_website).length

  return {
    places: enrichedPlaces,
    total: enrichedPlaces.length,
    withWebsite,
    withoutWebsite,
  }
}

/**
 * Convertit un GooglePlaceEnriched en format Company pour LeadHunter
 */
export function googlePlaceToCompany(place: GooglePlaceEnriched): {
  name: string
  address: string | null
  city: string
  postal_code: string
  phone: string | null
  coordinates: { lat: number; lng: number }
  sector: Sector
  source: 'google_places'
  website: string | null
  has_website: boolean
  google_rating: number | null
  google_reviews_count: number | null
  google_maps_url: string | null
  prospect_score: number
  priority: 'hot' | 'warm' | 'cold'
  status: 'new'
} {
  return {
    name: place.name,
    address: place.address || null,
    city: place.city,
    postal_code: place.postal_code,
    phone: place.phone,
    coordinates: place.coordinates,
    sector: place.sector,
    source: 'google_places' as const,
    website: place.website,
    has_website: place.has_website,
    google_rating: place.rating,
    google_reviews_count: place.reviews_count,
    google_maps_url: place.google_maps_url || null,
    // Score initial : sans site = 95 (hot), avec site = 50 (à affiner par l'audit)
    prospect_score: place.has_website ? 50 : 95,
    priority: place.has_website ? 'warm' : 'hot',
    status: 'new' as const,
  }
}

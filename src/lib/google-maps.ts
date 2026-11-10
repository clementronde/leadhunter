/**
 * Service d'intégration avec Google Places API (New)
 * Documentation : https://developers.google.com/maps/documentation/places/web-service/text-search
 *
 * Un seul endpoint : Text Search (New), qui renvoie directement téléphone, site web et avis.
 *
 * Nécessite : GOOGLE_MAPS_API_KEY dans .env.local, avec "Places API (New)" activée
 */

import { Sector } from '@/types'
import { getPriorityFromScore, scoreProspect } from './utils'
import { classifyWebsiteUrl, type WebPresence } from './web-presence'

// ============================================
// Types Google Places API (New)
// ============================================

/** Lieu tel que renvoyé par Text Search (New), normalisé pour LeadHunter */
export interface PlaceSearchResult {
  place_id: string
  name: string
  formatted_address: string
  address_components: AddressComponent[]
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  types: string[]
  primary_type?: string
  rating?: number
  user_ratings_total?: number
  business_status?: string
  website?: string
  phone?: string
  google_maps_url?: string
}

interface AddressComponent {
  longText?: string
  shortText?: string
  types?: string[]
}

interface NewPlace {
  id: string
  displayName?: { text: string; languageCode?: string }
  formattedAddress?: string
  addressComponents?: AddressComponent[]
  location?: { latitude: number; longitude: number }
  types?: string[]
  primaryType?: string
  rating?: number
  userRatingCount?: number
  businessStatus?: string
  websiteUri?: string
  nationalPhoneNumber?: string
  internationalPhoneNumber?: string
  googleMapsUri?: string
}

interface SearchTextResponse {
  places?: NewPlace[]
  nextPageToken?: string
}

interface GoogleApiError {
  error?: { code: number; message: string; status: string }
}

// Google facture selon le champ le plus cher demandé (site web / téléphone = Enterprise),
// mais cet appel unique remplace l'ancien couple Text Search + Place Details
const SEARCH_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.addressComponents',
  'places.location',
  'places.types',
  'places.primaryType',
  'places.rating',
  'places.userRatingCount',
  'places.businessStatus',
  'places.websiteUri',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.googleMapsUri',
  'nextPageToken',
].join(',')

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
  web_presence: WebPresence
  social_url: string | null
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
  dental_clinic: 'health',
  medical_clinic: 'health',
  chiropractor: 'health',
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
  hair_salon: 'beauty',
  barber_shop: 'beauty',
  beautician: 'beauty',
  massage: 'beauty',
  tanning_studio: 'beauty',

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
  // Pas de mapping pour 'establishment' / 'point_of_interest' : presque toutes les fiches
  // les portent, ils classaient à tort tout le monde en "Services"

  // Éducation
  school: 'education',
  university: 'education',
  gym: 'education',
  fitness_center: 'education',
  library: 'education',
}

/**
 * Détermine le secteur à partir des types Google Places (type principal en premier)
 */
function googleTypesToOurSector(types: string[], primaryType?: string): Sector {
  const ordered = primaryType ? [primaryType, ...types] : types
  for (const type of ordered) {
    const sector = googleTypesToSector[type]
    if (sector) return sector
  }
  // L'API New a des centaines de types fins (french_restaurant, shoe_store, ...)
  for (const type of ordered) {
    if (type.endsWith('_restaurant')) return 'restaurant'
    if (type.endsWith('_store') || type.endsWith('_shop')) return 'retail'
    if (type.endsWith('_contractor')) return 'construction'
  }
  return 'other'
}

/**
 * Extrait la ville et le code postal depuis une adresse formatée Google
 * Format typique : "123 Rue Example, 75001 Paris, France"
 */
function parseAddressComponents(formattedAddress: string, components: AddressComponent[] = []): {
  city: string
  postal_code: string
  street: string
} {
  // Adresse structurée de l'API New quand elle est complète
  const component = (type: string) => components.find((c) => c.types?.includes(type))?.longText
  const componentCity = component('locality') || component('postal_town')
  const componentPostal = component('postal_code')
  if (componentCity && componentPostal) {
    const street =
      [component('street_number'), component('route')].filter(Boolean).join(' ') ||
      formattedAddress.split(',')[0].trim()
    return { city: componentCity, postal_code: componentPostal, street }
  }

  // Séparer les parties de l'adresse
  const parts = formattedAddress.split(',').map((p) => p.trim())

  let city = ''
  let postal_code = ''
  const street = parts[0] || ''

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
 * Recherche des entreprises via Google Places Text Search (New)
 * Un appel renvoie jusqu'à 20 lieux avec site web, téléphone et avis : plus besoin de Place Details.
 * @param query - Terme de recherche (ex: "restaurants", "coiffeurs")
 * @param location - Ville ou localisation (ex: "Paris 15ème", "Boulogne-Billancourt")
 * @param pageToken - Token pour la page suivante (pagination, 60 résultats max)
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
  console.log(`🗺️ Google Places search: "${searchQuery}"`)

  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': SEARCH_FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: searchQuery,
      languageCode: 'fr',
      regionCode: 'FR',
      pageSize: 20,
      ...(params.pageToken ? { pageToken: params.pageToken } : {}),
    }),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as GoogleApiError
    const message = body.error?.message || `HTTP ${response.status}`
    if (response.status === 403) {
      throw new Error(`Google Places API refusée : ${message} (activez "Places API (New)" pour cette clé)`)
    }
    if (response.status === 429) {
      throw new Error('Quota Google Places API dépassé. Vérifiez votre facturation.')
    }
    if (response.status === 400) {
      throw new Error(`Requête invalide : ${message}`)
    }
    throw new Error(`Google Places API error : ${message}`)
  }

  const data: SearchTextResponse = await response.json()
  const places = (data.places || []).map(normalizePlace)

  console.log(`📍 ${places.length} lieux trouvés`)

  return {
    places,
    nextPageToken: data.nextPageToken,
  }
}

// ============================================
// Fiche Google collée à la main (lien partagé depuis Google Maps)
// ============================================
const GOOGLE_HOSTS = /^(maps\.app\.goo\.gl|goo\.gl|(www\.|maps\.)?google\.(com|fr|be|ch|ca|lu|de|es|it|co\.uk))$/i

/** Suit les redirections d'un lien court (maps.app.goo.gl) sans jamais sortir des domaines Google */
async function resolveMapsUrl(raw: string): Promise<URL> {
  let url = new URL(raw.trim())
  for (let hop = 0; hop < 5; hop++) {
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Lien invalide')
    if (!GOOGLE_HOSTS.test(url.hostname)) throw new Error("Ce lien n'est pas une fiche Google Maps")
    if (/google\./i.test(url.hostname) && url.pathname.startsWith('/maps')) return url
    const res = await fetch(url, { redirect: 'manual' })
    const next = res.headers.get('location')
    if (!next) return url
    url = new URL(next, url)
  }
  return url
}

/**
 * Retrouve la fiche Google Places à partir du lien d'une fiche Google Maps
 * (lien long google.com/maps/place/... ou lien court maps.app.goo.gl/...).
 */
export async function findPlaceFromMapsUrl(raw: string): Promise<PlaceSearchResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY non configurée. Ajoutez-la dans .env.local')

  const url = await resolveMapsUrl(raw)
  const decoded = decodeURIComponent(url.pathname + url.search).replace(/\+/g, ' ')

  // 1. Lien qui porte directement l'identifiant Places
  const placeId = url.searchParams.get('query_place_id') || decoded.match(/place_id:([A-Za-z0-9_-]+)/)?.[1]
  if (placeId) {
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=fr`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': SEARCH_FIELD_MASK.split(',').filter((f) => f.startsWith('places.')).map((f) => f.slice(7)).join(','),
      },
    })
    if (res.ok) return normalizePlace((await res.json()) as NewPlace)
  }

  // 2. Sinon : nom de la fiche + coordonnées présents dans le lien
  const name = decoded.match(/\/maps\/place\/([^/@]+)/)?.[1]?.trim() || url.searchParams.get('q')?.trim()
  if (!name) return null
  let coords: RegExpMatchArray | null =
    decoded.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || decoded.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)

  // Les liens partagés depuis l'appli mobile n'ont pas de coordonnées (seulement le nom) :
  // la page de la fiche les contient dans l'aperçu de carte (center=lat%2Clng)
  if (!coords) {
    try {
      const page = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Accept-Language': 'fr-FR,fr;q=0.9' },
      })
      if (page.ok) coords = (await page.text()).match(/center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/)
    } catch {
      // on cherche alors par le nom seul
    }
  }

  // Artisans sans vitrine (plombiers, électriciens…) : Google les exclut de la recherche par défaut,
  // il faut demander explicitement les « entreprises de zone de service » (includePureServiceAreaBusinesses)
  const attempts = coords ? [2000, 30000, null] : [null]
  for (const radius of attempts) {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': SEARCH_FIELD_MASK },
      body: JSON.stringify({
        textQuery: name,
        languageCode: 'fr',
        regionCode: 'FR',
        pageSize: 5,
        includePureServiceAreaBusinesses: true,
        ...(coords && radius
          ? { locationBias: { circle: { center: { latitude: Number(coords[1]), longitude: Number(coords[2]) }, radius } } }
          : {}),
      }),
    })
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as GoogleApiError
      throw new Error(`Google Places API error : ${body.error?.message || `HTTP ${response.status}`}`)
    }
    const data: SearchTextResponse = await response.json()
    const places = data.places ?? []
    if (places.length === 0) continue
    // On garde la fiche dont le nom correspond le mieux au lien
    const wanted = simplifyName(name)
    const best =
      places.find((p) => simplifyName(p.displayName?.text) === wanted) ||
      places.find((p) => {
        const got = simplifyName(p.displayName?.text)
        return got.includes(wanted) || wanted.includes(got)
      })
    if (best) return normalizePlace(best)
    if (radius !== null && radius <= 2000) return normalizePlace(places[0])
  }
  return null
}

function simplifyName(value?: string): string {
  return (value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function normalizePlace(place: NewPlace): PlaceSearchResult {
  return {
    place_id: place.id,
    name: place.displayName?.text || '',
    formatted_address: place.formattedAddress || '',
    address_components: place.addressComponents || [],
    geometry: {
      location: {
        lat: place.location?.latitude ?? 0,
        lng: place.location?.longitude ?? 0,
      },
    },
    types: place.types || [],
    primary_type: place.primaryType,
    rating: place.rating,
    user_ratings_total: place.userRatingCount,
    business_status: place.businessStatus,
    website: place.websiteUri,
    phone: place.nationalPhoneNumber || place.internationalPhoneNumber,
    google_maps_url: place.googleMapsUri,
  }
}

/**
 * Convertit un lieu Google Places en format exploitable par LeadHunter
 * (toutes les données viennent déjà de Text Search, aucun appel réseau)
 */
export function enrichGooglePlace(place: PlaceSearchResult): GooglePlaceEnriched {
  const { city, postal_code, street } = parseAddressComponents(
    place.formatted_address,
    place.address_components
  )

  const presence = classifyWebsiteUrl(place.website)
  const website = presence.website

  return {
    place_id: place.place_id,
    name: place.name,
    address: street,
    city,
    postal_code,
    phone: place.phone || null,
    website,
    has_website: !!website,
    web_presence: presence.presence,
    social_url: presence.socialUrl,
    coordinates: place.geometry.location,
    types: place.types,
    sector: googleTypesToOurSector(place.types, place.primary_type),
    google_maps_url: place.google_maps_url || '',
    rating: place.rating ?? null,
    reviews_count: place.user_ratings_total ?? null,
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

    const toProcess = places
      .slice(0, maxResults - fetchedCount)
      .filter((p) => p.business_status !== 'CLOSED_PERMANENTLY')
    enrichedPlaces.push(...toProcess.map(enrichGooglePlace))

    fetchedCount += toProcess.length

    if (!nextPageToken || fetchedCount >= maxResults) break

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
  web_presence: WebPresence
  social_url: string | null
  google_rating: number | null
  google_reviews_count: number | null
  google_maps_url: string | null
  prospect_score: number
  priority: 'hot' | 'warm' | 'cold'
  score_reasons: string[]
  status: 'new'
} {
  // Score initial ; les leads avec site seront affinés par l'audit
  const { score, reasons } = scoreProspect({
    hasWebsite: place.has_website,
    webPresence: place.web_presence,
    googleReviewsCount: place.reviews_count,
    googleRating: place.rating,
  })

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
    web_presence: place.web_presence,
    social_url: place.social_url,
    google_rating: place.rating,
    google_reviews_count: place.reviews_count,
    google_maps_url: place.google_maps_url || null,
    prospect_score: score,
    priority: getPriorityFromScore(score),
    score_reasons: reasons,
    status: 'new' as const,
  }
}

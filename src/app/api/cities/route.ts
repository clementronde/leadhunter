import { NextResponse } from 'next/server'

const FALLBACK_CITIES = [
  { name: 'Paris', postalCode: '75000', population: 2085000 },
  { name: 'Marseille', postalCode: '13000', population: 873000 },
  { name: 'Lyon', postalCode: '69000', population: 522000 },
  { name: 'Toulouse', postalCode: '31000', population: 504000 },
  { name: 'Nice', postalCode: '06000', population: 348000 },
  { name: 'Nantes', postalCode: '44000', population: 323000 },
  { name: 'Montpellier', postalCode: '34000', population: 303000 },
  { name: 'Strasbourg', postalCode: '67000', population: 291000 },
  { name: 'Bordeaux', postalCode: '33000', population: 262000 },
  { name: 'Lille', postalCode: '59000', population: 236000 },
]

function normalizeCityName(city: { nom: string; codesPostaux?: string[]; population?: number }) {
  return {
    name: city.nom,
    postalCode: city.codesPostaux?.[0] ?? '',
    population: city.population ?? 0,
  }
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim() ?? ''
  if (query.length < 2) return NextResponse.json({ cities: [] })

  try {
    const params = new URLSearchParams({
      nom: query,
      fields: 'nom,codesPostaux,population',
      boost: 'population',
      limit: '8',
    })
    const res = await fetch(`https://geo.api.gouv.fr/communes?${params.toString()}`, {
      next: { revalidate: 60 * 60 * 24 },
    })

    if (!res.ok) throw new Error('Geo API unavailable')
    const cities = (await res.json()).map(normalizeCityName)
    return NextResponse.json({ cities })
  } catch {
    const lowerQuery = query.toLowerCase()
    return NextResponse.json({
      cities: FALLBACK_CITIES.filter((city) => city.name.toLowerCase().startsWith(lowerQuery)).slice(0, 8),
    })
  }
}

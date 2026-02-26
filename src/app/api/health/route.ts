import { NextResponse } from 'next/server'

/**
 * GET /api/health
 * Endpoint de diagnostic — vérifie quelles clés API sont configurées.
 * Ne révèle jamais la valeur des clés, seulement leur présence.
 */
export async function GET() {
  const googleMapsKey = process.env.GOOGLE_MAPS_API_KEY
  const pageSpeedKey = process.env.PAGESPEED_API_KEY
  const inseeKey = process.env.INSEE_API_KEY

  // Masque la clé en ne montrant que les 6 premiers caractères
  const mask = (key: string | undefined) =>
    key ? `${key.slice(0, 6)}${'*'.repeat(Math.min(key.length - 6, 10))}` : null

  return NextResponse.json({
    status: 'ok',
    env: process.env.NODE_ENV,
    keys: {
      GOOGLE_MAPS_API_KEY: {
        configured: !!googleMapsKey && googleMapsKey !== 'VOTRE_CLE_API_GOOGLE_MAPS',
        preview: mask(googleMapsKey),
      },
      PAGESPEED_API_KEY: {
        configured: !!pageSpeedKey,
        preview: mask(pageSpeedKey),
      },
      INSEE_API_KEY: {
        configured: !!inseeKey,
        preview: mask(inseeKey),
      },
    },
  })
}

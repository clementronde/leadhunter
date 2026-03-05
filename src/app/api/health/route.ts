import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * GET /api/health
 * Endpoint de diagnostic — réservé aux utilisateurs authentifiés.
 * N'expose jamais les valeurs des clés, seulement leur présence.
 */
export async function GET(request: NextRequest) {
  const response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  return NextResponse.json({
    status: 'ok',
    keys: {
      GOOGLE_MAPS_API_KEY: !!process.env.GOOGLE_MAPS_API_KEY && process.env.GOOGLE_MAPS_API_KEY !== 'VOTRE_CLE_API_GOOGLE_MAPS',
      PAGESPEED_API_KEY: !!process.env.PAGESPEED_API_KEY,
      INSEE_API_KEY: !!process.env.INSEE_API_KEY,
      HUNTER_API_KEY: !!process.env.HUNTER_API_KEY,
      STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
    },
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

function keyStatus(value: string | undefined, invalidPlaceholder?: string) {
  const configured = !!value && value !== invalidPlaceholder
  return {
    configured,
    preview: configured && value ? `${value.slice(0, 4)}...${value.slice(-4)}` : null,
  }
}

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
      GOOGLE_MAPS_API_KEY: keyStatus(process.env.GOOGLE_MAPS_API_KEY, 'VOTRE_CLE_API_GOOGLE_MAPS'),
      PAGESPEED_API_KEY: keyStatus(process.env.PAGESPEED_API_KEY),
      INSEE_API_KEY: keyStatus(process.env.INSEE_API_KEY),
      HUNTER_API_KEY: keyStatus(process.env.HUNTER_API_KEY),
      RESEND_API_KEY: keyStatus(process.env.RESEND_API_KEY),
      RESEND_WEBHOOK_SECRET: keyStatus(process.env.RESEND_WEBHOOK_SECRET),
      CRON_SECRET: keyStatus(process.env.CRON_SECRET),
      SUPABASE_SERVICE_ROLE_KEY: keyStatus(process.env.SUPABASE_SERVICE_ROLE_KEY),
      STRIPE_SECRET_KEY: keyStatus(process.env.STRIPE_SECRET_KEY),
    },
  })
}

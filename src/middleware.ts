import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Security headers appliqués à toutes les réponses
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  )
  response.headers.set('X-DNS-Prefetch-Control', 'off')
  // Content-Security-Policy : limite les sources de scripts/styles/frames
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      // Scripts : self + Next.js inline scripts nécessaires
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      // Styles : self + inline (Tailwind)
      "style-src 'self' 'unsafe-inline'",
      // Images : self + Supabase storage + data URIs
      `img-src 'self' data: blob: ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}`,
      // Connexions réseau autorisées
      `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''} https://api.stripe.com https://api.hunter.io`,
      // Frames : Stripe checkout uniquement
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  )
  return response
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isLoginPage = pathname === '/login'
  const isRootPage = pathname === '/'
  const isPricingPage = pathname === '/pricing'
  const isAdminRoute = pathname.startsWith('/admin')

  // Non connecté → redirect login (sauf pages publiques)
  if (!user && !isLoginPage && !isRootPage && !isPricingPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return applySecurityHeaders(NextResponse.redirect(url))
  }

  // Connecté sur la page login → dashboard
  if (user && isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return applySecurityHeaders(NextResponse.redirect(url))
  }

  // Protection des routes admin
  if (user && isAdminRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return applySecurityHeaders(NextResponse.redirect(url))
    }
  }

  return applySecurityHeaders(supabaseResponse)
}

export const config = {
  matcher: [
    /*
     * Toutes les routes sauf :
     * - _next/static, _next/image (assets)
     * - favicon.ico
     * - api/ (les routes API gèrent leur propre auth)
     * - auth/callback (OAuth callback)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/|auth/callback).*)',
  ],
}

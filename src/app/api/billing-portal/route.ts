import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  // Rate limit : 5 accès/min (évite le spam vers Stripe)
  const rl = rateLimit(`billing-portal:${user.id}`, { windowMs: 60_000, max: 5 })
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Trop de requêtes, réessayez dans une minute' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: 'Aucun abonnement trouvé' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    new URL(request.url).origin

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl}/upgrade`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[billing-portal]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Erreur de facturation' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { stripe } from '@/lib/stripe'

// Chemins relatifs autorisés pour la redirection post-paiement
const ALLOWED_RETURN_PATHS = ['/upgrade', '/settings', '/leads', '/']

export async function POST(request: Request) {
  let returnPath = '/upgrade'
  try {
    const body = await request.json()
    if (
      body?.returnPath &&
      typeof body.returnPath === 'string' &&
      ALLOWED_RETURN_PATHS.includes(body.returnPath)
    ) {
      returnPath = body.returnPath
    }
  } catch {
    // corps absent ou JSON invalide — utiliser valeur par défaut
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    new URL(request.url).origin

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
      success_url: `${appUrl}${returnPath}?success=true`,
      cancel_url: `${appUrl}${returnPath}`,
      client_reference_id: user.id,
      customer_email: user.email,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[checkout]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Erreur de paiement' }, { status: 500 })
  }
}

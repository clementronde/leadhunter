import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/server-auth'
import { rateLimit } from '@/lib/rate-limit'
import { composeColdEmail } from '@/lib/ai-outreach'
import { buildSignature } from '@/lib/followups'

export const maxDuration = 60

const optional = (max: number) => z.string().trim().max(max).optional().nullable()

const composeSchema = z.object({
  companyName: z.string().trim().min(1).max(200),
  activity: optional(200),
  city: optional(120),
  contactName: optional(120),
  website: optional(300),
  googleRating: optional(120),
  observations: optional(2000),
  offer: optional(500),
  channel: z.enum(['email', 'short']).default('email'),
})

/** Rédige 3 versions de cold email à partir des infos saisies par l'utilisateur (sans lead enregistré) */
export async function POST(request: Request) {
  const { supabase, user, response } = await requireUser()
  if (response || !user) return response

  const rl = rateLimit(`compose:${user.id}`, { windowMs: 60_000, max: 10 })
  if (!rl.success) {
    return NextResponse.json({ error: 'Trop de demandes, réessayez dans une minute' }, { status: 429 })
  }

  const { data: profile } = await supabase.from('profiles').select('plan, role').eq('id', user.id).single()
  if (profile?.plan !== 'pro' && profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Rédaction par IA réservée au plan Pro' }, { status: 403 })
  }

  const parsed = composeSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Indiquez au moins le nom de l’entreprise' }, { status: 400 })
  }

  const { data: settings } = await supabase.from('outreach_settings').select('*').eq('user_id', user.id).maybeSingle()

  try {
    const variants = await composeColdEmail({
      ...parsed.data,
      sender: {
        name: settings?.sender_name,
        agency: settings?.agency_name,
        signature: buildSignature(settings),
      },
    })
    return NextResponse.json({ variants })
  } catch (error) {
    console.error('Rédaction libre échouée:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Impossible de rédiger le message pour le moment' }, { status: 502 })
  }
}

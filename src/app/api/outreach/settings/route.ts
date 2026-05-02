import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/server-auth'

const settingsSchema = z.object({
  sender_name: z.string().max(120).nullable().optional(),
  sender_email: z.string().email().nullable().optional(),
  agency_name: z.string().max(160).nullable().optional(),
  agency_website: z.string().url().nullable().optional().or(z.literal('')),
  agency_phone: z.string().max(50).nullable().optional(),
  signature: z.string().max(2000).nullable().optional(),
  reply_to: z.string().email().nullable().optional().or(z.literal('')),
})

export async function GET() {
  const { supabase, user, response } = await requireUser()
  if (response || !user) return response

  const { data, error } = await supabase
    .from('outreach_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ settings: data ?? null })
}

export async function PUT(request: Request) {
  const { supabase, user, response } = await requireUser()
  if (response || !user) return response

  const body = await request.json().catch(() => null)
  const parsed = settingsSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const input = parsed.data
  const payload = {
    user_id: user.id,
    sender_name: input.sender_name || null,
    sender_email: input.sender_email || null,
    agency_name: input.agency_name || null,
    agency_website: input.agency_website || null,
    agency_phone: input.agency_phone || null,
    signature: input.signature || null,
    reply_to: input.reply_to || null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('outreach_settings')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ settings: data })
}

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
  if (webhookSecret) {
    const provided =
      request.headers.get('x-webhook-secret') ||
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (provided !== webhookSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const payload = await request.json().catch(() => null)
  const eventType = payload?.type || payload?.event || payload?.data?.type
  const messageId =
    payload?.data?.email_id ||
    payload?.data?.id ||
    payload?.email_id ||
    payload?.id

  if (!eventType || !messageId) {
    return NextResponse.json({ ok: true, ignored: true })
  }

  const now = new Date().toISOString()
  const updates: Record<string, string> = {
    provider_event: eventType,
    updated_at: now,
  }

  if (String(eventType).includes('opened')) updates.opened_at = now
  if (String(eventType).includes('clicked')) updates.clicked_at = now
  if (String(eventType).includes('bounced')) updates.bounced_at = now
  if (String(eventType).includes('complained')) updates.complained_at = now

  const { error } = await supabaseAdmin
    .from('email_messages')
    .update(updates)
    .eq('provider_message_id', messageId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

import type { SupabaseClient } from '@supabase/supabase-js'

export const DAILY_SEND_LIMIT = 50

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function assertCanContactEmail({
  supabase,
  userId,
  email,
}: {
  supabase: SupabaseClient
  userId: string
  email: string
}) {
  const normalized = normalizeEmail(email)

  const { data: blocked } = await supabase
    .from('blocked_recipients')
    .select('id')
    .eq('user_id', userId)
    .eq('email', normalized)
    .maybeSingle()

  if (blocked) {
    throw new Error('Cette adresse est dans la blacklist')
  }
}

export async function assertDailySendLimit({
  supabase,
  userId,
  addCount = 1,
}: {
  supabase: SupabaseClient
  userId: string
  addCount?: number
}) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  const { count } = await supabase
    .from('email_messages')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'sent')
    .gte('sent_at', start.toISOString())

  if ((count ?? 0) + addCount > DAILY_SEND_LIMIT) {
    throw new Error(`Limite quotidienne atteinte (${DAILY_SEND_LIMIT} emails/jour)`)
  }
}

export async function blockRecipient({
  supabase,
  userId,
  email,
  reason,
}: {
  supabase: SupabaseClient
  userId: string
  email: string
  reason: string
}) {
  await supabase
    .from('blocked_recipients')
    .upsert({
      user_id: userId,
      email: normalizeEmail(email),
      reason,
    }, { onConflict: 'user_id,email' })
}

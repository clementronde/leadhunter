import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { formatSender, sendEmail } from '@/lib/outreach-provider'

export const maxDuration = 120

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: messages, error } = await supabaseAdmin
    .from('email_messages')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString())
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: { id: string; status: string; error?: string }[] = []
  type OutreachCronSettings = {
    sender_email?: string | null
    sender_name?: string | null
    agency_name?: string | null
    reply_to?: string | null
  }
  const settingsCache = new Map<string, OutreachCronSettings>()

  for (const message of messages ?? []) {
    let settings: OutreachCronSettings | undefined = settingsCache.get(message.user_id)
    if (!settings) {
      const { data } = await supabaseAdmin
        .from('outreach_settings')
        .select('*')
        .eq('user_id', message.user_id)
        .maybeSingle()
      const loadedSettings: OutreachCronSettings = data ?? {}
      settings = loadedSettings
      settingsCache.set(message.user_id, settings)
    }
    const senderEmail = message.sender_email || settings?.sender_email
    if (!senderEmail) {
      results.push({ id: message.id, status: 'failed', error: 'Aucun expéditeur' })
      continue
    }

    try {
      await supabaseAdmin.from('email_messages').update({ status: 'sending' }).eq('id', message.id)
      const sent = await sendEmail({
        from: formatSender(settings?.sender_name || settings?.agency_name, senderEmail),
        to: message.recipient_email,
        subject: message.subject,
        body: message.body,
        replyTo: settings?.reply_to || senderEmail,
      })

      await supabaseAdmin
        .from('email_messages')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          provider: sent.provider,
          provider_message_id: sent.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', message.id)

      if (message.company_id) {
        await supabaseAdmin
          .from('companies')
          .update({
            status: 'contacted',
            last_contacted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', message.company_id)
      }

      results.push({ id: message.id, status: 'sent' })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur envoi email'
      await supabaseAdmin
        .from('email_messages')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', message.id)
      results.push({ id: message.id, status: 'failed', error: errorMessage })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}

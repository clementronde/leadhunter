import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { appendOptOutFooter, formatSender, sendEmail } from '@/lib/outreach-provider'
import { assertCanContactEmail, assertDailySendLimit } from '@/lib/outreach-guards'

export const maxDuration = 120

async function handleCron(request: Request) {
  const secret = process.env.CRON_SECRET
  const urlSecret = new URL(request.url).searchParams.get('secret')
  if (!secret || (request.headers.get('authorization') !== `Bearer ${secret}` && urlSecret !== secret)) {
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
      await assertCanContactEmail({ supabase: supabaseAdmin, userId: message.user_id, email: message.recipient_email })
      await assertDailySendLimit({ supabase: supabaseAdmin, userId: message.user_id })

      if (message.company_id) {
        const { data: company } = await supabaseAdmin
          .from('companies')
          .select('do_not_contact')
          .eq('id', message.company_id)
          .maybeSingle()
        if (company?.do_not_contact) {
          await supabaseAdmin.from('email_messages').update({ status: 'cancelled' }).eq('id', message.id)
          results.push({ id: message.id, status: 'cancelled', error: 'Lead opt-out' })
          continue
        }
      }

      await supabaseAdmin.from('email_messages').update({ status: 'sending' }).eq('id', message.id)
      const sent = await sendEmail({
        from: formatSender(settings?.sender_name || settings?.agency_name, senderEmail),
        to: message.recipient_email,
        subject: message.subject,
        body: appendOptOutFooter(
          message.body,
          message.id,
          process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
        ),
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
      if (message.campaign_id) await syncCampaignStats(message.campaign_id)

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
      if (message.campaign_id) await syncCampaignStats(message.campaign_id)
      results.push({ id: message.id, status: 'failed', error: errorMessage })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}

async function syncCampaignStats(campaignId: string) {
  const { data: messages } = await supabaseAdmin
    .from('email_messages')
    .select('status')
    .eq('campaign_id', campaignId)
    .is('followup_of', null)

  const all = messages ?? []
  const sentCount = all.filter((message) => message.status === 'sent').length
  const failedCount = all.filter((message) => message.status === 'failed').length
  const pendingCount = all.filter((message) => ['scheduled', 'sending'].includes(message.status)).length

  await supabaseAdmin
    .from('email_campaigns')
    .update({
      sent_count: sentCount,
      failed_count: failedCount,
      status: pendingCount === 0 ? 'completed' : 'running',
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaignId)
}

export async function POST(request: Request) {
  return handleCron(request)
}

export async function GET(request: Request) {
  return handleCron(request)
}

import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server-auth'
import { appendOptOutFooter, formatSender, sendEmail } from '@/lib/outreach-provider'
import { assertCanContactEmail, assertDailySendLimit } from '@/lib/outreach-guards'

export async function GET() {
  const { supabase, user, response } = await requireUser()
  if (response || !user) return response

  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const { data, error } = await supabase
    .from('email_messages')
    .select('*, companies(name, city)')
    .eq('user_id', user.id)
    .eq('status', 'scheduled')
    .lte('scheduled_at', todayEnd.toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ messages: data ?? [] })
}

export async function POST(request: Request) {
  const { supabase, user, response } = await requireUser()
  if (response || !user) return response

  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, role')
    .eq('id', user.id)
    .single()

  if (!isCron && profile?.plan !== 'pro' && profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Fonctionnalité réservée Pro/Admin' }, { status: 403 })
  }

  const now = new Date().toISOString()
  const { data: settings } = await supabase
    .from('outreach_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: dueMessages, error } = await supabase
    .from('email_messages')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'scheduled')
    .lte('scheduled_at', now)
    .limit(25)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: { id: string; status: string; error?: string }[] = []

  for (const message of dueMessages ?? []) {
    const senderEmail = message.sender_email || settings?.sender_email || user.email
    if (!senderEmail) {
      results.push({ id: message.id, status: 'failed', error: 'Aucun expéditeur' })
      continue
    }

    try {
      await assertCanContactEmail({ supabase, userId: user.id, email: message.recipient_email })
      await assertDailySendLimit({ supabase, userId: user.id })

      if (message.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('do_not_contact')
          .eq('id', message.company_id)
          .eq('user_id', user.id)
          .maybeSingle()
        if (company?.do_not_contact) {
          await supabase.from('email_messages').update({ status: 'cancelled', updated_at: now }).eq('id', message.id)
          results.push({ id: message.id, status: 'cancelled', error: 'Lead opt-out' })
          continue
        }
      }

      await supabase.from('email_messages').update({ status: 'sending', updated_at: now }).eq('id', message.id)
      const sent = await sendEmail({
        from: formatSender(settings?.sender_name || settings?.agency_name, senderEmail),
        to: message.recipient_email,
        subject: message.subject,
        body: appendOptOutFooter(message.body, message.id, new URL(request.url).origin),
        replyTo: settings?.reply_to || senderEmail,
      })

      await supabase
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
        await supabase
          .from('companies')
          .update({
            status: 'contacted',
            last_contacted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', message.company_id)
      }
      if (message.campaign_id) await syncCampaignStats(supabase, message.campaign_id)

      results.push({ id: message.id, status: 'sent' })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur envoi email'
      await supabase
        .from('email_messages')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', message.id)

      if (message.campaign_id) await syncCampaignStats(supabase, message.campaign_id)
      results.push({ id: message.id, status: 'failed', error: errorMessage })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}

async function syncCampaignStats(
  supabase: Awaited<ReturnType<typeof requireUser>>['supabase'],
  campaignId: string
) {
  const { data: messages } = await supabase
    .from('email_messages')
    .select('status')
    .eq('campaign_id', campaignId)
    .is('followup_of', null)

  const all = messages ?? []
  const sentCount = all.filter((message) => message.status === 'sent').length
  const failedCount = all.filter((message) => message.status === 'failed').length
  const pendingCount = all.filter((message) => ['scheduled', 'sending'].includes(message.status)).length

  await supabase
    .from('email_campaigns')
    .update({
      sent_count: sentCount,
      failed_count: failedCount,
      status: pendingCount === 0 ? 'completed' : 'running',
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaignId)
}

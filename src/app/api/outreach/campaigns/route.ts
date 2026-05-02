import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/server-auth'
import { assertDailySendLimit, normalizeEmail } from '@/lib/outreach-guards'

const messageSchema = z.object({
  companyId: z.string().uuid(),
  recipientEmail: z.string().email(),
  subject: z.string().min(1).max(300),
  body: z.string().min(1).max(10000),
  templateId: z.string().max(50).optional(),
})

const campaignSchema = z.object({
  name: z.string().min(1).max(180),
  messages: z.array(messageSchema).min(1).max(200),
  scheduledAt: z.string().datetime().optional().nullable(),
  followupDelays: z.array(z.number().int().min(1).max(60)).max(3).optional(),
})

export async function GET() {
  const { supabase, user, response } = await requireUser()
  if (response || !user) return response

  const { data, error } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ campaigns: data ?? [] })
}

export async function POST(request: Request) {
  const { supabase, user, response } = await requireUser()
  if (response || !user) return response

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, role')
    .eq('id', user.id)
    .single()

  if (profile?.plan !== 'pro' && profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Fonctionnalité réservée Pro/Admin' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const parsed = campaignSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const input = parsed.data
  const scheduledAt = input.scheduledAt
    ? new Date(input.scheduledAt)
    : new Date(Date.now() + 60_000)
  const followupDelays = input.followupDelays ?? []
  const companyIds = input.messages.map((message) => message.companyId)

  const { data: blockedCompanies } = await supabase
    .from('companies')
    .select('id')
    .eq('user_id', user.id)
    .eq('do_not_contact', true)
    .in('id', companyIds)

  const blockedIds = new Set((blockedCompanies ?? []).map((company) => company.id))
  const normalizedEmails = input.messages.map((message) => normalizeEmail(message.recipientEmail))
  const { data: blockedRecipients } = await supabase
    .from('blocked_recipients')
    .select('email')
    .eq('user_id', user.id)
    .in('email', normalizedEmails)
  const blockedEmails = new Set((blockedRecipients ?? []).map((row) => row.email))

  const allowedMessages = input.messages.filter((message) =>
    !blockedIds.has(message.companyId) && !blockedEmails.has(normalizeEmail(message.recipientEmail))
  )

  if (allowedMessages.length === 0) {
    return NextResponse.json({ error: 'Tous les destinataires sont en opt-out' }, { status: 409 })
  }

  const { data: campaign, error: campaignError } = await supabase
    .from('email_campaigns')
    .insert({
      user_id: user.id,
      name: input.name,
      status: 'scheduled',
      scheduled_at: scheduledAt.toISOString(),
      followup_delays: followupDelays,
      total_recipients: allowedMessages.length,
      template_id: allowedMessages[0]?.templateId ?? null,
    })
    .select()
    .single()

  if (campaignError) return NextResponse.json({ error: campaignError.message }, { status: 500 })

  const baseMessages = allowedMessages.map((message) => ({
    user_id: user.id,
    campaign_id: campaign.id,
    company_id: message.companyId,
    recipient_email: normalizeEmail(message.recipientEmail),
    subject: message.subject,
    body: message.body,
    template_id: message.templateId ?? null,
    status: 'scheduled',
    scheduled_at: scheduledAt.toISOString(),
  }))

  const { data: insertedMessages, error: messagesError } = await supabase
    .from('email_messages')
    .insert(baseMessages)
    .select('id, company_id, recipient_email, subject, body, template_id, scheduled_at')

  if (messagesError) return NextResponse.json({ error: messagesError.message }, { status: 500 })

  if (followupDelays.length > 0 && insertedMessages) {
    const followups = insertedMessages.flatMap((message) =>
      followupDelays.map((days) => {
        const followupDate = new Date(message.scheduled_at)
        followupDate.setDate(followupDate.getDate() + days)

        return {
          user_id: user.id,
          campaign_id: campaign.id,
          company_id: message.company_id,
          recipient_email: message.recipient_email,
          subject: `Relance - ${message.subject}`,
          body: message.body,
          template_id: message.template_id,
          status: 'scheduled',
          scheduled_at: followupDate.toISOString(),
          followup_of: message.id,
          followup_delay_days: days,
        }
      })
    )

    await supabase.from('email_messages').insert(followups)
  }

  return NextResponse.json({
    campaign,
    skipped_opt_out: input.messages.length - allowedMessages.length,
    messages_created: insertedMessages?.length ?? 0,
    followups_created: (insertedMessages?.length ?? 0) * followupDelays.length,
  })
}

export async function DELETE(request: Request) {
  const { supabase, user, response } = await requireUser()
  if (response || !user) return response

  const body = await request.json().catch(() => null)
  const parsed = z.object({
    campaignId: z.string().uuid(),
    mode: z.literal('failed'),
  }).safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const { data: failedMessages, error } = await supabase
    .from('email_messages')
    .select('company_id, recipient_email, subject, body, template_id')
    .eq('campaign_id', parsed.data.campaignId)
    .eq('user_id', user.id)
    .eq('status', 'failed')
    .is('followup_of', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!failedMessages?.length) return NextResponse.json({ created: 0 })

  try {
    await assertDailySendLimit({ supabase, userId: user.id, addCount: failedMessages.length })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Limite atteinte' }, { status: 409 })
  }

  const retryAt = new Date(Date.now() + 60_000).toISOString()
  const { data: inserted, error: insertError } = await supabase
    .from('email_messages')
    .insert(failedMessages.map((message) => ({
      user_id: user.id,
      campaign_id: parsed.data.campaignId,
      company_id: message.company_id,
      recipient_email: message.recipient_email,
      subject: message.subject,
      body: message.body,
      template_id: message.template_id,
      status: 'scheduled',
      scheduled_at: retryAt,
    })))
    .select('id')

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  return NextResponse.json({ created: inserted?.length ?? 0 })
}

export async function PATCH(request: Request) {
  const { supabase, user, response } = await requireUser()
  if (response || !user) return response

  const body = await request.json().catch(() => null)
  const parsed = z.object({
    campaignId: z.string().uuid(),
    status: z.literal('cancelled'),
  }).safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const { data: campaign, error } = await supabase
    .from('email_campaigns')
    .update({ status: 'cancelled', updated_at: now })
    .eq('id', parsed.data.campaignId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase
    .from('email_messages')
    .update({ status: 'cancelled', updated_at: now })
    .eq('campaign_id', parsed.data.campaignId)
    .eq('status', 'scheduled')
    .eq('user_id', user.id)

  return NextResponse.json({ campaign })
}

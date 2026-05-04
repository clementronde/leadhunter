import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/server-auth'
import { appendOptOutFooter, formatSender, sendEmail } from '@/lib/outreach-provider'
import { assertCanContactEmail, assertDailySendLimit, normalizeEmail } from '@/lib/outreach-guards'

const sendSchema = z.object({
  companyId: z.string().uuid(),
  recipientEmail: z.string().email(),
  subject: z.string().min(1).max(300),
  body: z.string().min(1).max(10000),
  templateId: z.string().max(50).optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  followupDelays: z.array(z.number().int().min(1).max(60)).max(3).optional(),
})

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
  const parsed = sendSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const input = parsed.data
  const scheduledDate = input.scheduledAt ? new Date(input.scheduledAt) : null
  const isFutureSchedule = scheduledDate && scheduledDate.getTime() > Date.now() + 60_000

  const { data: company } = await supabase
    .from('companies')
    .select('id, do_not_contact')
    .eq('id', input.companyId)
    .eq('user_id', user.id)
    .single()

  if (!company) {
    return NextResponse.json({ error: 'Lead introuvable' }, { status: 404 })
  }
  if (company.do_not_contact) {
    return NextResponse.json({ error: 'Ce lead est marqué comme ne pas contacter' }, { status: 409 })
  }

  try {
    await assertCanContactEmail({ supabase, userId: user.id, email: input.recipientEmail })
    if (!isFutureSchedule) await assertDailySendLimit({ supabase, userId: user.id })
  } catch (error) {
    console.error('Contact/send limit error', { userId: user.id, email: input.recipientEmail, error: error instanceof Error ? error.message : error })
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Envoi bloqué' }, { status: 409 })
  }

  const { data: settings, error: settingsError } = await supabase
    .from('outreach_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (settingsError) {
    return NextResponse.json({ error: settingsError.message }, { status: 500 })
  }

  const senderEmail = settings?.sender_email || user.email
  if (!senderEmail) {
    console.error('No sender email configured', { userId: user.id, userEmail: user.email, settings })
    return NextResponse.json({ 
      error: 'Aucun email expéditeur configuré. Allez dans Paramètres > Outreach pour configurer un email professionnel, ou vérifiez que votre profil a un email valide.',
      details: { hasSettings: !!settings, hasUserEmail: !!user.email }
    }, { status: 400 })
  }

  const baseMessage = {
    user_id: user.id,
    company_id: input.companyId,
    recipient_email: normalizeEmail(input.recipientEmail),
    sender_email: senderEmail,
    subject: input.subject,
    body: input.body,
    template_id: input.templateId ?? null,
    scheduled_at: scheduledDate?.toISOString() ?? null,
  }

  if (isFutureSchedule) {
    const { data: message, error } = await supabase
      .from('email_messages')
      .insert({ ...baseMessage, status: 'scheduled' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await createFollowups({
      supabase,
      userId: user.id,
      companyId: input.companyId,
      baseMessageId: message.id,
      recipientEmail: input.recipientEmail,
      senderEmail,
      subject: `Relance - ${input.subject}`,
      body: input.body,
      templateId: input.templateId ?? null,
      startDate: scheduledDate,
      delays: input.followupDelays ?? [],
    })

    return NextResponse.json({ message, scheduled: true })
  }

  const { data: inserted, error: insertError } = await supabase
    .from('email_messages')
    .insert({ ...baseMessage, status: 'sending' })
    .select()
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  try {
    const result = await sendEmail({
      from: formatSender(settings?.sender_name || settings?.agency_name, senderEmail),
      to: input.recipientEmail,
      subject: input.subject,
      body: appendOptOutFooter(input.body, inserted.id, new URL(request.url).origin),
      replyTo: settings?.reply_to || senderEmail,
    })

    const now = new Date().toISOString()
    const { data: message, error: updateError } = await supabase
      .from('email_messages')
      .update({
        status: 'sent',
        sent_at: now,
        provider: result.provider,
        provider_message_id: result.id,
        updated_at: now,
      })
      .eq('id', inserted.id)
      .select()
      .single()

    if (updateError) {
      console.error('Database update error after send', { messageId: inserted.id, error: updateError })
      throw updateError
    }

    await supabase
      .from('companies')
      .update({ status: 'contacted', last_contacted_at: now, updated_at: now })
      .eq('id', input.companyId)

    await supabase.from('notes').insert({
      user_id: user.id,
      company_id: input.companyId,
      content: `Email "${input.subject}" envoyé depuis LeadHunter à ${input.recipientEmail}.`,
    })

    await createFollowups({
      supabase,
      userId: user.id,
      companyId: input.companyId,
      baseMessageId: message.id,
      recipientEmail: input.recipientEmail,
      senderEmail,
      subject: `Relance - ${input.subject}`,
      body: input.body,
      templateId: input.templateId ?? null,
      startDate: new Date(),
      delays: input.followupDelays ?? [],
    })

    return NextResponse.json({ message, scheduled: false })
  } catch (error) {
    const now = new Date().toISOString()
    const errorMessage = error instanceof Error ? error.message : 'Erreur envoi email'
    console.error('Email send failed', { messageId: inserted.id, userId: user.id, error: errorMessage, senderEmail, recipientEmail: input.recipientEmail })

    const { data: message } = await supabase
      .from('email_messages')
      .update({
        status: 'failed',
        failed_at: now,
        error_message: errorMessage,
        provider: 'resend',
        updated_at: now,
      })
      .eq('id', inserted.id)
      .select()
      .single()

    return NextResponse.json({ error: errorMessage, message }, { status: 502 })
  }
}

async function createFollowups({
  supabase,
  userId,
  companyId,
  baseMessageId,
  recipientEmail,
  senderEmail,
  subject,
  body,
  templateId,
  startDate,
  delays,
}: {
  supabase: Awaited<ReturnType<typeof requireUser>>['supabase']
  userId: string
  companyId: string
  baseMessageId: string
  recipientEmail: string
  senderEmail: string
  subject: string
  body: string
  templateId: string | null
  startDate: Date
  delays: number[]
}) {
  if (delays.length === 0) return

  const followups = delays.map((days) => {
    const scheduledAt = new Date(startDate)
    scheduledAt.setDate(scheduledAt.getDate() + days)

    return {
      user_id: userId,
      company_id: companyId,
      recipient_email: recipientEmail,
      sender_email: senderEmail,
      subject,
      body,
      template_id: templateId,
      status: 'scheduled',
      scheduled_at: scheduledAt.toISOString(),
      followup_of: baseMessageId,
      followup_delay_days: days,
    }
  })

  await supabase.from('email_messages').insert(followups)
}

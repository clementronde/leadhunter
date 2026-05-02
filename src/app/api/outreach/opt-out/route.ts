import { supabaseAdmin } from '@/lib/supabase-admin'
import { blockRecipient } from '@/lib/outreach-guards'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const messageId = url.searchParams.get('message')

  if (!messageId) {
    return new Response('Lien de désinscription invalide.', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  const { data: message } = await supabaseAdmin
    .from('email_messages')
    .select('id, company_id, user_id, recipient_email')
    .eq('id', messageId)
    .maybeSingle()

  if (!message?.company_id) {
    return new Response('Lien de désinscription introuvable.', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  const now = new Date().toISOString()
  await supabaseAdmin
    .from('companies')
    .update({
      do_not_contact: true,
      opt_out_at: now,
      opt_out_reason: 'Lien de désinscription email',
      updated_at: now,
    })
    .eq('id', message.company_id)

  await blockRecipient({
    supabase: supabaseAdmin,
    userId: message.user_id,
    email: message.recipient_email,
    reason: 'Lien de désinscription email',
  })

  await supabaseAdmin
    .from('email_messages')
    .update({ status: 'cancelled', updated_at: now })
    .eq('company_id', message.company_id)
    .eq('status', 'scheduled')

  return new Response(
    'Votre désinscription est bien prise en compte. Vous ne recevrez plus de prospection depuis LeadHunter.',
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
  )
}

export async function POST(request: Request) {
  return GET(request)
}

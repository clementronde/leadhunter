import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server-auth'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user, response } = await requireUser()
  if (response || !user) return response

  const { id } = await params
  const { data: campaign, error: campaignError } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (campaignError) return NextResponse.json({ error: campaignError.message }, { status: 404 })

  const { data: messages, error: messagesError } = await supabase
    .from('email_messages')
    .select('*, companies(name, city, status, do_not_contact)')
    .eq('campaign_id', id)
    .eq('user_id', user.id)
    .order('scheduled_at', { ascending: true })

  if (messagesError) return NextResponse.json({ error: messagesError.message }, { status: 500 })

  return NextResponse.json({ campaign, messages: messages ?? [] })
}

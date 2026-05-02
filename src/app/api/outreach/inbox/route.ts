import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server-auth'

const MESSAGE_SELECT = `
  *,
  companies (
    id,
    name,
    city,
    status
  )
`

export async function GET() {
  const { supabase, user, response } = await requireUser()
  if (response || !user) return response

  const now = new Date().toISOString()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [due, failed, activity] = await Promise.all([
    supabase
      .from('email_messages')
      .select(MESSAGE_SELECT)
      .eq('user_id', user.id)
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)
      .order('scheduled_at', { ascending: true })
      .limit(50),
    supabase
      .from('email_messages')
      .select(MESSAGE_SELECT)
      .eq('user_id', user.id)
      .eq('status', 'failed')
      .order('failed_at', { ascending: false, nullsFirst: false })
      .limit(50),
    supabase
      .from('email_messages')
      .select(MESSAGE_SELECT)
      .eq('user_id', user.id)
      .or(`opened_at.gte.${sevenDaysAgo},clicked_at.gte.${sevenDaysAgo},bounced_at.gte.${sevenDaysAgo},complained_at.gte.${sevenDaysAgo}`)
      .order('updated_at', { ascending: false })
      .limit(50),
  ])

  const error = due.error || failed.error || activity.error
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    due: due.data ?? [],
    failed: failed.data ?? [],
    activity: activity.data ?? [],
  })
}

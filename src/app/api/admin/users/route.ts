import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin, adminListUsers } from '@/lib/supabase-admin'

export async function GET() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify caller is admin
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch all profiles using service role (bypass RLS)
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('id, plan, role, updated_at')
    .order('updated_at', { ascending: false })

  if (profilesError) {
    console.error('[admin/users] profiles error:', profilesError.message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }

  const { data: authData, error: authError } = await adminListUsers()

  if (authError) {
    console.error('[admin/users] auth error:', authError.message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }

  const authUserMap = new Map(authData.users.map((u) => [u.id, { email: u.email, created_at: u.created_at }]))

  const users = (profiles ?? []).map((p) => ({
    id: p.id,
    email: authUserMap.get(p.id)?.email ?? null,
    plan: p.plan,
    role: p.role,
    created_at: authUserMap.get(p.id)?.created_at ?? p.updated_at,
  }))

  return NextResponse.json({ users })
}

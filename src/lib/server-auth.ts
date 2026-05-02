import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function createRouteSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
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
}

export async function requireUser() {
  const supabase = await createRouteSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      supabase,
      user: null,
      response: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }),
    }
  }

  return { supabase, user, response: null }
}

export async function requireAdmin() {
  const auth = await requireUser()
  if (!auth.user) return { ...auth, profile: null }

  const { data: profile } = await auth.supabase
    .from('profiles')
    .select('role, plan')
    .eq('id', auth.user.id)
    .single()

  if (profile?.role !== 'admin') {
    return {
      ...auth,
      profile,
      response: NextResponse.json({ error: 'Accès réservé admin' }, { status: 403 }),
    }
  }

  return { ...auth, profile, response: null }
}

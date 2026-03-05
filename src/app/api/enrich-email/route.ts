import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { domain, companyId } = await req.json()
    if (!domain) return NextResponse.json({ error: 'Missing domain' }, { status: 400 })

    const hunterKey = process.env.HUNTER_API_KEY
    if (!hunterKey) {
      return NextResponse.json({ error: 'HUNTER_API_KEY non configurée' }, { status: 503 })
    }

    // Clean domain
    const cleanDomain = domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]

    const res = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(cleanDomain)}&api_key=${hunterKey}&limit=1`
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'Erreur Hunter.io' }, { status: 502 })
    }

    const data = await res.json()
    const emails: { value: string; confidence: number }[] = data?.data?.emails ?? []

    if (emails.length === 0) {
      return NextResponse.json({ email: null, message: 'Aucun email trouvé pour ce domaine' })
    }

    // Take highest confidence email
    const best = emails.sort((a, b) => b.confidence - a.confidence)[0]
    const email = best.value

    // Save to DB if companyId provided
    if (companyId) {
      await supabase
        .from('companies')
        .update({ email, updated_at: new Date().toISOString() })
        .eq('id', companyId)
    }

    return NextResponse.json({ email, confidence: best.confidence })
  } catch (err) {
    console.error('Enrich email error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

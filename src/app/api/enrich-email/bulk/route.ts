import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/server-auth'
import { findBestEmailForDomain } from '@/lib/email-enrichment'

export const maxDuration = 120

const bulkSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
})

export async function POST(request: Request) {
  const { supabase, user, response } = await requireUser()
  if (response || !user) return response

  const body = await request.json().catch(() => ({}))
  const parsed = bulkSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  if (!process.env.HUNTER_API_KEY) {
    return NextResponse.json({ error: 'HUNTER_API_KEY non configurée' }, { status: 503 })
  }

  const limit = parsed.data.limit ?? 25
  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, name, website, email')
    .eq('user_id', user.id)
    .is('email', null)
    .not('website', 'is', null)
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let found = 0
  let failed = 0
  const results: { id: string; name: string; email: string | null; status: string; error?: string }[] = []

  for (const company of companies ?? []) {
    try {
      const result = await findBestEmailForDomain(company.website)
      if (result.email) {
        await supabase
          .from('companies')
          .update({ email: result.email, updated_at: new Date().toISOString() })
          .eq('id', company.id)
          .eq('user_id', user.id)
        found++
        results.push({ id: company.id, name: company.name, email: result.email, status: 'found' })
      } else {
        results.push({ id: company.id, name: company.name, email: null, status: 'not_found' })
      }
    } catch (err) {
      failed++
      results.push({
        id: company.id,
        name: company.name,
        email: null,
        status: 'failed',
        error: err instanceof Error ? err.message : 'Erreur enrichissement',
      })
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  return NextResponse.json({
    processed: companies?.length ?? 0,
    found,
    failed,
    results,
  })
}

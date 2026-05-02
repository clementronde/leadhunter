import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/server-auth'
import { runAuditForCompany } from '@/lib/audit-runner'

export const maxDuration = 180

const queueSchema = z.object({
  companyIds: z.array(z.string().uuid()).max(100).optional(),
  limit: z.number().int().min(1).max(100).optional(),
})

export async function GET() {
  const { supabase, user, response } = await requireUser()
  if (response || !user) return response

  const { data, error } = await supabase
    .from('audit_jobs')
    .select('*, companies(name, city)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ jobs: data ?? [] })
}

export async function POST(request: Request) {
  const { supabase, user, response } = await requireUser()
  if (response || !user) return response

  const body = await request.json().catch(() => ({}))
  const parsed = queueSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, role')
    .eq('id', user.id)
    .single()

  if (profile?.plan !== 'pro' && profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Fonctionnalité réservée Pro/Admin' }, { status: 403 })
  }

  const limit = parsed.data.limit ?? 25
  let query = supabase
    .from('companies')
    .select('id, website')
    .eq('user_id', user.id)
    .not('website', 'is', null)

  if (parsed.data.companyIds?.length) {
    query = query.in('id', parsed.data.companyIds)
  } else {
    query = query.limit(limit)
  }

  const { data: companies, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const jobs = (companies ?? []).map((company) => ({
    user_id: user.id,
    company_id: company.id,
    url: company.website,
    status: 'pending',
  }))

  if (jobs.length === 0) return NextResponse.json({ created: 0, jobs: [] })

  const { data, error: insertError } = await supabase
    .from('audit_jobs')
    .insert(jobs)
    .select()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  return NextResponse.json({ created: data?.length ?? 0, jobs: data ?? [] })
}

export async function PATCH(request: Request) {
  const { supabase, user, response } = await requireUser()
  if (response || !user) return response

  const body = await request.json().catch(() => ({}))
  const limit = Math.min(Number(body.limit ?? 5), 10)

  const { data: jobs, error } = await supabase
    .from('audit_jobs')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: { id: string; status: string; error?: string }[] = []

  for (const job of jobs ?? []) {
    const now = new Date().toISOString()
    await supabase
      .from('audit_jobs')
      .update({ status: 'running', started_at: now, attempts: job.attempts + 1, updated_at: now })
      .eq('id', job.id)

    try {
      await runAuditForCompany({
        supabase,
        userId: user.id,
        companyId: job.company_id,
        url: job.url,
      })

      await supabase
        .from('audit_jobs')
        .update({ status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', job.id)

      results.push({ id: job.id, status: 'completed' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur audit'
      await supabase
        .from('audit_jobs')
        .update({ status: 'failed', error_message: message, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', job.id)
      results.push({ id: job.id, status: 'failed', error: message })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}

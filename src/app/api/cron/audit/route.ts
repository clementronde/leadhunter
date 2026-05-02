import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { runAuditForCompany } from '@/lib/audit-runner'

export const maxDuration = 180

async function handleCron(request: Request) {
  const secret = process.env.CRON_SECRET
  const urlSecret = new URL(request.url).searchParams.get('secret')
  if (!secret || (request.headers.get('authorization') !== `Bearer ${secret}` && urlSecret !== secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: jobs, error } = await supabaseAdmin
    .from('audit_jobs')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: { id: string; status: string; error?: string }[] = []

  for (const job of jobs ?? []) {
    await supabaseAdmin
      .from('audit_jobs')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
        attempts: job.attempts + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id)

    try {
      await runAuditForCompany({
        supabase: supabaseAdmin,
        userId: job.user_id,
        companyId: job.company_id,
        url: job.url,
      })

      await supabaseAdmin
        .from('audit_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id)

      results.push({ id: job.id, status: 'completed' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur audit'
      await supabaseAdmin
        .from('audit_jobs')
        .update({
          status: 'failed',
          error_message: message,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id)

      results.push({ id: job.id, status: 'failed', error: message })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}

export async function POST(request: Request) {
  return handleCron(request)
}

export async function GET(request: Request) {
  return handleCron(request)
}

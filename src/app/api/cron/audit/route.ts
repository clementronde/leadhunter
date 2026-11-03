import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { runAuditForCompany } from '@/lib/audit-runner'

export const maxDuration = 300

// Plusieurs audits en parallèle, et on arrête de prendre de nouveaux jobs avant la limite Vercel
const CONCURRENCY = 4
const MAX_JOBS_PER_RUN = 60
const TIME_BUDGET_MS = 220_000
const MAX_ATTEMPTS = 3

async function handleCron(request: Request) {
  const secret = process.env.CRON_SECRET
  const urlSecret = new URL(request.url).searchParams.get('secret')
  if (!secret || (request.headers.get('authorization') !== `Bearer ${secret}` && urlSecret !== secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()

  // Jobs bloqués en "running" depuis plus d'une heure (fonction coupée) : on les remet en file
  await supabaseAdmin
    .from('audit_jobs')
    .update({ status: 'pending', updated_at: new Date().toISOString() })
    .eq('status', 'running')
    .lt('started_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .lt('attempts', MAX_ATTEMPTS)

  const { data: jobs, error } = await supabaseAdmin
    .from('audit_jobs')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(MAX_JOBS_PER_RUN)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: { id: string; status: string; error?: string }[] = []
  const queue = [...(jobs ?? [])]

  const worker = async () => {
    while (queue.length > 0 && Date.now() - startedAt < TIME_BUDGET_MS) {
      const job = queue.shift()
      if (!job) return

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
        // Erreur passagère (timeout PageSpeed…) : on retentera au prochain passage
        const retry = job.attempts + 1 < MAX_ATTEMPTS
        await supabaseAdmin
          .from('audit_jobs')
          .update({
            status: retry ? 'pending' : 'failed',
            error_message: message,
            completed_at: retry ? null : new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id)

        results.push({ id: job.id, status: retry ? 'retry' : 'failed', error: message })
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  return NextResponse.json({ processed: results.length, remaining: queue.length, results })
}

export async function POST(request: Request) {
  return handleCron(request)
}

export async function GET(request: Request) {
  return handleCron(request)
}

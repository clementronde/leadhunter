import { analyzeWebsite, scoreProspectFromAudit } from '@/lib/pagespeed'
import { getPriorityFromScore } from '@/lib/utils'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function runAuditForCompany({
  supabase,
  userId,
  companyId,
  url,
}: {
  supabase: SupabaseClient
  userId: string
  companyId: string
  url: string
}) {
  const [result, { data: company }] = await Promise.all([
    analyzeWebsite(url),
    supabase
      .from('companies')
      .select('google_reviews_count, google_rating')
      .eq('id', companyId)
      .eq('user_id', userId)
      .maybeSingle(),
  ])
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Échec de l\'audit')
  }

  const { score: prospectScore, reasons } = scoreProspectFromAudit(result.data, company ?? undefined)
  const priority = getPriorityFromScore(prospectScore)

  const { error: upsertError } = await supabase.from('website_audits').upsert(
    { ...result.data, company_id: companyId, user_id: userId, url },
    { onConflict: 'company_id' }
  )
  if (upsertError) throw upsertError

  await supabase
    .from('companies')
    .update({
      prospect_score: prospectScore,
      priority,
      score_reasons: reasons,
      web_presence: 'website',
      updated_at: new Date().toISOString(),
    })
    .eq('id', companyId)
    .eq('user_id', userId)

  return { audit: result.data, prospect_score: prospectScore, priority, score_reasons: reasons }
}

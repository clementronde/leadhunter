import { analyzeWebsite, scoreProspectFromAudit } from '@/lib/pagespeed'
import { getPriorityFromScore } from '@/lib/utils'
import { reviewDesign, uploadScreenshot } from '@/lib/design-review'
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
      .select('name, google_reviews_count, google_rating')
      .eq('id', companyId)
      .eq('user_id', userId)
      .maybeSingle(),
  ])
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Échec de l\'audit')
  }

  // Capture + note "design daté" : bonus, un échec ne bloque pas l'audit
  if (result.screenshot) {
    const screenshot = result.screenshot
    const [screenshotUrl, review] = await Promise.all([
      uploadScreenshot({ screenshot, userId, companyId }).catch((error) => {
        console.warn('Capture non enregistrée:', error)
        return null
      }),
      reviewDesign({ screenshot, url, companyName: company?.name }).catch((error) => {
        console.warn('Analyse design échouée:', error)
        return null
      }),
    ])
    result.data.screenshot_url = screenshotUrl
    if (review) {
      result.data.design_score = review.dated_score
      result.data.design_verdict = review.verdict
      result.data.design_reasons = review.reasons
      if (review.dated_score >= 7) {
        result.data.issues = [
          ...(result.data.issues ?? []),
          {
            type: 'design',
            severity: review.dated_score >= 8 ? 'critical' : 'warning',
            title: 'Design daté',
            message: review.verdict,
            recommendation: 'Refonte graphique : mise en page actuelle, typographies et visuels modernisés',
          },
        ]
      }
    }
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

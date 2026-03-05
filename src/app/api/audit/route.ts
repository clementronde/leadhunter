import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { analyzeWebsite, calculateProspectScoreFromAudit } from '@/lib/pagespeed'
import { getPriorityFromScore } from '@/lib/utils'
import { z } from 'zod'

export const maxDuration = 60

function createSupabaseFromRequest(request: NextRequest) {
  const response = NextResponse.next({ request })
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )
}

const auditSchema = z.object({
  url: z.string().url('URL invalide').max(2048),
  companyId: z.string().uuid().optional(),
})

/**
 * POST /api/audit
 * Audit complet d'un site web avec PageSpeed Insights
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseFromRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
    }

    const parsed = auditSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { url, companyId } = parsed.data

    // Si companyId fourni, vérifier que le lead appartient à cet utilisateur
    if (companyId) {
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('id', companyId)
        .eq('user_id', user.id)
        .single()

      if (!company) {
        return NextResponse.json({ error: 'Lead introuvable' }, { status: 404 })
      }
    }

    console.log(`🔍 Audit: ${url} [user: ${user.id}]`)

    const result = await analyzeWebsite(url)

    if (!result.success || !result.data) {
      return NextResponse.json(
        { success: false, error: result.error || 'Échec de l\'audit' },
        { status: 400 }
      )
    }

    const prospectScore = calculateProspectScoreFromAudit(result.data)
    const priority = getPriorityFromScore(prospectScore)

    if (companyId) {
      const { error: upsertError } = await supabase.from('website_audits').upsert(
        { ...result.data, company_id: companyId, user_id: user.id, url },
        { onConflict: 'company_id' }
      )
      if (upsertError) console.error('Audit upsert error:', upsertError.message)
      await supabase
        .from('companies')
        .update({ prospect_score: prospectScore, priority, updated_at: new Date().toISOString() })
        .eq('id', companyId)
        .eq('user_id', user.id)
    }

    console.log(`✅ Audit terminé: score ${result.data.overall_score} [user: ${user.id}]`)

    return NextResponse.json({
      success: true,
      data: {
        audit: { ...result.data, company_id: companyId || null },
        prospect_score: prospectScore,
        priority,
      },
    })

  } catch (error) {
    console.error('Audit error:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'audit' }, { status: 500 })
  }
}

// GET supprimé — potentiel bypass d'authentification (les cookies du request original
// ne sont pas transmis lors de la création d'un nouveau NextRequest)

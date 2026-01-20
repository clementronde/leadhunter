import { NextRequest, NextResponse } from 'next/server'
import { analyzeWebsite, calculateProspectScoreFromAudit } from '@/lib/pagespeed'
import { getPriorityFromScore } from '@/lib/utils'

export const maxDuration = 30 // Timeout de 30 secondes

/**
 * POST /api/audit
 * Audit complet d'un site web avec PageSpeed Insights
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, companyId } = body

    if (!url) {
      return NextResponse.json(
        { error: 'URL requise' },
        { status: 400 }
      )
    }

    console.log(`🔍 Audit du site: ${url}`)

    // Lancer l'analyse PageSpeed
    const result = await analyzeWebsite(url)

    if (!result.success || !result.data) {
      return NextResponse.json(
        { 
          success: false,
          error: result.error || 'Échec de l\'audit'
        },
        { status: 400 }
      )
    }

    // Calculer le score prospect
    const prospectScore = calculateProspectScoreFromAudit(result.data)
    const priority = getPriorityFromScore(prospectScore)

    console.log(`✅ Audit terminé: score global ${result.data.overall_score}, prospect score ${prospectScore}`)

    return NextResponse.json({
      success: true,
      data: {
        audit: {
          ...result.data,
          company_id: companyId || null
        },
        prospect_score: prospectScore,
        priority
      }
    })

  } catch (error) {
    console.error('Audit error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'audit', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/audit?url=...
 * Version GET pour tester rapidement
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  
  if (!url) {
    return NextResponse.json(
      { error: 'Paramètre url requis' },
      { status: 400 }
    )
  }

  // Rediriger vers POST
  return POST(new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({ url }),
    headers: { 'Content-Type': 'application/json' }
  }))
}

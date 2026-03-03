import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { searchEtablissements, etablissementToCompany } from '@/lib/insee'
import { checkWebsiteExists, findWebsiteForCompany, analyzeWebsite, calculateProspectScoreFromAudit } from '@/lib/pagespeed'
import { getPriorityFromScore } from '@/lib/utils'

export const maxDuration = 60

function createSupabaseFromRequest(request: NextRequest) {
  const response = NextResponse.next({ request })
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseFromRequest(request)

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
    }

    const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
    const isProUser = profile?.plan === 'pro'
    if (!isProUser) {
      const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0)
      const { count } = await supabase.from('search_scans')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id).gte('started_at', startOfMonth.toISOString())
      if ((count ?? 0) >= 3)
        return NextResponse.json({ error: 'Limite atteinte', code: 'SCAN_LIMIT_REACHED' }, { status: 403 })
    }

    const body = await request.json()
    const { codePostal, commune, activite, nombreResultats: requestedNombre = 50 } = body
    const nombreResultats = isProUser ? requestedNombre : Math.min(requestedNombre, 10)

    if (!codePostal && !commune) {
      return NextResponse.json(
        { error: 'Code postal ou commune requis' },
        { status: 400 }
      )
    }

    console.log(`🔍 Recherche INSEE: ${commune || codePostal}, activite: ${activite || 'toutes'} [user: ${user.id}]`)

    const { total, etablissements } = await searchEtablissements({
      codePostal,
      commune,
      activite,
      nombreResultats
    })

    console.log(`📊 ${total} etablissements trouves, traitement de ${etablissements.length}`)

    const companies = []
    let withoutSite = 0
    let needingRefonte = 0

    for (const etab of etablissements) {
      const company = etablissementToCompany(etab)

      const website = await findWebsiteForCompany(company.name, company.city)

      if (website) {
        company.website = website
        company.has_website = true

        const checkResult = await checkWebsiteExists(website)

        if (checkResult.exists) {
          company.prospect_score = checkResult.isHttps ? 50 : 65
          company.priority = getPriorityFromScore(company.prospect_score)

          if (!checkResult.isHttps) {
            needingRefonte++
          }
        }
      } else {
        withoutSite++
      }

      companies.push(company)
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Save companies with user_id
    let savedCount = 0
    for (const company of companies) {
      try {
        const { error: insertError } = await supabase
          .from('companies')
          .insert({
            user_id: user.id,
            name: company.name,
            address: company.address,
            city: company.city,
            postal_code: company.postal_code,
            sector: company.sector,
            source: company.source,
            website: company.website,
            has_website: company.has_website,
            prospect_score: company.prospect_score,
            priority: company.priority,
            status: 'new',
          })

        if (!insertError) savedCount++
      } catch (saveErr) {
        console.warn(`Erreur sauvegarde ${company.name}:`, saveErr)
      }
    }

    // Save scan record
    await supabase.from('search_scans').insert({
      user_id: user.id,
      query: `${activite || 'Entreprises'} - ${commune || codePostal}`,
      location: { lat: 0, lng: 0, radius: 0 },
      status: 'completed',
      progress: 100,
      companies_found: companies.length,
      companies_without_site: withoutSite,
      companies_needing_refonte: needingRefonte,
      completed_at: new Date().toISOString(),
    })

    console.log(`✅ Scan termine: ${companies.length} entreprises, ${withoutSite} sans site, ${needingRefonte} a refaire [user: ${user.id}]`)

    return NextResponse.json({
      success: true,
      data: {
        total_found: total,
        processed: companies.length,
        without_site: withoutSite,
        needing_refonte: needingRefonte,
        companies
      }
    })

  } catch (error) {
    console.error('Scan error:', error)

    if (error instanceof Error && error.message.includes('INSEE credentials')) {
      return NextResponse.json(
        { error: 'API INSEE non configuree', details: 'Ajoutez INSEE_CLIENT_ID et INSEE_CLIENT_SECRET dans .env.local' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur lors du scan', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { searchEtablissements, etablissementToCompany } from '@/lib/insee'
import { checkWebsiteExists, findWebsiteForCompany, analyzeWebsite, calculateProspectScoreFromAudit } from '@/lib/pagespeed'
import { getPriorityFromScore } from '@/lib/utils'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'

const scanSchema = z.object({
  codePostal: z.string().regex(/^\d{5}$/).optional(),
  commune: z.string().min(1).max(100).optional(),
  activite: z.string().max(100).optional(),
  nombreResultats: z.number().int().min(1).max(100).optional(),
}).refine((d) => d.codePostal || d.commune, {
  message: 'codePostal ou commune requis',
})

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

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Rate limit : 5 scans/min max (protection burst)
    const rl = rateLimit(`scan:${user.id}`, { windowMs: 60_000, max: 5 })
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes, réessayez dans une minute' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
      )
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

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
    }

    const parsed = scanSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { codePostal, commune, activite, nombreResultats: requestedNombre = 50 } = parsed.data
    const nombreResultats = isProUser ? requestedNombre : Math.min(requestedNombre, 10)

    console.log(`🔍 Recherche INSEE: cp=${!!codePostal} commune=${!!commune} activite=${!!activite} n=${nombreResultats} [user: ${user.id}]`)

    // Récupérer les SIRETs déjà en DB pour cet utilisateur (déduplication)
    const { data: existingRows } = await supabase
      .from('companies')
      .select('siret')
      .eq('user_id', user.id)
      .not('siret', 'is', null)

    const existingSirets = new Set((existingRows ?? []).map((r: { siret: string }) => r.siret))

    // Paginer INSEE jusqu'à avoir `nombreResultats` nouveaux établissements
    const batchSize = Math.min(Math.max(nombreResultats * 2, 20), 100)
    const freshEtablissements: Awaited<ReturnType<typeof searchEtablissements>>['etablissements'] = []
    let debut = 0
    let totalAvailable = Infinity

    while (freshEtablissements.length < nombreResultats && debut < totalAvailable) {
      const { total, etablissements } = await searchEtablissements({
        codePostal,
        commune,
        activite,
        nombreResultats: batchSize,
        debut,
      })

      totalAvailable = total
      console.log(`📊 Batch @${debut}: ${etablissements.length}/${total} — déjà en DB: ${existingSirets.size}`)

      for (const etab of etablissements) {
        if (!existingSirets.has(etab.siret)) {
          freshEtablissements.push(etab)
          existingSirets.add(etab.siret) // éviter doublons dans ce scan
          if (freshEtablissements.length >= nombreResultats) break
        }
      }

      if (etablissements.length < batchSize) break // plus de résultats disponibles
      debut += batchSize
    }

    const toProcess = freshEtablissements.slice(0, nombreResultats)
    console.log(`✅ ${toProcess.length} nouveaux établissements à traiter`)

    const companies = []
    let withoutSite = 0
    let needingRefonte = 0

    for (const etab of toProcess) {
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
            siret: company.siret,
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
        total_found: totalAvailable,
        processed: companies.length,
        without_site: withoutSite,
        needing_refonte: needingRefonte,
        companies
      }
    })

  } catch (error) {
    console.error('Scan error:', error)

    console.error('Scan INSEE error:', error)
    if (error instanceof Error && error.message.includes('INSEE')) {
      return NextResponse.json({ error: 'API INSEE non configurée' }, { status: 500 })
    }
    return NextResponse.json({ error: 'Erreur lors du scan' }, { status: 500 })
  }
}

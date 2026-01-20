import { NextRequest, NextResponse } from 'next/server'
import { searchEtablissements, etablissementToCompany } from '@/lib/insee'
import { checkWebsiteExists, findWebsiteForCompany, analyzeWebsite, calculateProspectScoreFromAudit } from '@/lib/pagespeed'
import { getPriorityFromScore } from '@/lib/utils'

export const maxDuration = 60 // Timeout de 60 secondes pour Vercel

/**
 * POST /api/scan
 * Lance un scan pour trouver des entreprises
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { codePostal, commune, activite, nombreResultats = 50 } = body

    if (!codePostal && !commune) {
      return NextResponse.json(
        { error: 'Code postal ou commune requis' },
        { status: 400 }
      )
    }

    // 1. Rechercher les entreprises via INSEE
    console.log(`🔍 Recherche INSEE: ${commune || codePostal}, activité: ${activite || 'toutes'}`)
    
    const { total, etablissements } = await searchEtablissements({
      codePostal,
      commune,
      activite,
      nombreResultats
    })

    console.log(`📊 ${total} établissements trouvés, traitement de ${etablissements.length}`)

    // 2. Convertir et enrichir chaque établissement
    const companies = []
    let withoutSite = 0
    let needingRefonte = 0

    for (const etab of etablissements) {
      const company = etablissementToCompany(etab)

      // 3. Chercher si l'entreprise a un site web
      const website = await findWebsiteForCompany(company.name, company.city)

      if (website) {
        company.website = website
        company.has_website = true

        // 4. Auditer le site (optionnel, peut être fait en batch plus tard)
        // Pour le scan initial, on fait juste une vérification rapide
        const checkResult = await checkWebsiteExists(website)
        
        if (checkResult.exists) {
          // Score par défaut pour les sites existants (sera affiné avec l'audit complet)
          company.prospect_score = checkResult.isHttps ? 50 : 65
          company.priority = getPriorityFromScore(company.prospect_score)
          
          // Compter comme "besoin refonte" si pas HTTPS
          if (!checkResult.isHttps) {
            needingRefonte++
          }
        }
      } else {
        // Pas de site = prospect idéal
        withoutSite++
      }

      companies.push(company)

      // Pause pour ne pas surcharger les APIs
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log(`✅ Scan terminé: ${companies.length} entreprises, ${withoutSite} sans site, ${needingRefonte} à refaire`)

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
    
    // Vérifier si c'est une erreur de credentials INSEE
    if (error instanceof Error && error.message.includes('INSEE credentials')) {
      return NextResponse.json(
        { 
          error: 'API INSEE non configurée',
          details: 'Ajoutez INSEE_CLIENT_ID et INSEE_CLIENT_SECRET dans .env.local'
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur lors du scan', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}

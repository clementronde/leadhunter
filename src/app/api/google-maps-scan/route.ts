import { NextRequest, NextResponse } from 'next/server'
import { searchAndEnrichGooglePlaces, googlePlaceToCompany } from '@/lib/google-maps'
import { analyzeWebsite, calculateProspectScoreFromAudit } from '@/lib/pagespeed'
import { getPriorityFromScore } from '@/lib/utils'

export const maxDuration = 60 // Timeout 60s pour Vercel

/**
 * POST /api/google-maps-scan
 * Lance un scan Google Maps pour trouver des entreprises d'une ville/zone
 *
 * Body attendu :
 * {
 *   query: string,        // Type d'entreprise (ex: "restaurants", "coiffeurs")
 *   location: string,     // Ville ou zone (ex: "Boulogne-Billancourt", "Paris 15")
 *   maxResults?: number,  // Nombre max de résultats (défaut: 20, max: 60)
 *   auditWebsites?: boolean // Lancer un audit PageSpeed sur les sites trouvés (défaut: false)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      query,
      location,
      maxResults = 20,
      auditWebsites = false,
    } = body

    if (!query || !query.trim()) {
      return NextResponse.json(
        { error: 'Le champ "query" est requis (ex: restaurants, coiffeurs...)' },
        { status: 400 }
      )
    }

    if (!location || !location.trim()) {
      return NextResponse.json(
        { error: 'Le champ "location" est requis (ex: Paris, Boulogne-Billancourt...)' },
        { status: 400 }
      )
    }

    // Vérifier la clé API
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return NextResponse.json(
        {
          error: 'GOOGLE_MAPS_API_KEY non configurée',
          details: 'Ajoutez votre clé API Google Maps dans .env.local',
        },
        { status: 500 }
      )
    }

    const limitedMax = Math.min(maxResults, 60) // Google Places limite à 60 résultats max

    console.log(
      `🗺️ Démarrage scan Google Maps: "${query}" à "${location}" (max ${limitedMax})`
    )

    // 1. Rechercher et enrichir les lieux via Google Places API
    const { places, total, withWebsite, withoutWebsite } =
      await searchAndEnrichGooglePlaces({
        query: query.trim(),
        location: location.trim(),
        maxResults: limitedMax,
      })

    console.log(
      `📊 ${total} lieux trouvés: ${withWebsite} avec site, ${withoutWebsite} sans site`
    )

    // 2. Convertir en format Company et optionnellement auditer les sites
    const companies = []
    let needingRefonte = 0
    let auditedCount = 0

    for (const place of places) {
      const company = googlePlaceToCompany(place)

      // 3. Audit PageSpeed si demandé et si le site existe
      if (auditWebsites && place.website) {
        try {
          console.log(`🔍 Audit ${place.website}...`)
          const auditResult = await analyzeWebsite(place.website)

          if (auditResult.success && auditResult.data) {
            const prospectScore = calculateProspectScoreFromAudit(auditResult.data)
            company.prospect_score = prospectScore
            company.priority = getPriorityFromScore(prospectScore)

            // Détecter les sites "datés ou peu performants"
            const isUnderperforming =
              (auditResult.data.performance_score !== null &&
                auditResult.data.performance_score !== undefined &&
                auditResult.data.performance_score < 50) ||
              !auditResult.data.is_https ||
              !auditResult.data.is_mobile_friendly ||
              auditResult.data.is_outdated

            if (isUnderperforming) {
              needingRefonte++
            }

            auditedCount++
          }
        } catch (auditErr) {
          console.warn(`Audit échoué pour ${place.website}:`, auditErr)
          // On continue même si l'audit échoue
        }

        // Pause entre les audits pour ne pas surcharger
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      companies.push({
        ...company,
        // Métadonnées Google Maps supplémentaires
        google_place_id: place.place_id,
        google_maps_url: place.google_maps_url,
        rating: place.rating,
      })
    }

    console.log(
      `✅ Scan Google Maps terminé: ${companies.length} entreprises, ${withoutWebsite} sans site, ${needingRefonte} à refaire`
    )

    return NextResponse.json({
      success: true,
      data: {
        total_found: total,
        processed: companies.length,
        without_site: withoutWebsite,
        with_site: withWebsite,
        needing_refonte: needingRefonte,
        audited: auditedCount,
        companies,
      },
    })
  } catch (error) {
    console.error('Google Maps scan error:', error)

    if (error instanceof Error) {
      if (error.message.includes('GOOGLE_MAPS_API_KEY')) {
        return NextResponse.json(
          {
            error: 'Clé API Google Maps manquante',
            details: error.message,
          },
          { status: 500 }
        )
      }

      if (error.message.includes('REQUEST_DENIED') || error.message.includes('invalide')) {
        return NextResponse.json(
          {
            error: 'Clé API Google Maps invalide ou non autorisée',
            details:
              'Vérifiez que votre clé API a bien accès à "Places API" dans Google Cloud Console',
          },
          { status: 403 }
        )
      }

      if (error.message.includes('OVER_QUERY_LIMIT')) {
        return NextResponse.json(
          {
            error: 'Quota Google Places API dépassé',
            details: 'Vérifiez votre facturation Google Cloud ou attendez la remise à zéro du quota',
          },
          { status: 429 }
        )
      }
    }

    return NextResponse.json(
      {
        error: 'Erreur lors du scan Google Maps',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    )
  }
}

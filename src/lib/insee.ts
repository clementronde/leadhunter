/**
 * Service d'intégration avec l'API Sirene de l'INSEE v3.11
 * Documentation : https://portail-api.insee.fr/
 *
 * Authentification : clé d'intégration (en-tête X-INSEE-Api-Key-Integration).
 * L'ancienne passerelle (api.insee.fr/entreprises/sirene/V3.11 + Bearer) a été remplacée en 2024 ;
 * INSEE_API_BASE permet de surcharger l'URL si l'INSEE la change à nouveau.
 */

import { getPriorityFromScore, scoreProspect } from './utils'

const SIRENE_API_BASE = (process.env.INSEE_API_BASE || 'https://api.insee.fr/api-sirene/3.11').replace(/\/$/, '')
const UNVERIFIED_SCORE = scoreProspect({ hasWebsite: false, webPresence: 'unknown' }).score

interface SireneEtablissement {
  siren: string
  siret: string
  denominationUniteLegale: string
  denominationUsuelleEtablissement: string | null
  enseigne1Etablissement: string | null
  activitePrincipaleEtablissement: string // Code NAF
  trancheEffectifsEtablissement: string | null
  adresseEtablissement: {
    numeroVoieEtablissement: string | null
    typeVoieEtablissement: string | null
    libelleVoieEtablissement: string | null
    codePostalEtablissement: string
    libelleCommuneEtablissement: string
    codeCommuneEtablissement: string
  }
  periodesEtablissement: Array<{
    etatAdministratifEtablissement: string // 'A' = Actif, 'F' = Fermé
  }>
}

interface SireneSearchResponse {
  header: {
    total: number
    debut: number
    nombre: number
  }
  etablissements: SireneEtablissement[]
}

/**
 * Obtient les headers d'authentification pour l'API INSEE
 * Utilise la clé API simple avec Bearer token
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const apiKey = process.env.INSEE_API_KEY
  
  if (!apiKey) {
    throw new Error('INSEE_API_KEY non configurée. Ajoutez-la dans .env.local')
  }

  return {
    // Portail API INSEE (depuis 2024) : clé passée dans cet en-tête
    'X-INSEE-Api-Key-Integration': apiKey,
    'Accept': 'application/json',
  }
}

/**
 * Recherche des établissements par ville et/ou activité
 */
export async function searchEtablissements(params: {
  codePostal?: string
  commune?: string
  activite?: string // Code NAF ou mot-clé
  nombreResultats?: number
  debut?: number
}): Promise<{ total: number; etablissements: SireneEtablissement[] }> {
  const headers = await getAuthHeaders()

  // Construire la requête
  const criteres: string[] = []
  
  // Seulement les établissements actifs
  criteres.push('periode(etatAdministratifEtablissement:A)')

  if (params.codePostal) {
    criteres.push(`codePostalEtablissement:${params.codePostal}`)
  }

  if (params.commune) {
    // Recherche par nom de commune (majuscules pour l'API)
    const communeUpper = params.commune.toUpperCase()
    criteres.push(`libelleCommuneEtablissement:"${communeUpper}"`)
  }

  if (params.activite) {
    // Recherche par code NAF ou dans la dénomination
    if (/^\d{2}\.\d{2}[A-Z]?$/.test(params.activite)) {
      criteres.push(`activitePrincipaleEtablissement:${params.activite.replace('.', '')}`)
    } else {
      // Recherche textuelle dans le nom
      const activiteUpper = params.activite.toUpperCase()
      criteres.push(`denominationUniteLegale:"*${activiteUpper}*"`)
    }
  }

  const query = criteres.join(' AND ')
  const nombre = params.nombreResultats || 100
  const debut = params.debut || 0

  console.log(`🔍 INSEE Query: ${query}`)

  const url = new URL(`${SIRENE_API_BASE}/siret`)
  url.searchParams.set('q', query)
  url.searchParams.set('nombre', nombre.toString())
  url.searchParams.set('debut', debut.toString())

  const response = await fetch(url.toString(), { headers })

  if (!response.ok) {
    if (response.status === 404) {
      return { total: 0, etablissements: [] }
    }
    if (response.status === 401) {
      throw new Error('Clé API INSEE invalide ou expirée')
    }
    const error = await response.text()
    console.error('INSEE API error:', response.status, error)
    throw new Error(`INSEE API error: ${response.status}`)
  }

  const data: SireneSearchResponse = await response.json()

  return {
    total: data.header.total,
    etablissements: data.etablissements || []
  }
}

/**
 * Récupère les détails d'un établissement par SIRET
 */
export async function getEtablissementBySiret(siret: string): Promise<SireneEtablissement | null> {
  const headers = await getAuthHeaders()

  const response = await fetch(`${SIRENE_API_BASE}/siret/${siret}`, {
    headers,
  })

  if (!response.ok) {
    if (response.status === 404) {
      return null
    }
    throw new Error(`INSEE API error: ${response.status}`)
  }

  const data = await response.json()
  return data.etablissement
}

/**
 * Mapping des codes NAF vers nos secteurs
 */
export function nafToSector(codeNaf: string): string | null {
  const nafMap: Record<string, string> = {
    // Restauration
    '5610A': 'restaurant', // Restauration traditionnelle
    '5610B': 'restaurant', // Cafétérias
    '5610C': 'restaurant', // Restauration rapide
    '5621Z': 'restaurant', // Traiteurs
    '5630Z': 'restaurant', // Débits de boissons
    
    // Commerce de détail
    '4711': 'retail', // Supermarchés
    '4719': 'retail', // Autres commerces
    '4721Z': 'retail', // Fruits et légumes
    '4722Z': 'retail', // Viandes
    '4723Z': 'retail', // Poissons
    '4724Z': 'retail', // Pain, pâtisserie
    '4725Z': 'retail', // Boissons
    '4726Z': 'retail', // Tabac
    '4729Z': 'retail', // Autres alimentaires
    '4771Z': 'retail', // Habillement
    '4772': 'retail', // Chaussures
    '4773Z': 'retail', // Pharmacies
    '4774Z': 'retail', // Articles médicaux
    '4775Z': 'retail', // Parfumerie
    '4776Z': 'retail', // Fleurs
    
    // Santé
    '8621Z': 'health', // Médecins généralistes
    '8622A': 'health', // Médecins spécialistes
    '8622B': 'health', // Activités chirurgie
    '8622C': 'health', // Psychiatrie
    '8623Z': 'health', // Dentistes
    '8690A': 'health', // Ambulances
    '8690B': 'health', // Laboratoires
    '8690D': 'health', // Infirmiers
    '8690E': 'health', // Kinés
    '8690F': 'health', // Orthophonistes
    
    // Beauté
    '9602A': 'beauty', // Coiffure
    '9602B': 'beauty', // Soins de beauté
    '9604Z': 'beauty', // Entretien corporel
    
    // BTP
    '4110': 'construction', // Promotion immobilière
    '4120': 'construction', // Construction de bâtiments
    '4211Z': 'construction', // Routes
    '4221Z': 'construction', // Réseaux
    '4222Z': 'construction', // Électricité/télécom
    '4291Z': 'construction', // Ouvrages maritimes
    '4299Z': 'construction', // Autres travaux
    '4311Z': 'construction', // Démolition
    '4312': 'construction', // Terrassement
    '4313Z': 'construction', // Forages
    '4321A': 'construction', // Électricité
    '4322': 'construction', // Plomberie
    '4329': 'construction', // Autres installations
    '4331Z': 'construction', // Plâtrerie
    '4332': 'construction', // Menuiserie
    '4333Z': 'construction', // Revêtement sols
    '4334Z': 'construction', // Peinture
    '4339Z': 'construction', // Autres finitions
    '4391': 'construction', // Toiture
    '4399': 'construction', // Autres travaux spécialisés
    
    // Automobile
    '4511Z': 'automotive', // Commerce voitures
    '4519Z': 'automotive', // Autres véhicules
    '4520A': 'automotive', // Entretien auto
    '4520B': 'automotive', // Carrosserie
    '4531Z': 'automotive', // Commerce pièces
    '4532Z': 'automotive', // Commerce pièces
    '4540Z': 'automotive', // Commerce motos
    
    // Immobilier
    '6810Z': 'real_estate', // Marchands de biens
    '6820A': 'real_estate', // Location logements
    '6820B': 'real_estate', // Location terrains
    '6831Z': 'real_estate', // Agences immobilières
    '6832A': 'real_estate', // Administration immeubles
    
    // Services professionnels
    '6910Z': 'professional_services', // Avocats
    '6920Z': 'professional_services', // Comptables
    '7010Z': 'professional_services', // Sièges sociaux
    '7021Z': 'professional_services', // Conseil RP
    '7022Z': 'professional_services', // Conseil gestion
    '7111Z': 'professional_services', // Architectes
    '7112A': 'professional_services', // Géomètres
    '7112B': 'professional_services', // Ingénierie
    '7120A': 'professional_services', // Contrôle technique
    '7120B': 'professional_services', // Analyses techniques
    '7311Z': 'professional_services', // Agences de pub
    '7312Z': 'professional_services', // Régie publicitaire
    '7320Z': 'professional_services', // Études de marché
    '7410Z': 'professional_services', // Design
    '7420Z': 'professional_services', // Photographie
    '7430Z': 'professional_services', // Traduction
    '7490A': 'professional_services', // Conseil info
    '7490B': 'professional_services', // Autres conseils
    
    // Éducation
    '8510Z': 'education', // Enseignement primaire
    '8520Z': 'education', // Enseignement secondaire
    '8531Z': 'education', // Enseignement supérieur
    '8532Z': 'education', // Enseignement technique
    '8541Z': 'education', // Post-secondaire
    '8542Z': 'education', // Enseignement supérieur
    '8551Z': 'education', // Sport
    '8552Z': 'education', // Culturel
    '8553Z': 'education', // Auto-écoles
    '8559A': 'education', // Formation continue
    '8559B': 'education', // Autres enseignements
  }

  // Essayer le code exact, puis le préfixe
  const code4 = codeNaf.substring(0, 4)
  const code2 = codeNaf.substring(0, 2)

  return nafMap[codeNaf] || nafMap[code4] || nafMap[code2] || 'other'
}

/**
 * Convertit un établissement INSEE en format Company pour LeadHunter
 */
export function etablissementToCompany(etab: SireneEtablissement): {
  name: string
  address: string | null
  city: string
  postal_code: string
  siret: string
  sector: string | null
  source: 'sirene'
  website: string | null
  has_website: boolean
  web_presence: 'website' | 'unknown'
  prospect_score: number
  priority: 'hot' | 'warm' | 'cold'
  status: 'new'
} {
  const adresse = etab.adresseEtablissement
  const nom = etab.enseigne1Etablissement || 
              etab.denominationUsuelleEtablissement || 
              etab.denominationUniteLegale

  const addressParts = [
    adresse.numeroVoieEtablissement,
    adresse.typeVoieEtablissement,
    adresse.libelleVoieEtablissement
  ].filter(Boolean)

  return {
    name: nom,
    address: addressParts.join(' ') || null,
    city: adresse.libelleCommuneEtablissement,
    postal_code: adresse.codePostalEtablissement,
    siret: etab.siret,
    sector: nafToSector(etab.activitePrincipaleEtablissement),
    source: 'sirene' as const,
    website: null as string | null,
    has_website: false,
    web_presence: 'unknown' as 'website' | 'unknown',
    // Sirene ne sait rien du site web : score prudent tant que la présence web n'est pas vérifiée
    prospect_score: UNVERIFIED_SCORE,
    priority: getPriorityFromScore(UNVERIFIED_SCORE),
    status: 'new' as const,
  }
}

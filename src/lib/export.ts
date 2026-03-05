/**
 * Utilitaire d'export XLSX (Excel) pour les leads LeadHunter
 * Utilise la librairie SheetJS (xlsx)
 */

import { Company } from '@/types'
import { sectorLabels, statusLabels, priorityLabels } from '@/lib/utils'

/**
 * Formate la note Google en étoiles lisibles
 */
function formatRating(rating: number | null | undefined): string {
  if (rating === null || rating === undefined) return '-'
  return `${rating.toFixed(1)} / 5`
}

/**
 * Formate le site web : retourne l'URL ou "Pas de site web"
 */
function formatWebsite(website: string | null | undefined): string {
  if (!website) return 'Pas de site web'
  return website
}

/**
 * Construit les lignes de données pour l'export
 */
function buildRows(leads: Company[]) {
  return leads.map((lead) => ({
    'Nom de l\'établissement': lead.name,
    'Adresse': lead.address || '-',
    'Ville': lead.city,
    'Code Postal': lead.postal_code,
    'Téléphone': lead.phone || '-',
    'Site Web': formatWebsite(lead.website),
    'Note Google': formatRating(lead.google_rating),
    "Nombre d'avis": lead.google_reviews_count ?? '-',
    'Secteur': lead.sector ? sectorLabels[lead.sector].replace(/[^\w\s]/g, '').trim() : '-',
    'Score Prospect': lead.prospect_score,
    'Priorité': priorityLabels[lead.priority].replace(/[^\w\s]/g, '').trim(),
    'Statut CRM': statusLabels[lead.status],
    'Source': lead.source === 'google_places' ? 'Google Maps' : lead.source === 'sirene' ? 'INSEE Sirene' : lead.source,
    'Lien Google Maps': lead.google_maps_url || '-',
    'Date ajout': new Date(lead.created_at).toLocaleDateString('fr-FR'),
  }))
}

export const FREE_CSV_LIMIT = 10

/**
 * Exporte les leads vers un fichier CSV téléchargeable
 * Limité à FREE_CSV_LIMIT lignes pour les utilisateurs gratuits
 */
export function exportLeadsToCSV(
  leads: Company[],
  filename = 'leads-leadhunter',
  isPro = false
): { exported: number; total: number } {
  const toExport = isPro ? leads : leads.slice(0, FREE_CSV_LIMIT)
  const rows = buildRows(toExport)
  if (rows.length === 0) return { exported: 0, total: leads.length }

  const headers = Object.keys(rows[0])
  const csvLines = [
    headers.join(';'),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = String((row as Record<string, unknown>)[h] ?? '')
          return val.includes(';') || val.includes('"') || val.includes('\n')
            ? `"${val.replace(/"/g, '""')}"` : val
        })
        .join(';')
    ),
  ]

  const blob = new Blob(['\uFEFF' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)

  return { exported: toExport.length, total: leads.length }
}

/**
 * Exporte les leads vers un fichier XLSX téléchargeable
 * Utilise un import dynamique pour éviter les problèmes SSR
 */
export async function exportLeadsToXLSX(
  leads: Company[],
  filename = 'leads-leadhunter'
): Promise<void> {
  // Import dynamique (browser uniquement)
  const XLSX = await import('xlsx')

  const rows = buildRows(leads)

  // Créer la feuille depuis les données JSON
  const worksheet = XLSX.utils.json_to_sheet(rows)

  // Largeurs de colonnes adaptées au contenu
  worksheet['!cols'] = [
    { wch: 35 }, // Nom établissement
    { wch: 30 }, // Adresse
    { wch: 20 }, // Ville
    { wch: 12 }, // Code Postal
    { wch: 18 }, // Téléphone
    { wch: 35 }, // Site Web
    { wch: 12 }, // Note Google
    { wch: 14 }, // Nombre d'avis
    { wch: 20 }, // Secteur
    { wch: 14 }, // Score Prospect
    { wch: 12 }, // Priorité
    { wch: 15 }, // Statut CRM
    { wch: 12 }, // Source
    { wch: 40 }, // Lien Google Maps
    { wch: 14 }, // Date ajout
  ]

  // Créer le classeur
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads')

  // Feuille récapitulative
  const stats = [
    { Métrique: 'Total leads exportés', Valeur: leads.length },
    { Métrique: 'Sans site web', Valeur: leads.filter((l) => !l.has_website).length },
    { Métrique: 'Avec site web', Valeur: leads.filter((l) => l.has_website).length },
    { Métrique: 'Priorité Chaud 🔥', Valeur: leads.filter((l) => l.priority === 'hot').length },
    { Métrique: 'Priorité Tiède', Valeur: leads.filter((l) => l.priority === 'warm').length },
    { Métrique: 'Priorité Froid', Valeur: leads.filter((l) => l.priority === 'cold').length },
    { Métrique: 'Source Google Maps', Valeur: leads.filter((l) => l.source === 'google_places').length },
    { Métrique: 'Source INSEE', Valeur: leads.filter((l) => l.source === 'sirene').length },
    { Métrique: "Date d'export", Valeur: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) },
  ]

  const statsSheet = XLSX.utils.json_to_sheet(stats)
  statsSheet['!cols'] = [{ wch: 25 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(workbook, statsSheet, 'Récapitulatif')

  // Télécharger le fichier
  const dateStr = new Date().toISOString().split('T')[0]
  XLSX.writeFile(workbook, `${filename}-${dateStr}.xlsx`)
}

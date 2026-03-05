/**
 * Génération de rapport PDF d'audit pour LeadHunter
 * Utilise jsPDF (import dynamique côté client uniquement)
 */

import { Company } from '@/types'

function scoreLabel(score: number | null | undefined): string {
  if (score === null || score === undefined) return 'N/A'
  if (score >= 90) return 'Excellent'
  if (score >= 70) return 'Bon'
  if (score >= 50) return 'Moyen'
  return 'Faible'
}

function colorForScore(score: number | null | undefined): [number, number, number] {
  if (score === null || score === undefined) return [120, 120, 120]
  if (score >= 90) return [34, 197, 94]   // green
  if (score >= 70) return [251, 191, 36]  // amber
  if (score >= 50) return [249, 115, 22]  // orange
  return [239, 68, 68]                     // red
}

export async function generateAuditPDF(lead: Company): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const audit = lead.audit
  const W = 210
  const margin = 16
  let y = margin

  // ── Header bar ──────────────────────────────────────────────────────────────
  doc.setFillColor(251, 146, 60)
  doc.rect(0, 0, W, 22, 'F')

  doc.setFontSize(14)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text('LeadHunter — Rapport d\'audit', margin, 14)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }), W - margin, 14, { align: 'right' })

  y = 32

  // ── Entreprise ──────────────────────────────────────────────────────────────
  doc.setFontSize(18)
  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'bold')
  doc.text(lead.name, margin, y)
  y += 7

  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.setFont('helvetica', 'normal')
  const infos = [
    lead.address ? `${lead.address}, ${lead.city}` : lead.city,
    lead.phone || null,
    lead.website || null,
  ].filter(Boolean).join('  ·  ')
  doc.text(infos, margin, y)
  y += 10

  // ── Score global ─────────────────────────────────────────────────────────────
  if (audit) {
    const overallScore = audit.overall_score ?? 0
    const [r, g, b] = colorForScore(100 - overallScore) // overall_score = potential (bas = bon site)

    doc.setFillColor(245, 245, 245)
    doc.roundedRect(margin, y, W - margin * 2, 20, 3, 3, 'F')
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text('Score global du site', margin + 4, y + 8)
    doc.setFontSize(20)
    doc.setTextColor(r, g, b)
    doc.text(String(overallScore), W - margin - 4, y + 13, { align: 'right' })
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.setFont('helvetica', 'normal')
    doc.text('/ 100  (potentiel de refonte)', W - margin - 4 - 16, y + 13, { align: 'right' })
    y += 26

    // ── Lighthouse scores ────────────────────────────────────────────────────
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text('Scores Lighthouse', margin, y)
    y += 6

    const scores = [
      { label: 'Performance', value: audit.performance_score },
      { label: 'Accessibilité', value: audit.accessibility_score },
      { label: 'SEO', value: audit.seo_score },
      { label: 'Bonnes pratiques', value: audit.best_practices_score },
    ]

    const colW = (W - margin * 2) / 4
    scores.forEach((s, i) => {
      const x = margin + i * colW
      const [sr, sg, sb] = colorForScore(s.value)
      doc.setFillColor(245, 245, 245)
      doc.roundedRect(x, y, colW - 3, 22, 2, 2, 'F')
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.setFont('helvetica', 'normal')
      doc.text(s.label, x + (colW - 3) / 2, y + 7, { align: 'center' })
      doc.setFontSize(16)
      doc.setTextColor(sr, sg, sb)
      doc.setFont('helvetica', 'bold')
      doc.text(s.value !== null && s.value !== undefined ? String(s.value) : '—', x + (colW - 3) / 2, y + 17, { align: 'center' })
    })
    y += 28

    // ── Infos techniques ────────────────────────────────────────────────────
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text('Informations techniques', margin, y)
    y += 6

    const techItems = [
      ['HTTPS', audit.is_https ? '✓ Actif' : '✗ Non sécurisé'],
      ['Mobile', audit.is_mobile_friendly ? '✓ Compatible' : '✗ Non optimisé'],
      ['Temps de chargement', audit.load_time_ms ? `${(audit.load_time_ms / 1000).toFixed(1)}s` : '—'],
      ['CMS', audit.cms || '—'],
      ['Framework', audit.framework || '—'],
      ['Technologie obsolète', audit.is_outdated ? '⚠ Oui' : '✓ Non'],
    ]

    techItems.forEach(([label, value]) => {
      doc.setFillColor(252, 252, 252)
      doc.rect(margin, y, W - margin * 2, 7, 'F')
      doc.setFontSize(9)
      doc.setTextColor(80, 80, 80)
      doc.setFont('helvetica', 'normal')
      doc.text(label, margin + 2, y + 5)
      doc.setTextColor(30, 30, 30)
      doc.setFont('helvetica', 'bold')
      doc.text(value, W - margin - 2, y + 5, { align: 'right' })
      y += 8
    })
    y += 4

    // ── Problèmes détectés ──────────────────────────────────────────────────
    if (audit.issues && audit.issues.length > 0) {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 30, 30)
      doc.text('Problèmes détectés', margin, y)
      y += 6

      audit.issues.slice(0, 8).forEach((issue) => {
        const [ir, ig, ib] = issue.severity === 'critical' ? [239, 68, 68] : issue.severity === 'warning' ? [249, 115, 22] : [59, 130, 246]
        doc.setFillColor(ir, ig, ib)
        doc.circle(margin + 2, y + 2, 1.5, 'F')

        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 30, 30)
        const titleLines = doc.splitTextToSize(issue.title, W - margin * 2 - 8)
        doc.text(titleLines, margin + 6, y + 3)
        y += titleLines.length * 4 + 1

        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 100)
        const recLines = doc.splitTextToSize(`→ ${issue.recommendation}`, W - margin * 2 - 8)
        doc.text(recLines, margin + 6, y)
        y += recLines.length * 4 + 3

        if (y > 265) {
          doc.addPage()
          y = margin
        }
      })
    }
  } else {
    doc.setFontSize(11)
    doc.setTextColor(150, 150, 150)
    doc.text('Aucun audit disponible pour ce lead.', margin, y)
    doc.text('Lancez un audit depuis la fiche lead pour générer un rapport complet.', margin, y + 6)
    y += 20
  }

  // ── Footer ──────────────────────────────────────────────────────────────────
  doc.setFillColor(245, 245, 245)
  doc.rect(0, 282, W, 15, 'F')
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.setFont('helvetica', 'normal')
  doc.text('Généré par LeadHunter · leadhunter.app', margin, 290)
  doc.text('Confidentiel — Usage interne uniquement', W - margin, 290, { align: 'right' })

  // ── Save ────────────────────────────────────────────────────────────────────
  const safeName = lead.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()
  doc.save(`audit-${safeName}-${new Date().toISOString().split('T')[0]}.pdf`)
}

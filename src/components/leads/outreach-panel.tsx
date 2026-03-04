'use client'

import { useState } from 'react'
import { Mail, CheckCircle } from 'lucide-react'
import { Company, LeadStatus, CreateNoteInput } from '@/types'

interface OutreachPanelProps {
  lead: Company
  onStatusChange: (status: LeadStatus) => void
  onNoteAdded: (input: CreateNoteInput) => void
  compact?: boolean
}

interface EmailTemplate {
  id: string
  label: string
  subject: (name: string) => string
  body: (name: string, website?: string | null) => string
}

const TEMPLATES: EmailTemplate[] = [
  {
    id: 'sans-site',
    label: 'Sans site web',
    subject: (name) => `Création de site web pour ${name}`,
    body: (name) =>
      `Bonjour,

Je me permets de vous contacter au sujet de ${name}.

J'ai remarqué que votre établissement n'a pas encore de site internet. Aujourd'hui, une présence en ligne est indispensable pour attirer de nouveaux clients et renforcer votre crédibilité.

Je serais ravi(e) de vous proposer une solution clé en main, adaptée à votre activité et à votre budget.

Seriez-vous disponible pour un échange rapide cette semaine ?

Cordialement`,
  },
  {
    id: 'refonte',
    label: 'Refonte de site',
    subject: (name) => `Modernisation de votre site web — ${name}`,
    body: (name, website) =>
      `Bonjour,

Je me permets de vous contacter au sujet de votre site internet${website ? ` (${website.replace(/^https?:\/\//, '')})` : ''}.

Après analyse, j'ai identifié plusieurs points d'amélioration qui pourraient significativement augmenter votre visibilité et votre taux de conversion : performances, compatibilité mobile, et SEO.

Je serais heureux(se) de vous présenter nos solutions de refonte, adaptées aux dernières attentes des moteurs de recherche.

Êtes-vous disponible pour un appel de 15 minutes cette semaine ?

Cordialement`,
  },
  {
    id: 'generique',
    label: 'Contact général',
    subject: (name) => `Proposition de collaboration — ${name}`,
    body: (name) =>
      `Bonjour,

Je me permets de vous contacter concernant ${name}.

Dans le cadre de mon activité de création et refonte de sites web, je travaille avec de nombreuses entreprises locales pour améliorer leur présence digitale.

Je serais ravi(e) d'échanger avec vous sur vos besoins et de voir comment je pourrais vous accompagner.

N'hésitez pas à me répondre ou à me rappeler.

Cordialement`,
  },
]

export function OutreachPanel({ lead, onStatusChange, onNoteAdded, compact }: OutreachPanelProps) {
  const defaultTemplate = lead.has_website ? 'refonte' : 'sans-site'
  const [selectedTemplate, setSelectedTemplate] = useState(defaultTemplate)
  const [noteText, setNoteText] = useState('')
  const [markingContacted, setMarkingContacted] = useState(false)
  const [contacted, setContacted] = useState(false)

  const template = TEMPLATES.find((t) => t.id === selectedTemplate) ?? TEMPLATES[0]
  const subject = template.subject(lead.name)
  const body = template.body(lead.name, lead.website)

  const mailtoHref = `mailto:${lead.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

  const handleMarkContacted = async () => {
    setMarkingContacted(true)
    try {
      onStatusChange('contacted')
      if (noteText.trim()) {
        await onNoteAdded({ company_id: lead.id, content: noteText.trim() })
      }
      setContacted(true)
    } finally {
      setMarkingContacted(false)
    }
  }

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {/* Template selector */}
      <div>
        {!compact && <p className="text-sm font-medium text-zinc-400 mb-2">Modèle d'email</p>}
        <div className="flex gap-2 flex-wrap">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTemplate(t.id)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors border ${
                selectedTemplate === t.id
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-zinc-800/60 text-zinc-400 border-white/[0.08] hover:border-amber-500/40 hover:text-zinc-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div>
        {!compact && <p className="text-xs font-medium text-zinc-500 mb-1">Aperçu</p>}
        <div className="text-xs text-zinc-500 mb-1">
          <span className="font-medium">Objet :</span> {subject}
        </div>
        <textarea
          readOnly
          value={body}
          rows={compact ? 5 : 7}
          className="w-full text-xs text-zinc-300 bg-zinc-800/60 border border-white/[0.08] rounded-lg p-3 resize-none font-mono leading-relaxed"
        />
      </div>

      {/* Open in mail client */}
      {lead.email ? (
        <a
          href={mailtoHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Mail className="h-4 w-4" />
          Ouvrir dans ma messagerie
        </a>
      ) : (
        <div className="text-xs text-zinc-500 bg-zinc-800/40 border border-white/[0.08] rounded-lg p-3">
          Pas d'email connu — copiez le texte pour un envoi manuel.
        </div>
      )}

      {/* After sending */}
      <div className="border-t border-white/[0.06] pt-3">
        <p className="text-xs font-medium text-zinc-500 mb-2">Après l'envoi</p>

        <textarea
          placeholder="Note optionnelle (ex: laissé un message vocal, relance prévue...)"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          rows={2}
          className="w-full text-sm text-zinc-300 bg-zinc-800/60 border border-white/[0.08] rounded-lg p-2.5 resize-none mb-3 placeholder:text-zinc-600"
        />

        {contacted ? (
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
            <CheckCircle className="h-4 w-4" />
            Statut mis à jour
          </div>
        ) : (
          <button
            onClick={handleMarkContacted}
            disabled={markingContacted}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-60"
          >
            {markingContacted ? (
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Marquer comme contacté
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Relances automatiques : chaque relance a son propre message (et non le même email
 * renvoyé avec "Relance -" devant). Séquence classique : petit rappel + rapport d'audit,
 * puis message de clôture qui laisse la porte ouverte.
 */

interface FollowupContext {
  originalSubject: string
  companyName: string
  hasWebsite: boolean
  auditUrl: string | null
  signature: string
}

export function buildSignature(settings?: {
  signature?: string | null
  sender_name?: string | null
  agency_name?: string | null
  agency_website?: string | null
  agency_phone?: string | null
} | null): string {
  return settings?.signature?.trim()
    || [settings?.sender_name, settings?.agency_name, settings?.agency_website, settings?.agency_phone]
      .filter(Boolean)
      .join('\n')
}

export function buildAuditUrl(origin: string, shareToken: string | null | undefined): string | null {
  if (!shareToken) return null
  return `${origin.replace(/\/$/, '')}/audit/${shareToken}`
}

export function buildFollowup(stepIndex: number, totalSteps: number, ctx: FollowupContext): {
  subject: string
  body: string
} {
  const subject = ctx.originalSubject.toLowerCase().startsWith('re:')
    ? ctx.originalSubject
    : `Re: ${ctx.originalSubject}`
  const signature = ctx.signature ? `\n\n${ctx.signature}` : ''
  const isLast = stepIndex === totalSteps - 1 && totalSteps > 1

  if (isLast) {
    return {
      subject,
      body: `Bonjour,

Je ne veux pas encombrer votre boîte mail, ce sera donc mon dernier message.

Si un projet de site pour ${ctx.companyName} se présente dans les prochains mois, il vous suffit de répondre à cet email : je reviendrai vers vous avec plaisir.

Belle continuation,${signature}`,
    }
  }

  if (ctx.hasWebsite && ctx.auditUrl) {
    return {
      subject,
      body: `Bonjour,

Je me permets de revenir vers vous : j'ai préparé un court rapport sur le site de ${ctx.companyName} (vitesse, affichage mobile, référencement).

Vous pouvez le consulter ici, sans engagement : ${ctx.auditUrl}

Si vous le souhaitez, je peux vous expliquer en 15 minutes par téléphone les 2 ou 3 points qui auraient le plus d'impact.

Bonne journée,${signature}`,
    }
  }

  return {
    subject,
    body: `Bonjour,

Je me permets de revenir vers vous au sujet de mon précédent message concernant ${ctx.companyName}.

${ctx.hasWebsite
      ? 'Quelques ajustements sur votre site pourraient vous apporter davantage de demandes de clients.'
      : 'Aujourd\'hui, la plupart de vos futurs clients vous cherchent sur Google avant d\'appeler : un site simple et rassurant peut faire la différence.'}

Seriez-vous disponible 15 minutes cette semaine pour en parler ? Une simple réponse avec un créneau me suffit.

Bonne journée,${signature}`,
  }
}

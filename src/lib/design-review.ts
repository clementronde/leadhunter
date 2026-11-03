/**
 * Note "design daté" d'un site à partir de sa capture d'écran, par Claude
 * Nécessite : ANTHROPIC_API_KEY dans .env.local (sinon l'étape est ignorée)
 */

import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { supabaseAdmin } from './supabase-admin'

const SCREENSHOT_BUCKET = 'screenshots'

const DesignReviewSchema = z.object({
  // 1 = moderne et soigné, 10 = très daté / amateur
  dated_score: z.number().int().min(1).max(10),
  verdict: z.string(),
  reasons: z.array(z.string()),
})

export type DesignReview = z.infer<typeof DesignReviewSchema>

const PROMPT = `Tu es directeur artistique dans une agence web française qui refait les sites de TPE/PME.
Voici la capture d'écran mobile de la page d'accueil de "{name}" ({url}).

Note de 1 à 10 à quel point ce design paraît daté ou amateur :
1-3 = moderne, soigné, crédible aujourd'hui
4-6 = correct mais vieillissant
7-10 = clairement daté (look années 2010, typographies système, mise en page en tableaux, images pixelisées, carrousels, couleurs criardes, texte illisible sur mobile...)

Juge uniquement ce qui est visible. "verdict" : une phrase courte en français, utilisable dans un email de prospection.
"reasons" : 2 à 4 constats visuels précis et concrets, en français.`

let client: Anthropic | null = null

/** Extrait le JPEG base64 d'une data URI PageSpeed ("data:image/jpeg;base64,...") */
function parseDataUri(dataUri: string): { mediaType: 'image/jpeg' | 'image/png' | 'image/webp'; data: string } | null {
  const match = dataUri.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/)
  if (!match) return null
  return { mediaType: match[1] as 'image/jpeg' | 'image/png' | 'image/webp', data: match[2] }
}

export async function reviewDesign(params: {
  screenshot: string
  url: string
  companyName?: string | null
}): Promise<DesignReview | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null
  const image = parseDataUri(params.screenshot)
  if (!image) return null

  client ??= new Anthropic()

  // Haiku : tâche simple et répétée à chaque audit, ~40x moins cher qu'Opus
  const response = await client.messages.parse({
    model: 'claude-haiku-5-5',
    max_tokens: 2000,
    output_config: {
      effort: 'low',
      format: zodOutputFormat(DesignReviewSchema),
    },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } },
          {
            type: 'text',
            text: PROMPT.replace('{name}', params.companyName || 'cette entreprise').replace('{url}', params.url),
          },
        ],
      },
    ],
  })

  if (response.stop_reason === 'refusal') return null
  return response.parsed_output ?? null
}

/** Enregistre la capture dans Supabase Storage et renvoie son URL publique */
export async function uploadScreenshot(params: {
  screenshot: string
  userId: string
  companyId: string
}): Promise<string | null> {
  const image = parseDataUri(params.screenshot)
  if (!image) return null

  const extension = image.mediaType.split('/')[1]
  const path = `${params.userId}/${params.companyId}.${extension}`
  const { error } = await supabaseAdmin.storage
    .from(SCREENSHOT_BUCKET)
    .upload(path, Buffer.from(image.data, 'base64'), { contentType: image.mediaType, upsert: true })
  if (error) {
    console.warn('Upload capture échoué:', error.message)
    return null
  }

  const { data } = supabaseAdmin.storage.from(SCREENSHOT_BUCKET).getPublicUrl(path)
  // Paramètre de version : la capture est écrasée à chaque nouvel audit
  return `${data.publicUrl}?v=${Date.now()}`
}

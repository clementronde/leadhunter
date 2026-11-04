import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/server-auth'
import { rateLimit } from '@/lib/rate-limit'
import { draftOutreachEmail } from '@/lib/ai-outreach'
import { buildSignature } from '@/lib/followups'
import { pickAudit, sectorLabels } from '@/lib/utils'
import type { Sector } from '@/types'

export const maxDuration = 60

/** Rédige un email de prospection personnalisé à partir de la fiche Google Maps et de l'audit du lead */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, response } = await requireUser()
  if (response || !user) return response

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const channel: 'email' | 'short' = body?.channel === 'short' ? 'short' : 'email'

  // 40/min : laisse passer la rédaction groupée d'une campagne IA (3 en parallèle)
  const rl = rateLimit(`draft-message:${user.id}`, { windowMs: 60_000, max: 40 })
  if (!rl.success) {
    return NextResponse.json({ error: 'Trop de demandes, réessayez dans une minute' }, { status: 429 })
  }

  const { data: profile } = await supabase.from('profiles').select('plan, role').eq('id', user.id).single()
  if (profile?.plan !== 'pro' && profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Rédaction par IA réservée au plan Pro' }, { status: 403 })
  }

  const [{ data: company }, { data: settings }] = await Promise.all([
    supabase
      .from('companies')
      .select('*, website_audits(*)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single(),
    supabase.from('outreach_settings').select('*').eq('user_id', user.id).maybeSingle(),
  ])
  if (!company) return NextResponse.json({ error: 'Lead introuvable' }, { status: 404 })

  const audit = pickAudit(company.website_audits)

  try {
    const draft = await draftOutreachEmail({
      company: {
        ...company,
        sector: company.sector ? sectorLabels[company.sector as Sector] ?? company.sector : null,
      },
      audit,
      sender: {
        name: settings?.sender_name,
        agency: settings?.agency_name,
        signature: buildSignature(settings),
      },
    }, channel)
    return NextResponse.json(draft)
  } catch (error) {
    console.error('Rédaction IA échouée:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Impossible de rédiger le message pour le moment' }, { status: 502 })
  }
}

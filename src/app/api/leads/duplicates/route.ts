import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/server-auth'

const mergeSchema = z.object({
  keepId: z.string().min(1),
  mergeIds: z.array(z.string().min(1)).min(1).max(20),
})

type DuplicateLead = {
  id: string
  name: string
  city: string | null
  phone: string | null
  email: string | null
  website: string | null
  google_place_id: string | null
  status: string
  prospect_score: number
  created_at: string
}

function normalizeText(value: string | null | undefined) {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function normalizePhone(value: string | null | undefined) {
  const digits = (value ?? '').replace(/\D/g, '')
  return digits.length >= 8 ? digits : ''
}

function addGroup(map: Map<string, DuplicateLead[]>, key: string, lead: DuplicateLead) {
  if (!key) return
  const list = map.get(key) ?? []
  list.push(lead)
  map.set(key, list)
}

export async function GET() {
  const { supabase, user, response } = await requireUser()
  if (response || !user) return response

  const { data, error } = await supabase
    .from('companies')
    .select('id, name, city, phone, email, website, google_place_id, status, prospect_score, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1000)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const candidates = new Map<string, DuplicateLead[]>()
  for (const lead of (data ?? []) as DuplicateLead[]) {
    addGroup(candidates, `place:${lead.google_place_id ?? ''}`, lead)
    addGroup(candidates, `phone:${normalizePhone(lead.phone)}`, lead)
    addGroup(candidates, `email:${normalizeText(lead.email)}`, lead)
    addGroup(candidates, `name-city:${normalizeText(lead.name)}:${normalizeText(lead.city)}`, lead)
  }

  const seen = new Set<string>()
  const groups = Array.from(candidates.values())
    .filter((group) => group.length > 1)
    .map((group) => {
      const unique = Array.from(new Map(group.map((lead) => [lead.id, lead])).values())
      return unique.sort((a, b) => b.prospect_score - a.prospect_score)
    })
    .filter((group) => group.length > 1)
    .filter((group) => {
      const signature = group.map((lead) => lead.id).sort().join(':')
      if (seen.has(signature)) return false
      seen.add(signature)
      return true
    })
    .slice(0, 50)

  return NextResponse.json({ groups })
}

export async function PATCH(request: Request) {
  const { supabase, user, response } = await requireUser()
  if (response || !user) return response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = mergeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const keepId = parsed.data.keepId
  const mergeIds = parsed.data.mergeIds.filter((id) => id !== keepId)

  const { data: leads, error: leadsError } = await supabase
    .from('companies')
    .select('id, name, email, phone, website, google_place_id')
    .eq('user_id', user.id)
    .in('id', [keepId, ...mergeIds])

  if (leadsError) return NextResponse.json({ error: leadsError.message }, { status: 500 })
  if ((leads ?? []).length !== mergeIds.length + 1) {
    return NextResponse.json({ error: 'Un ou plusieurs leads sont introuvables' }, { status: 404 })
  }

  const { data: audits } = await supabase
    .from('website_audits')
    .select('id, company_id, overall_score, audited_at')
    .in('company_id', [keepId, ...mergeIds])
    .order('audited_at', { ascending: false })

  const keepAudit = audits?.find((audit) => audit.company_id === keepId)
  const duplicateAudits = audits?.filter((audit) => mergeIds.includes(audit.company_id)) ?? []

  if (!keepAudit && duplicateAudits.length > 0) {
    const [bestAudit, ...oldAudits] = duplicateAudits
    await supabase.from('website_audits').update({ company_id: keepId }).eq('id', bestAudit.id)
    if (oldAudits.length > 0) {
      await supabase.from('website_audits').delete().in('id', oldAudits.map((audit) => audit.id))
    }
  } else if (duplicateAudits.length > 0) {
    await supabase.from('website_audits').delete().in('id', duplicateAudits.map((audit) => audit.id))
  }

  await Promise.all([
    supabase.from('notes').update({ company_id: keepId }).in('company_id', mergeIds),
    supabase.from('email_messages').update({ company_id: keepId }).in('company_id', mergeIds),
    supabase.from('audit_jobs').update({ company_id: keepId }).in('company_id', mergeIds),
  ])

  const { error: deleteError } = await supabase
    .from('companies')
    .delete()
    .eq('user_id', user.id)
    .in('id', mergeIds)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  await supabase.from('notes').insert({
    user_id: user.id,
    company_id: keepId,
    content: `${mergeIds.length} doublon${mergeIds.length > 1 ? 's' : ''} fusionné${mergeIds.length > 1 ? 's' : ''} dans cette fiche.`,
  })

  return NextResponse.json({ merged: mergeIds.length, keepId })
}

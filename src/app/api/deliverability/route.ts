import { NextResponse } from 'next/server'
import { promises as dns } from 'dns'
import { requireUser } from '@/lib/server-auth'

export async function GET() {
  const { supabase, user, response } = await requireUser()
  if (response || !user) return response

  const { data: settings } = await supabase
    .from('outreach_settings')
    .select('sender_email, agency_website')
    .eq('user_id', user.id)
    .maybeSingle()

  const domain = domainFromEmail(settings?.sender_email) || domainFromUrl(settings?.agency_website)
  if (!domain) {
    return NextResponse.json({ error: 'Aucun domaine à vérifier' }, { status: 400 })
  }

  const [txtRecords, mxRecords] = await Promise.all([
    dns.resolveTxt(domain).catch(() => [] as string[][]),
    dns.resolveMx(domain).catch(() => []),
  ])

  const flatTxt = txtRecords.map((record) => record.join(''))
  const spf = flatTxt.some((record) => record.toLowerCase().startsWith('v=spf1'))
  const dmarcRecords = await dns.resolveTxt(`_dmarc.${domain}`).catch(() => [] as string[][])
  const dmarc = dmarcRecords.map((record) => record.join('')).some((record) => record.toLowerCase().startsWith('v=dmarc1'))
  const resendDkim = flatTxt.some((record) => record.toLowerCase().includes('resend'))

  return NextResponse.json({
    domain,
    checks: {
      mx: mxRecords.length > 0,
      spf,
      dmarc,
      resend_hint: resendDkim,
    },
  })
}

function domainFromEmail(email?: string | null): string | null {
  const domain = email?.split('@')[1]?.trim().toLowerCase()
  return domain || null
}

function domainFromUrl(url?: string | null): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

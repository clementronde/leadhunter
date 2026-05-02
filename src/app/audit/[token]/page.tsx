import type { ReactNode } from 'react'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getLighthouseColor } from '@/lib/utils'
import { AlertTriangle, CheckCircle, Globe, Gauge, Shield, Smartphone } from 'lucide-react'

export default async function PublicAuditPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { data: lead } = await supabaseAdmin
    .from('companies')
    .select('name, city, website, prospect_score, audit_share_token, website_audits(*)')
    .eq('audit_share_token', token)
    .maybeSingle()

  if (!lead) {
    return (
      <main className="min-h-screen bg-[#09090b] px-6 py-16 text-white">
        <div className="mx-auto max-w-2xl rounded-xl border border-white/[0.08] bg-zinc-900 p-8 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-amber-400" />
          <h1 className="text-2xl font-bold">Rapport introuvable</h1>
        </div>
      </main>
    )
  }

  const audit = lead.website_audits?.[0]

  return (
    <main className="min-h-screen bg-[#09090b] px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-3">
          <p className="text-sm font-medium text-amber-400">Rapport d&apos;audit web</p>
          <h1 className="text-4xl font-bold">{lead.name}</h1>
          <p className="text-zinc-400">{lead.city}{lead.website ? ` · ${lead.website}` : ''}</p>
        </header>

        {!audit ? (
          <section className="rounded-xl border border-white/[0.08] bg-zinc-900 p-8">
            <p className="text-zinc-400">Aucun audit détaillé n&apos;est encore disponible pour ce site.</p>
          </section>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <Score label="Performance" value={audit.performance_score} icon={<Gauge className="h-5 w-5" />} />
              <Score label="SEO" value={audit.seo_score} icon={<Globe className="h-5 w-5" />} />
              <Score label="Sécurité" value={audit.is_https ? 100 : 0} icon={<Shield className="h-5 w-5" />} />
              <Score label="Mobile" value={audit.is_mobile_friendly ? 100 : 0} icon={<Smartphone className="h-5 w-5" />} />
            </section>

            <section className="rounded-xl border border-white/[0.08] bg-zinc-900 p-6">
              <h2 className="mb-4 text-xl font-semibold">Points à améliorer</h2>
              <div className="space-y-3">
                {(audit.issues ?? []).length === 0 ? (
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle className="h-5 w-5" />
                    Aucun problème critique détecté.
                  </div>
                ) : (
                  audit.issues.map((issue: { title: string; message: string; recommendation: string }, index: number) => (
                    <div key={index} className="rounded-lg border border-white/[0.06] bg-zinc-950 p-4">
                      <p className="font-medium text-white">{issue.title}</p>
                      <p className="mt-1 text-sm text-zinc-400">{issue.message}</p>
                      <p className="mt-2 text-sm text-amber-300">{issue.recommendation}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}

function Score({ label, value, icon }: { label: string; value: number | null; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-zinc-900 p-5">
      <div className="mb-3 text-zinc-500">{icon}</div>
      <p className={`text-3xl font-bold ${getLighthouseColor(value)}`}>{value ?? '—'}</p>
      <p className="text-sm text-zinc-500">{label}</p>
    </div>
  )
}

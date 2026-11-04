'use client'

import { useState } from 'react'
import { Check, Copy, Loader2, Mail, MessageCircle, Sparkles } from 'lucide-react'
import { Header } from '@/components/layout'
import { Button, Card, UpgradeModal } from '@/components/ui'
import { usePlan } from '@/hooks/usePlan'
import { COLD_EMAIL_RULES, SEND_TIMING_TIP } from '@/lib/cold-email-playbook'

interface Variant {
  angle: string
  subject: string
  body: string
  why: string
}

const EMPTY_FORM = {
  companyName: '',
  activity: '',
  city: '',
  contactName: '',
  website: '',
  googleRating: '',
  observations: '',
  offer: '',
}

type FormKey = keyof typeof EMPTY_FORM

const inputClass =
  'w-full rounded-lg border border-white/[0.08] bg-zinc-800/60 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500'

export default function ComposePage() {
  const { isPro, isAdmin } = usePlan()
  const hasFullAccess = isPro || isAdmin
  const [form, setForm] = useState(EMPTY_FORM)
  const [channel, setChannel] = useState<'email' | 'short'>('email')
  const [variants, setVariants] = useState<Variant[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<number | null>(null)
  const [showUpgrade, setShowUpgrade] = useState(false)

  const set = (key: FormKey) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const handleCompose = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasFullAccess) return setShowUpgrade(true)
    if (!form.companyName.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, channel }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Rédaction impossible')
      setVariants(data.variants)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rédaction impossible')
    } finally {
      setLoading(false)
    }
  }

  const updateVariant = (index: number, patch: Partial<Variant>) =>
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)))

  const handleCopy = async (index: number) => {
    const v = variants[index]
    await navigator.clipboard.writeText(v.subject ? `Objet : ${v.subject}\n\n${v.body}` : v.body)
    setCopied(index)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="min-h-screen">
      <Header title="Rédiger" subtitle="Décrivez l'entreprise, l'IA écrit le message selon les règles des cold emails qui obtiennent le plus de réponses" />
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} reason="contact" />

      <div className="grid gap-6 p-6 lg:grid-cols-[400px_1fr]">
        <div className="space-y-6">
          <Card className="p-5">
            <form onSubmit={handleCompose} className="space-y-4">
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-white/[0.06] bg-zinc-800/40 p-1">
                {([['email', 'Email', Mail], ['short', 'WhatsApp / SMS', MessageCircle]] as const).map(([id, label, Icon]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setChannel(id)}
                    className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium ${
                      channel === id ? 'bg-amber-500 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              <Field label="Nom de l'entreprise *">
                <input value={form.companyName} onChange={set('companyName')} required placeholder="Boulangerie Martin" className={inputClass} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Activité">
                  <input value={form.activity} onChange={set('activity')} placeholder="Boulangerie" className={inputClass} />
                </Field>
                <Field label="Ville">
                  <input value={form.city} onChange={set('city')} placeholder="Lyon" className={inputClass} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nom du gérant">
                  <input value={form.contactName} onChange={set('contactName')} placeholder="M. Martin" className={inputClass} />
                </Field>
                <Field label="Note / avis Google">
                  <input value={form.googleRating} onChange={set('googleRating')} placeholder="4,8 sur 120 avis" className={inputClass} />
                </Field>
              </div>
              <Field label="Site web (vide si aucun)">
                <input value={form.website} onChange={set('website')} placeholder="boulangerie-martin.fr" className={inputClass} />
              </Field>
              <Field label="Ce que vous avez remarqué">
                <textarea
                  value={form.observations}
                  onChange={set('observations')}
                  rows={4}
                  placeholder="Pas de site, juste une page Facebook pas à jour depuis 2022. Les clients demandent les horaires en commentaire."
                  className={inputClass}
                />
              </Field>
              <Field label="Ce que vous proposez">
                <input value={form.offer} onChange={set('offer')} placeholder="Site vitrine avec commande en ligne" className={inputClass} />
              </Field>

              <Button type="submit" disabled={loading || !form.companyName.trim()} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? 'Rédaction de 3 versions…' : variants.length ? 'Réécrire 3 versions' : 'Rédiger 3 versions'}
              </Button>
              {error && <p className="text-sm text-red-400">{error}</p>}
            </form>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-white">Règles appliquées par l&apos;IA</h2>
            <ul className="space-y-2 text-xs leading-relaxed text-zinc-400">
              {COLD_EMAIL_RULES.map((rule) => (
                <li key={rule} className="flex gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-white/[0.06] pt-3 text-xs text-zinc-500">{SEND_TIMING_TIP}</p>
          </Card>
        </div>

        <div className="space-y-4">
          {variants.length === 0 ? (
            <Card className="flex min-h-[300px] items-center justify-center p-10 text-center">
              <p className="max-w-sm text-sm text-zinc-500">
                Les 3 versions apparaîtront ici, chacune avec un angle différent. Modifiez-les librement, puis copiez celle que vous préférez.
              </p>
            </Card>
          ) : (
            variants.map((variant, index) => (
              <Card key={index} className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-amber-300">{variant.angle}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">{variant.why}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleCopy(index)}>
                    {copied === index ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied === index ? 'Copié' : 'Copier'}
                  </Button>
                </div>
                {channel === 'email' && (
                  <input
                    value={variant.subject}
                    onChange={(e) => updateVariant(index, { subject: e.target.value })}
                    aria-label="Objet"
                    className={`${inputClass} font-medium`}
                  />
                )}
                <textarea
                  value={variant.body}
                  onChange={(e) => updateVariant(index, { body: e.target.value })}
                  aria-label="Message"
                  rows={channel === 'email' ? 11 : 4}
                  className={`${inputClass} leading-relaxed text-zinc-200`}
                />
                <p className="text-xs text-zinc-500">
                  {channel === 'email'
                    ? `${variant.body.split(/\s+/).filter(Boolean).length} mots (signature comprise)`
                    : `${variant.body.length} caractères`}
                </p>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-zinc-500">{label}</span>
      {children}
    </label>
  )
}

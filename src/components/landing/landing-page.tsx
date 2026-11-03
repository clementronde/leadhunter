'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowRight, Check, Minus, Phone, Mail, KanbanSquare, Link2, FileText } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { cn, scoreProspect, getPriorityFromScore, type ScoreFactors } from '@/lib/utils'

/* ─── Shared ───────────────────────────────────────────────────────────── */

const ease = [0.16, 1, 0.3, 1] as const

function signupHref(query: string, location: string) {
  const params = new URLSearchParams()
  if (query.trim()) params.set('query', query.trim())
  if (location.trim()) params.set('location', location.trim())
  const next = `/scanner${params.toString() ? `?${params}` : ''}`
  return `/login?mode=register&next=${encodeURIComponent(next)}`
}

/* ─── Page ─────────────────────────────────────────────────────────────── */

export function LandingPage() {
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')

  return (
    <div className="min-h-screen overflow-x-clip bg-canvas text-ink">
      <Navbar />
      <main>
        <Hero query={query} location={location} onQuery={setQuery} onLocation={setLocation} />
        <AuditSection />
        <DailySection />
        <Pricing />
        <Closing />
      </main>
      <Footer />
    </div>
  )
}

/* ─── Navbar ───────────────────────────────────────────────────────────── */

function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-hairline/70 bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="LeadHunter, accueil" className="rounded-md">
          <Logo />
        </Link>
        <nav aria-label="Sections" className="hidden items-center gap-1 text-[13px] text-zinc-400 md:flex">
          <a href="#audit" className="rounded-md px-3 py-1.5 transition-colors hover:text-white">Audit</a>
          <a href="#quotidien" className="rounded-md px-3 py-1.5 transition-colors hover:text-white">Au quotidien</a>
          <a href="#tarifs" className="rounded-md px-3 py-1.5 transition-colors hover:text-white">Tarifs</a>
        </nav>
        <div className="flex items-center gap-1.5">
          <Link href="/login" className="rounded-md px-3 py-1.5 text-[13px] text-zinc-300 transition-colors hover:text-white">
            Connexion
          </Link>
          <Link
            href="/login?mode=register"
            className="rounded-lg bg-white px-3 py-1.5 text-[13px] font-medium text-zinc-950 transition-colors hover:bg-zinc-200"
          >
            Créer un compte
          </Link>
        </div>
      </div>
    </header>
  )
}

/* ─── Scan form (hero + closing) ───────────────────────────────────────── */

function ScanForm({
  query,
  location,
  onQuery,
  onLocation,
  idPrefix,
}: {
  query: string
  location: string
  onQuery: (v: string) => void
  onLocation: (v: string) => void
  idPrefix: string
}) {
  const router = useRouter()

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        router.push(signupHref(query, location))
      }}
      className="flex w-full flex-col gap-2 rounded-xl border border-hairline-strong bg-surface-1 p-2 sm:flex-row sm:items-center sm:gap-0 sm:p-1.5"
    >
      <label htmlFor={`${idPrefix}-q`} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2 focus-within:bg-white/[0.03] focus-within:ring-1 focus-within:ring-amber-500/50">
        <span className="w-14 shrink-0 text-[12px] text-zinc-500">Activité</span>
        <input
          id={`${idPrefix}-q`}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Plombiers"
          autoComplete="off"
          className="w-full min-w-0 bg-transparent text-[15px] text-white placeholder:text-zinc-500 focus:outline-none"
        />
      </label>
      <span aria-hidden className="hidden h-6 w-px bg-hairline-strong sm:block" />
      <label htmlFor={`${idPrefix}-l`} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2 focus-within:bg-white/[0.03] focus-within:ring-1 focus-within:ring-amber-500/50">
        <span className="w-14 shrink-0 text-[12px] text-zinc-500">Ville</span>
        <input
          id={`${idPrefix}-l`}
          value={location}
          onChange={(e) => onLocation(e.target.value)}
          placeholder="Lyon"
          autoComplete="off"
          className="w-full min-w-0 bg-transparent text-[15px] text-white placeholder:text-zinc-500 focus:outline-none"
        />
      </label>
      <button
        type="submit"
        className="group inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 text-[14px] font-medium text-on-accent transition-colors hover:bg-accent-hover active:translate-y-px"
      >
        Scanner la zone
        <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
      </button>
    </form>
  )
}

/* ─── Hero ─────────────────────────────────────────────────────────────── */

function Hero({
  query,
  location,
  onQuery,
  onLocation,
}: {
  query: string
  location: string
  onQuery: (v: string) => void
  onLocation: (v: string) => void
}) {
  return (
    <section className="mx-auto max-w-[1200px] px-4 pb-24 pt-14 sm:px-6 sm:pt-20">
      <div className="max-w-[720px]">
        <h1 className="text-[40px] font-semibold leading-[1.04] tracking-[-0.035em] text-white sm:text-[56px] lg:text-[64px]">
          Les entreprises de votre ville qui ont besoin d&apos;un site.
        </h1>
        <p className="mt-5 max-w-[640px] text-[17px] leading-relaxed text-zinc-400">
          Un métier, une ville : LeadHunter classe les entreprises qui ont besoin d&apos;un site.
        </p>
      </div>

      <div className="mt-9 max-w-[720px]">
        <ScanForm query={query} location={location} onQuery={onQuery} onLocation={onLocation} idPrefix="hero" />
        <p className="mt-3 text-[13px] text-zinc-500">
          3 scans gratuits par mois. Sans carte bancaire.
        </p>
      </div>

      <ResultsPanel query={query} location={location} />
    </section>
  )
}

/* ─── Results panel: example data scored by the real scoring function ──── */

type DemoLead = {
  name: string
  presence: string
  reviews: string
  factors: ScoreFactors
}

const TRADE_NAMES: { match: RegExp; names: string[] }[] = [
  { match: /plomb|chauff/i, names: ['Plomberie Garnier', 'Moreau Chauffage', 'SOS Dépannage Roux', 'Ets Lefèvre & Fils', 'Bernard Sanitaire', 'Dubois Thermique', 'Plomberie du Centre'] },
  { match: /restau|brasserie|pizz|bistro/i, names: ['Le Comptoir de Léon', 'Chez Martine', 'La Table du Marché', 'Pizzeria Da Marco', 'Brasserie des Halles', 'Le Petit Zinc', 'Auberge du Pont'] },
  { match: /coiff|barb/i, names: ['Salon Élodie', 'Barber Shop Karim', 'L’Atelier Coiffure', 'Hair & Co', 'Coiffure Moreau', 'Studio Mèches', 'Le Salon d’Inès'] },
  { match: /boulang|pâtiss|patiss/i, names: ['Boulangerie Moreau', 'Au Pain Doré', 'La Fournée', 'Maison Garnier', 'Le Fournil du Parc', 'Pâtisserie Roux', 'Aux Délices'] },
  { match: /garag|auto|carross/i, names: ['Garage Lefèvre', 'Carrosserie Martin', 'Auto Service Roux', 'Garage du Stade', 'Pneus & Co', 'Dubois Automobiles', 'Garage Central'] },
]
const DEFAULT_NAMES = ['Maison Garnier', 'Atelier Moreau', 'Ets Lefèvre & Fils', 'Chez Bernard', 'Dubois & Associés', 'Roux Services', 'Martin Frères']

const DEMO_PROFILES: Omit<DemoLead, 'name'>[] = [
  {
    presence: 'Facebook uniquement',
    reviews: '4,6 · 64 avis',
    factors: { hasWebsite: false, webPresence: 'social', googleReviewsCount: 64, googleRating: 4.6 },
  },
  {
    presence: 'Site lent, non mobile',
    reviews: '4,2 · 48 avis',
    factors: { hasWebsite: true, webPresence: 'website', performanceScore: 22, seoScore: 48, isHttps: true, isMobileFriendly: false, copyrightYear: 2017, googleReviewsCount: 48, googleRating: 4.2 },
  },
  {
    presence: 'Aucun site',
    reviews: '4,4 · 31 avis',
    factors: { hasWebsite: false, webPresence: 'none', googleReviewsCount: 31, googleRating: 4.4 },
  },
  {
    presence: 'PagesJaunes uniquement',
    reviews: '4,1 · 12 avis',
    factors: { hasWebsite: false, webPresence: 'directory', googleReviewsCount: 12, googleRating: 4.1 },
  },
  {
    presence: 'Site correct',
    reviews: '4,7 · 120 avis',
    factors: { hasWebsite: true, webPresence: 'website', performanceScore: 61, seoScore: 45, isHttps: true, isMobileFriendly: true, googleReviewsCount: 120, googleRating: 4.7 },
  },
  {
    presence: 'Site récent et rapide',
    reviews: '4,8 · 210 avis',
    factors: { hasWebsite: true, webPresence: 'website', performanceScore: 94, seoScore: 92, isHttps: true, isMobileFriendly: true, googleReviewsCount: 210, googleRating: 4.8 },
  },
  {
    presence: 'Non vérifiée',
    reviews: 'Aucun avis',
    factors: { hasWebsite: false, webPresence: 'unknown', googleReviewsCount: 0 },
  },
]

const PRIORITY = {
  hot: { label: 'Chaud', dot: 'bg-red-400', text: 'text-red-300' },
  warm: { label: 'Tiède', dot: 'bg-amber-400', text: 'text-amber-300' },
  cold: { label: 'Froid', dot: 'bg-sky-400', text: 'text-sky-300' },
} as const

function useDemoLeads(query: string) {
  return useMemo(() => {
    const names = TRADE_NAMES.find((t) => t.match.test(query))?.names ?? DEFAULT_NAMES
    return DEMO_PROFILES.map((p, i) => {
      const { score, reasons } = scoreProspect(p.factors)
      const priority = getPriorityFromScore(score) as keyof typeof PRIORITY
      return { ...p, name: names[i], score, reasons, priority }
    }).sort((a, b) => b.score - a.score)
  }, [query])
}

type ScoredLead = ReturnType<typeof useDemoLeads>[number]

function LeadDetail({ lead, city }: { lead: ScoredLead; city: string }) {
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-[16px] font-medium text-white">{lead.name}</p>
          <p className="mt-0.5 text-[13px] text-zinc-500">{city} · {lead.reviews}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[32px] font-medium leading-none tabular-nums text-amber-400">{lead.score}</p>
          <p className={cn('mt-1 text-[12px]', PRIORITY[lead.priority].text)}>{PRIORITY[lead.priority].label}</p>
        </div>
      </div>

      <p className="mt-5 text-[12px] text-zinc-500">Pourquoi ce score</p>
      <ul className="mt-2 space-y-1.5">
        {lead.reasons.map((r) => (
          <li key={r} className="flex items-start gap-2 text-[13px] text-zinc-300">
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-zinc-500" aria-hidden />
            {r}
          </li>
        ))}
      </ul>

      <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-hairline/60 pt-4 text-[12px] text-zinc-500">
        Depuis la fiche :
        <span className="inline-flex items-center gap-1 text-zinc-300"><Phone className="h-3.5 w-3.5 text-zinc-500" aria-hidden />appeler</span>
        <span className="inline-flex items-center gap-1 text-zinc-300"><Mail className="h-3.5 w-3.5 text-zinc-500" aria-hidden />écrire</span>
        <span className="inline-flex items-center gap-1 text-zinc-300"><KanbanSquare className="h-3.5 w-3.5 text-zinc-500" aria-hidden />suivre</span>
      </p>
    </>
  )
}

function ResultsPanel({ query, location }: { query: string; location: string }) {
  const trade = query.trim() || 'Plombiers'
  const city = location.trim() || 'Lyon'
  const leads = useDemoLeads(trade)
  const [selected, setSelected] = useState(0)
  const reduce = useReducedMotion()
  const lead = leads[Math.min(selected, leads.length - 1)]

  return (
    <figure className="mt-12 overflow-hidden rounded-2xl border border-hairline bg-surface-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_30px_80px_-40px_rgba(0,0,0,0.9)]">
      {/* Panel toolbar */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-hairline px-4 py-3 sm:px-5">
        <p className="min-w-0 truncate text-[14px] font-medium text-white">
          {trade} <span className="text-zinc-500">·</span> {city}
        </p>
        <span className="text-[12px] text-zinc-500">{leads.length} résultats<span className="hidden sm:inline">, triés par score</span></span>
        <span className="ml-auto rounded-md border border-hairline px-1.5 py-0.5 text-[11px] text-zinc-400">
          Exemple
        </span>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* List */}
        <div aria-label="Résultats d'exemple" className="divide-y divide-hairline/60 lg:border-r lg:border-hairline">
          <div className="hidden grid-cols-[minmax(0,1fr)_170px_120px_88px] gap-4 px-5 py-2 text-[11px] text-zinc-500 sm:grid">
            <span>Entreprise</span>
            <span>Présence web</span>
            <span>Avis Google</span>
            <span className="text-right">Score</span>
          </div>
          {leads.map((l, i) => {
            const p = PRIORITY[l.priority]
            const active = i === selected
            return (
              <div key={l.presence}>
              <motion.button
                layout={!reduce}
                type="button"
                aria-pressed={active}
                onClick={() => setSelected(i)}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease, delay: reduce ? 0 : 0.15 + i * 0.06, layout: { duration: 0.3, ease } }}
                className={cn(
                  'grid w-full grid-cols-[minmax(0,1fr)_64px] items-center gap-x-4 gap-y-0.5 px-4 py-3 text-left transition-colors sm:grid-cols-[minmax(0,1fr)_170px_120px_88px] sm:px-5',
                  active ? 'bg-white/[0.045]' : 'hover:bg-white/[0.025]'
                )}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', p.dot)} aria-hidden />
                  <span className="truncate text-[14px] text-zinc-100">{l.name}</span>
                </span>
                <span className="col-start-1 row-start-2 pl-4 text-[12px] text-zinc-500 sm:col-start-auto sm:row-start-auto sm:pl-0 sm:text-[13px] sm:text-zinc-400">
                  {l.presence}
                </span>
                <span className="hidden text-[13px] tabular-nums text-zinc-500 sm:block">{l.reviews}</span>
                <span className="col-start-2 row-span-2 row-start-1 flex items-center justify-end gap-2 sm:col-start-auto sm:row-span-1 sm:row-start-auto">
                  <span className="hidden h-1 w-10 overflow-hidden rounded-full bg-zinc-800 sm:block" aria-hidden>
                    <span className="block h-full rounded-full bg-amber-500" style={{ width: `${l.score}%`, opacity: 0.35 + l.score / 160 }} />
                  </span>
                  <span className="w-7 text-right font-mono text-[14px] tabular-nums text-white">{l.score}</span>
                </span>
              </motion.button>
              {active && (
                <div className="border-t border-hairline/60 bg-white/[0.02] px-4 py-4 lg:hidden">
                  <LeadDetail lead={l} city={city} />
                </div>
              )}
              </div>
            )
          })}
        </div>

        {/* Detail (desktop side column) */}
        <div className="hidden p-5 lg:block">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={lead.name}
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease }}
            >
              <LeadDetail lead={lead} city={city} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <figcaption className="border-t border-hairline px-5 py-2.5 text-[12px] text-zinc-500">
        Données d&apos;exemple. Les scores et les raisons sont calculés par le même algorithme que dans l&apos;application.
      </figcaption>
    </figure>
  )
}

/* ─── Section shell ────────────────────────────────────────────────────── */

function Section({ id, children, className }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={cn('scroll-mt-16 border-t border-hairline', className)}>
      <div className="mx-auto max-w-[1200px] px-4 py-24 sm:px-6 sm:py-28">{children}</div>
    </section>
  )
}

function SectionHead({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="max-w-[520px]">
      <h2 className="text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] text-white sm:text-[40px]">{title}</h2>
      <div className="mt-4 space-y-3 text-[16px] leading-relaxed text-zinc-400">{children}</div>
    </div>
  )
}

/* ─── Audit ────────────────────────────────────────────────────────────── */

const AUDIT_METRICS = [
  { label: 'Performance', value: 22 },
  { label: 'SEO', value: 48 },
  { label: 'Accessibilité', value: 61 },
  { label: 'Bonnes pratiques', value: 58 },
]

function metricTone(v: number) {
  if (v >= 90) return { bar: 'bg-emerald-400', text: 'text-emerald-300' }
  if (v >= 50) return { bar: 'bg-amber-400', text: 'text-amber-300' }
  return { bar: 'bg-red-400', text: 'text-red-300' }
}

function AuditSection() {
  return (
    <Section id="audit">
      <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <SectionHead title="Un audit pour ouvrir la conversation.">
          <p>
            Quand l&apos;entreprise a déjà un site, LeadHunter mesure sa performance et son SEO,
            vérifie le HTTPS et l&apos;affichage mobile, repère le CMS et l&apos;année du copyright.
          </p>
          <p>
            Vous appelez avec des faits précis, et un lien vers le rapport à envoyer au gérant.
          </p>
        </SectionHead>

        <div className="rounded-2xl border border-hairline bg-surface-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-3">
            <p className="truncate font-mono text-[13px] text-zinc-300">moreau-chauffage.fr</p>
            <span className="rounded-md border border-hairline px-1.5 py-0.5 text-[11px] text-zinc-400">Exemple</span>
          </div>
          <div className="grid gap-x-8 gap-y-5 p-5 sm:grid-cols-2">
            {AUDIT_METRICS.map(({ label, value }) => {
              const t = metricTone(value)
              return (
                <div key={label}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] text-zinc-400">{label}</span>
                    <span className={cn('font-mono text-[15px] tabular-nums', t.text)}>{value}</span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-800">
                    <div className={cn('h-full rounded-full', t.bar)} style={{ width: `${value}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
          <dl className="grid grid-cols-2 border-t border-hairline text-[13px] sm:grid-cols-4">
            {[
              { k: 'HTTPS', v: 'Oui', ok: true },
              { k: 'Mobile', v: 'Non adapté', ok: false },
              { k: 'CMS', v: 'WordPress 4.9', ok: false },
              { k: 'Copyright', v: '© 2017', ok: false },
            ].map(({ k, v, ok }, i) => (
              <div
                key={k}
                className={cn(
                  'border-hairline px-5 py-3',
                  i % 2 === 1 && 'border-l',
                  i >= 2 && 'border-t sm:border-t-0',
                  i >= 1 && 'sm:border-l'
                )}
              >
                <dt className="text-[12px] text-zinc-500">{k}</dt>
                <dd className={cn('mt-0.5', ok ? 'text-zinc-200' : 'text-red-300')}>{v}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap items-center gap-2 border-t border-hairline px-5 py-3 text-[12px] text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5 text-zinc-500" /> Lien de rapport partageable
            </span>
            <span className="text-zinc-700">·</span>
            <span className="inline-flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-zinc-500" /> Export PDF
            </span>
            <span className="ml-auto text-zinc-500">Inclus dans Pro</span>
          </div>
        </div>
      </div>
    </Section>
  )
}

/* ─── Daily loop ───────────────────────────────────────────────────────── */

const TODAY_ROWS = [
  { name: 'Boulangerie Moreau', action: 'Relancer par email', when: 'Email envoyé il y a 3 jours' },
  { name: 'Garage du Stade', action: 'Rappeler', when: 'Pas de réponse lundi' },
  { name: 'Salon Élodie', action: 'Envoyer la proposition', when: 'RDV fait hier' },
  { name: 'Chez Martine', action: 'Premier contact', when: 'Ajouté par le scan de mardi' },
]

const KEYS = [
  { k: '→', label: 'Garder' },
  { k: '←', label: 'Écarter' },
  { k: '↑', label: 'Marquer chaud' },
  { k: 'Espace', label: 'Passer' },
  { k: 'O', label: 'Ouvrir le site' },
  { k: 'Entrée', label: 'Ouvrir la fiche' },
]

function DailySection() {
  return (
    <Section id="quotidien">
      <SectionHead title="Chaque matin, une liste courte.">
        <p>
          L&apos;écran Aujourd&apos;hui rassemble les relances dues et les nouveaux leads à contacter.
          Le tri des scans se fait au clavier, un lead à la fois.
        </p>
      </SectionHead>

      <div className="mt-12 grid items-start gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="rounded-2xl border border-hairline bg-surface-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex items-baseline justify-between border-b border-hairline px-5 py-3">
            <p className="text-[14px] font-medium text-white">Aujourd&apos;hui</p>
            <p className="text-[12px] text-zinc-500">4 actions</p>
          </div>
          <ul className="divide-y divide-hairline/60">
            {TODAY_ROWS.map((r) => (
              <li key={r.name} className="flex items-center gap-3 px-5 py-3">
                <span aria-hidden className="h-4 w-4 shrink-0 rounded-[5px] border border-hairline-strong" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] text-zinc-100">{r.action} <span className="text-zinc-500">·</span> {r.name}</p>
                  <p className="truncate text-[12px] text-zinc-500">{r.when}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-hairline bg-surface-1 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <p className="text-[14px] font-medium text-white">Tri au clavier</p>
          <p className="mt-1 text-[13px] text-zinc-500">Ou en glissant la carte, sur mobile.</p>
          <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
            {KEYS.map(({ k, label }) => (
              <li key={k} className="flex items-center gap-2.5 text-[13px] text-zinc-300">
                <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-hairline-strong bg-surface-2 px-1.5 font-mono text-[11px] text-zinc-200 shadow-[0_1px_0_#34343a]">
                  {k}
                </kbd>
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <ol className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2 rounded-2xl border border-hairline bg-surface-1 px-5 py-4 text-[13px]" aria-label="Étapes du pipeline">
        <li className="mr-2 text-zinc-500">Pipeline</li>
        {['Nouveau', 'Contacté', 'RDV', 'Proposition', 'Gagné'].map((s, i, arr) => (
          <li key={s} className="flex items-center gap-2">
            <span className={cn('inline-flex items-center gap-1 rounded-md bg-surface-3 px-2 py-0.5', i === arr.length - 1 ? 'text-white' : 'text-zinc-300')}>{i === arr.length - 1 && <Check className="h-3 w-3" aria-hidden />}{s}</span>
            {i < arr.length - 1 && <ArrowRight aria-hidden className="h-3 w-3 text-zinc-600" />}
          </li>
        ))}
      </ol>
    </Section>
  )
}

/* ─── Pricing ──────────────────────────────────────────────────────────── */

const PLAN_ROWS: { label: string; free: string | boolean; pro: string | boolean }[] = [
  { label: 'Scans', free: '3 par mois', pro: 'Illimités' },
  { label: 'Leads par scan', free: '10', pro: "Jusqu'à 60" },
  { label: 'Score chaud / tiède / froid', free: true, pro: true },
  { label: 'Pipeline', free: true, pro: true },
  { label: 'Audit de site (Core Web Vitals)', free: false, pro: true },
  { label: 'Export XLSX', free: false, pro: true },
  { label: 'Support prioritaire', free: false, pro: true },
]

function Cell({ v }: { v: string | boolean }) {
  if (v === true) return <Check className="h-4 w-4 text-zinc-200" aria-label="Inclus" />
  if (v === false) return <Minus className="h-4 w-4 text-zinc-700" aria-label="Non inclus" />
  return <span className="text-zinc-200">{v}</span>
}

function Pricing() {
  return (
    <Section id="tarifs">
      <SectionHead title={'Gratuit pour essayer. 29 € quand ça rapporte.'}>
        <p>Sans engagement, annulable à tout moment.</p>
      </SectionHead>

      {/* Mobile: two stacked plans */}
      <div className="mt-10 space-y-3 sm:hidden">
        {([
          { name: 'Gratuit', price: '0 €', unit: '', key: 'free', cta: 'Commencer gratuitement', href: '/login?mode=register', primary: false },
          { name: 'Pro', price: '29 €', unit: '/ mois', key: 'pro', cta: 'Passer à Pro', href: '/login?mode=register&next=%2Fupgrade', primary: true },
        ] as const).map((plan) => (
          <div key={plan.key} className="rounded-2xl border border-hairline bg-surface-1 p-5">
            <p className={cn('text-[13px]', plan.primary ? 'text-amber-400' : 'text-zinc-400')}>{plan.name}</p>
            <p className="mt-1 text-[28px] font-semibold tracking-[-0.02em] text-white">
              {plan.price}
              {plan.unit && <span className="ml-1 text-[14px] font-normal text-zinc-500">{plan.unit}</span>}
            </p>
            <ul className="mt-4 space-y-2 text-[14px]">
              {PLAN_ROWS.map((r) => {
                const v = r[plan.key]
                if (v === false) return null
                return (
                  <li key={r.label} className="flex items-center gap-2.5 text-zinc-300">
                    <Check className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
                    {typeof v === 'string' ? `${r.label} : ${v.toLowerCase()}` : r.label}
                  </li>
                )
              })}
            </ul>
            <Link
              href={plan.href}
              className={cn(
                'mt-5 flex h-10 items-center justify-center rounded-lg text-[14px] font-medium transition-colors',
                plan.primary
                  ? 'bg-amber-500 text-on-accent hover:bg-accent-hover'
                  : 'border border-hairline-strong bg-surface-2 text-zinc-100 hover:bg-surface-3'
              )}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-12 hidden overflow-x-auto rounded-2xl border border-hairline bg-surface-1 sm:block">
        <table className="w-full min-w-[560px] border-collapse text-left text-[14px]">
          <caption className="sr-only">Comparaison des offres Gratuit et Pro</caption>
          <thead>
            <tr className="border-b border-hairline">
              <th scope="col" className="w-[44%] px-5 py-5 align-bottom text-[13px] font-normal text-zinc-500">Inclus</th>
              <th scope="col" className="px-5 py-5 align-bottom font-normal">
                <p className="text-[13px] text-zinc-400">Gratuit</p>
                <p className="mt-1 text-[28px] font-semibold tracking-[-0.02em] text-white">0 €</p>
              </th>
              <th scope="col" className="border-l border-hairline bg-white/[0.02] px-5 py-5 align-bottom font-normal">
                <p className="text-[13px] text-amber-400">Pro</p>
                <p className="mt-1 text-[28px] font-semibold tracking-[-0.02em] text-white">
                  29 €<span className="ml-1 text-[14px] font-normal text-zinc-500">/ mois</span>
                </p>
              </th>
            </tr>
          </thead>
          <tbody>
            {PLAN_ROWS.map((r) => (
              <tr key={r.label} className="border-b border-hairline/60">
                <th scope="row" className="px-5 py-3 font-normal text-zinc-400">{r.label}</th>
                <td className="px-5 py-3"><Cell v={r.free} /></td>
                <td className="border-l border-hairline bg-white/[0.02] px-5 py-3"><Cell v={r.pro} /></td>
              </tr>
            ))}
            <tr>
              <td className="px-5 py-5" />
              <td className="px-5 py-5">
                <Link
                  href="/login?mode=register"
                  className="inline-flex h-9 items-center rounded-lg border border-hairline-strong bg-surface-2 px-3.5 text-[13px] font-medium text-zinc-100 transition-colors hover:bg-surface-3"
                >
                  Commencer gratuitement
                </Link>
              </td>
              <td className="border-l border-hairline bg-white/[0.02] px-5 py-5">
                <Link
                  href="/login?mode=register&next=%2Fupgrade"
                  className="inline-flex h-9 items-center rounded-lg bg-amber-500 px-3.5 text-[13px] font-medium text-on-accent transition-colors hover:bg-accent-hover"
                >
                  Passer à Pro
                </Link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Section>
  )
}

/* ─── Closing ──────────────────────────────────────────────────────────── */

function Closing() {
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  return (
    <Section>
      <div className="mx-auto max-w-[720px] text-center">
        <h2 className="text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] text-white sm:text-[44px]">
          Quelle zone prospectez-vous demain&nbsp;?
        </h2>
        <p className="mt-4 text-[16px] text-zinc-400">Un métier, une ville : la liste arrive triée.</p>
        <div className="mt-8 text-left">
          <ScanForm query={query} location={location} onQuery={setQuery} onLocation={setLocation} idPrefix="closing" />
        </div>
      </div>
    </Section>
  )
}

/* ─── Footer ───────────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-10 text-[13px] text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <Logo size={18} />
          <span>Prospection locale pour agences web</span>
        </div>
        <nav aria-label="Pied de page" className="flex items-center gap-5">
          <a href="#tarifs" className="transition-colors hover:text-white">Tarifs</a>
          <Link href="/login" className="transition-colors hover:text-white">Connexion</Link>
          <span>© {new Date().getFullYear()} LeadHunter</span>
        </nav>
      </div>
    </footer>
  )
}

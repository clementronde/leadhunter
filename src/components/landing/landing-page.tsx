'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import {
  Target, MapPin, Zap, Globe, ArrowRight, Check, Phone,
  ExternalLink, Shield, Smartphone, AlertTriangle, X,
  Building2, Database, Download, KanbanSquare,
} from 'lucide-react'

/* ─── Variants ─────────────────────────────────────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' as const } },
}
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

/* ─── LandingPage ────────────────────────────────────────────────────────── */

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white overflow-x-hidden">
      <Navbar />
      <Hero />
      <ScannerSection />
      <AuditSection />
      <PipelineSection />
      <Pricing />
      <FinalCTA />
      <Footer />
    </div>
  )
}

/* ─── Navbar ─────────────────────────────────────────────────────────────── */

function Navbar() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
            <Target className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold">Lead<span className="text-amber-400">Hunter</span></span>
        </div>
        <nav className="hidden sm:flex items-center gap-6 text-sm text-zinc-400">
          <a href="#scanner" className="hover:text-white transition-colors">Fonctionnalités</a>
          <a href="#pricing" className="hover:text-white transition-colors">Tarifs</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition-colors">
            Connexion
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium px-4 py-2 rounded-lg bg-white text-zinc-900 hover:bg-zinc-100 transition-colors"
          >
            Essayer gratuitement
          </Link>
        </div>
      </div>
    </motion.header>
  )
}

/* ─── Hero ─────────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-4 sm:px-6 pt-20 pb-12 overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-amber-500/10 blur-[120px]" />
        <div className="absolute top-20 left-1/3 w-[300px] h-[300px] rounded-full bg-orange-600/8 blur-[80px]" />
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="text-center max-w-4xl mx-auto"
      >
        <motion.div
          variants={fadeUp}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-medium mb-8 tracking-wide uppercase"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Google Maps · INSEE / Sirene · Scoring automatique
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight mb-6"
        >
          Trouvez les clients locaux{' '}
          <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            qui ont besoin de vous
          </span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Scannez n&apos;importe quelle ville, détectez les entreprises sans site web ou avec un site
          obsolète — et obtenez des leads qualifiés avec scoring{' '}
          <span className="text-red-400 font-medium">Chaud</span> ·{' '}
          <span className="text-amber-400 font-medium">Tiède</span> ·{' '}
          <span className="text-blue-400 font-medium">Froid</span> automatique.
        </motion.p>

        <motion.div
          variants={fadeUp}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4"
        >
          <Link
            href="/login"
            className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-amber-900/30"
          >
            Commencer gratuitement
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <a
            href="#scanner"
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-zinc-300 font-medium hover:border-white/20 hover:text-white transition-all"
          >
            Voir les fonctionnalités
          </a>
        </motion.div>

        <motion.p variants={fadeUp} className="text-xs text-zinc-600">
          3 scans gratuits · Sans carte bancaire · Sans engagement
        </motion.p>
      </motion.div>

      {/* Hero demo card */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.7, ease: 'easeOut' }}
        className="mt-16 w-full max-w-3xl mx-auto"
      >
        <DashboardMockup />
      </motion.div>
    </section>
  )
}

/* ─── Dashboard Mockup (Hero) ─────────────────────────────────────────────── */

const CHART_BARS = [40, 65, 45, 80, 55, 90, 95]
const DASH_RECENT = [
  { name: 'Boulangerie Martin', tag: 'Chaud', score: 95 },
  { name: 'Plomberie Moreau', tag: 'Chaud', score: 91 },
  { name: 'Coiffure Élise', tag: 'Tiède', score: 62 },
]

function DashboardMockup() {
  const [counts, setCounts] = useState({ leads: 0, hot: 0, scans: 0, rate: 0 })
  const [chartVisible, setChartVisible] = useState(0)
  const [recentVisible, setRecentVisible] = useState(0)

  useEffect(() => {
    function animate() {
      setCounts({ leads: 0, hot: 0, scans: 0, rate: 0 })
      setChartVisible(0)
      setRecentVisible(0)

      let step = 0
      const total = 40
      const t = setInterval(() => {
        step++
        const p = Math.min(step / total, 1)
        const e = 1 - (1 - p) ** 3
        setCounts({
          leads: Math.round(247 * e),
          hot: Math.round(38 * e),
          scans: Math.round(12 * e),
          rate: Math.round(8 * e),
        })
        if (step >= total) {
          clearInterval(t)
          let bi = 0
          const bt = setInterval(() => {
            bi++; setChartVisible(bi)
            if (bi >= CHART_BARS.length) {
              clearInterval(bt)
              let ri = 0
              const rt = setInterval(() => {
                ri++; setRecentVisible(ri)
                if (ri >= DASH_RECENT.length) {
                  clearInterval(rt)
                  setTimeout(animate, 5000)
                }
              }, 400)
            }
          }, 100)
        }
      }, 35)
    }
    animate()
  }, [])

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/60">
      {/* Window bar */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/[0.06] bg-zinc-950/50">
        <div className="w-3 h-3 rounded-full bg-red-500/70" />
        <div className="w-3 h-3 rounded-full bg-amber-500/70" />
        <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
        <span className="ml-3 text-xs text-zinc-500">LeadHunter — Dashboard</span>
      </div>

      <div className="p-5">
        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2.5 mb-5">
          {[
            { label: 'Leads trouvés', value: counts.leads, suffix: '', color: 'text-white' },
            { label: 'Leads chauds', value: counts.hot, suffix: ' 🔥', color: 'text-red-400' },
            { label: 'Scans / mois', value: counts.scans, suffix: '', color: 'text-amber-400' },
            { label: 'Taux closing', value: counts.rate, suffix: '%', color: 'text-emerald-400' },
          ].map(({ label, value, suffix, color }) => (
            <div key={label} className="bg-zinc-800/50 border border-white/[0.06] rounded-xl p-3">
              <p className="text-[9px] text-zinc-500 mb-1.5 leading-tight">{label}</p>
              <p className={`text-xl font-bold font-mono leading-none ${color}`}>{value}{suffix}</p>
            </div>
          ))}
        </div>

        {/* Mini bar chart */}
        <div className="mb-4">
          <p className="text-[9px] text-zinc-500 mb-2 uppercase tracking-wide">Activité — 7 derniers jours</p>
          <div className="flex items-end gap-1 h-14">
            {CHART_BARS.map((h, i) => (
              <motion.div
                key={i}
                className="flex-1 rounded-t-sm bg-gradient-to-t from-amber-500/60 to-amber-400/20"
                style={{ height: '0%' }}
                animate={{ height: i < chartVisible ? `${h}%` : '0%' }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            ))}
          </div>
        </div>

        {/* Recent leads — fixed height prevents layout shift */}
        <div>
          <p className="text-[9px] text-zinc-500 uppercase tracking-wide mb-2">Derniers leads détectés</p>
          <div className="space-y-1.5 min-h-[126px]">
            {DASH_RECENT.slice(0, recentVisible).map((lead, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800/40 border border-white/[0.04]"
              >
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${lead.tag === 'Chaud' ? 'bg-red-400' : 'bg-amber-400'}`} />
                <p className="text-xs font-medium text-white flex-1 truncate">{lead.name}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${lead.tag === 'Chaud' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>{lead.tag}</span>
                <span className="text-[10px] font-bold text-zinc-500">{lead.score}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Scanner Section ─────────────────────────────────────────────────────── */

function ScannerSection() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: false, margin: '-100px' })

  return (
    <section id="scanner" ref={ref} className="py-28 max-w-6xl mx-auto px-4 sm:px-6">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-medium mb-6 uppercase tracking-wide">
            <MapPin className="h-3 w-3" /> Scanner Google Maps
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold leading-tight mb-5">
            Détectez des dizaines de leads{' '}
            <span className="text-zinc-400">en quelques secondes</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-zinc-400 leading-relaxed mb-8">
            Saisissez un type d&apos;activité et une ville. LeadHunter interroge Google Maps
            et récupère les fiches enrichies — téléphone, site web, note, avis — pour chaque établissement.
          </motion.p>
          <motion.ul variants={stagger} className="space-y-3">
            {[
              '45+ types d\'entreprises prédéfinis (restaurants, coiffeurs, plombiers…)',
              'Déduplication automatique des fiches déjà dans votre CRM',
              'Scoring chaud / tiède / froid en temps réel',
              'Jusqu\'à 60 résultats par scan (Pro)',
            ].map((item) => (
              <motion.li key={item} variants={fadeUp} className="flex items-start gap-3 text-sm text-zinc-400">
                <Check className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                {item}
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
        >
          <ScannerMockup inView={inView} />
        </motion.div>
      </div>
    </section>
  )
}

/* ─── Scanner Mockup (animated) ───────────────────────────────────────────── */

const SCANNER_LEADS = [
  { name: 'Plomberie Moreau', phone: '04 91 55 23 10', hasWebsite: false, score: 95, rating: 4.1 },
  { name: 'SOS Plombier 13', phone: '04 91 77 89 00', hasWebsite: false, score: 92, rating: 3.8 },
  { name: 'Artisan Plombier Sud', phone: '04 91 33 44 55', hasWebsite: true, score: 44, rating: 4.5 },
  { name: 'Depannage Express', phone: '04 91 20 11 99', hasWebsite: false, score: 89, rating: 4.0 },
  { name: 'Robinetterie Pro', phone: '04 91 66 88 12', hasWebsite: false, score: 87, rating: 3.9 },
]

function ScannerMockup({ inView }: { inView: boolean }) {
  const [phase, setPhase] = useState<'idle' | 'typing-q' | 'typing-l' | 'loading' | 'results'>('idle')
  const [queryTxt, setQueryTxt] = useState('')
  const [locationTxt, setLocationTxt] = useState('')
  const [visible, setVisible] = useState(0)
  const started = useRef(false)

  const QUERY = 'Plombiers'
  const LOCATION = 'Marseille 13'

  useEffect(() => {
    if (!inView || started.current) return
    started.current = true
    runAnimation()
  }, [inView])

  function runAnimation() {
    setPhase('typing-q')
    setQueryTxt('')
    setLocationTxt('')
    setVisible(0)

    let q = ''
    const typeQ = setInterval(() => {
      q += QUERY[q.length]
      setQueryTxt(q)
      if (q.length === QUERY.length) {
        clearInterval(typeQ)
        setTimeout(() => {
          setPhase('typing-l')
          let l = ''
          const typeL = setInterval(() => {
            l += LOCATION[l.length]
            setLocationTxt(l)
            if (l.length === LOCATION.length) {
              clearInterval(typeL)
              setTimeout(() => {
                setPhase('loading')
                setTimeout(() => {
                  setPhase('results')
                  let i = 0
                  const show = setInterval(() => {
                    i++; setVisible(i)
                    if (i >= SCANNER_LEADS.length) {
                      clearInterval(show)
                      setTimeout(() => {
                        started.current = false
                        runAnimation()
                      }, 5000)
                    }
                  }, 400)
                }, 1600)
              }, 300)
            }
          }, 65)
        }, 200)
      }
    }, 70)
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/80 overflow-hidden shadow-2xl shadow-black/50">
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/[0.06] bg-zinc-950/50">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
        <span className="ml-3 text-[11px] text-zinc-500">Scanner — Google Maps</span>
      </div>

      <div className="p-4 space-y-3">
        {/* Inputs */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-zinc-800/60 border border-white/[0.07] rounded-lg px-3 py-2.5 text-sm text-zinc-200 font-mono min-h-[38px] flex items-center gap-1.5">
            <Building2 className="h-3 w-3 text-zinc-500 shrink-0" />
            {queryTxt}
            {phase === 'typing-q' && <span className="w-0.5 h-3.5 bg-amber-400 animate-pulse" />}
          </div>
          <div className="bg-zinc-800/60 border border-white/[0.07] rounded-lg px-3 py-2.5 text-sm text-zinc-200 font-mono min-h-[38px] flex items-center gap-1.5">
            <MapPin className="h-3 w-3 text-zinc-500 shrink-0" />
            {locationTxt}
            {phase === 'typing-l' && <span className="w-0.5 h-3.5 bg-amber-400 animate-pulse" />}
          </div>
        </div>

        {/* Dynamic area — fixed min-height prevents layout shift */}
        <div className="min-h-[280px]">
          {/* Status bar */}
          {phase === 'loading' && (
            <div className="flex items-center gap-2 py-2 text-xs text-zinc-500">
              <div className="w-3 h-3 border border-amber-500/40 border-t-amber-500 rounded-full animate-spin" />
              Interrogation de Google Maps en cours...
            </div>
          )}

          {/* Results */}
          {phase === 'results' && (
            <div className="space-y-1.5">
              {SCANNER_LEADS.slice(0, visible).map((lead, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg bg-zinc-800/40 border border-white/[0.04]"
                >
                  <div className={`shrink-0 w-1.5 h-1.5 rounded-full ${lead.hasWebsite ? 'bg-blue-400' : 'bg-red-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{lead.name}</p>
                    <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                      <Phone className="h-2.5 w-2.5" />{lead.phone}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {lead.hasWebsite ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">Site web</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">Sans site 🔥</span>
                    )}
                    <span className="text-[10px] text-zinc-500">★ {lead.rating}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Audit Section ───────────────────────────────────────────────────────── */

function AuditSection() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: false, margin: '-100px' })

  return (
    <section ref={ref} className="py-28 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-orange-600/5 blur-[100px]" />
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <AuditMockup inView={inView} />
        </motion.div>

        <motion.div variants={stagger} initial="hidden" animate={inView ? 'visible' : 'hidden'}>
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-xs font-medium mb-6 uppercase tracking-wide">
            <Zap className="h-3 w-3" /> Audit Speed Insights
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold leading-tight mb-5">
            Identifiez les sites{' '}
            <span className="text-zinc-400">qui ont besoin d&apos;une refonte</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-zinc-400 leading-relaxed mb-8">
            Pour chaque lead avec un site web, LeadHunter lance une analyse Lighthouse complète —
            performance, SEO, compatibilité mobile, technologies détectées — et calcule un score de priorité.
          </motion.p>
          <motion.ul variants={stagger} className="space-y-3">
            {[
              'Performance Core Web Vitals (score 0-100)',
              'Détection HTTPS · Mobile-friendly · CMS',
              'Liste des problèmes avec recommandations',
              'Mise à jour du scoring du lead en temps réel',
            ].map((item) => (
              <motion.li key={item} variants={fadeUp} className="flex items-start gap-3 text-sm text-zinc-400">
                <Check className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
                {item}
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>
      </div>
    </section>
  )
}

/* ─── Audit Mockup (animated) ─────────────────────────────────────────────── */

function AuditMockup({ inView }: { inView: boolean }) {
  const [scores, setScores] = useState({ perf: 0, seo: 0, access: 0, bp: 0 })
  const [showIssues, setShowIssues] = useState(false)
  const [issueCount, setIssueCount] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    if (!inView || started.current) return
    started.current = true

    const animate = () => {
      setScores({ perf: 0, seo: 0, access: 0, bp: 0 })
      setShowIssues(false)
      setIssueCount(0)

      setTimeout(() => {
        setScores({ perf: 18, seo: 42, access: 55, bp: 67 })
        setTimeout(() => {
          setShowIssues(true)
          let n = 0
          const t = setInterval(() => { n++; setIssueCount(n); if (n >= 3) { clearInterval(t); setTimeout(() => { started.current = false; animate() }, 5000) } }, 400)
        }, 1200)
      }, 600)
    }
    animate()
  }, [inView])

  const BAR_ITEMS = [
    { label: 'Performance', value: scores.perf, color: scores.perf < 50 ? 'bg-red-500' : 'bg-amber-500' },
    { label: 'SEO', value: scores.seo, color: scores.seo < 50 ? 'bg-red-500' : 'bg-amber-500' },
    { label: 'Accessibilité', value: scores.access, color: scores.access < 50 ? 'bg-orange-500' : 'bg-amber-500' },
    { label: 'Bonnes pratiques', value: scores.bp, color: scores.bp < 50 ? 'bg-orange-500' : 'bg-emerald-500' },
  ]

  const ISSUES = [
    { icon: Shield, label: 'Pas de HTTPS', sev: 'critical' },
    { icon: Smartphone, label: 'Non optimisé mobile', sev: 'critical' },
    { icon: AlertTriangle, label: 'Performance 18/100', sev: 'warning' },
  ]

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/80 overflow-hidden shadow-2xl shadow-black/50">
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/[0.06] bg-zinc-950/50">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
        <span className="ml-3 text-[11px] text-zinc-500 flex items-center gap-1.5">
          <Globe className="h-3 w-3" /> www.boulangerie-martin.fr — Audit en cours
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Scores */}
        <div className="space-y-2.5">
          {BAR_ITEMS.map(({ label, value, color }) => (
            <div key={label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-400">{label}</span>
                <span className={`font-mono font-bold ${value < 50 ? 'text-red-400' : 'text-emerald-400'}`}>{value}</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${color} rounded-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${value}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Tech badges */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-white/[0.05] flex items-center gap-1">
            <Shield className="h-2.5 w-2.5 text-red-400" /> HTTP
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-white/[0.05] flex items-center gap-1">
            <Smartphone className="h-2.5 w-2.5 text-red-400" /> Non mobile
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-white/[0.05]">
            WordPress 5.2
          </span>
        </div>

        {/* Issues — fixed min-height prevents layout shift */}
        <div className="min-h-[140px]">
          {showIssues && (
            <div className="space-y-1.5 pt-1 border-t border-white/[0.06]">
              <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide">Problèmes détectés</p>
              {ISSUES.slice(0, issueCount).map(({ icon: Icon, label, sev }, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex items-center gap-2 text-xs p-2 rounded-lg ${
                    sev === 'critical' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                  }`}
                >
                  <Icon className="h-3 w-3 shrink-0" />
                  {label}
                  <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                    sev === 'critical' ? 'bg-red-500/20' : 'bg-amber-500/20'
                  }`}>{sev}</span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Pipeline Section ────────────────────────────────────────────────────── */

function PipelineSection() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  const COLUMNS = [
    { label: 'Nouveau', color: 'text-zinc-400', dot: 'bg-zinc-500', leads: ['Boulangerie Martin', 'SOS Plombier'] },
    { label: 'Contacté', color: 'text-blue-400', dot: 'bg-blue-500', leads: ['Au Pain Doré'] },
    { label: 'RDV', color: 'text-amber-400', dot: 'bg-amber-500', leads: ['Artisan Blé'] },
    { label: 'Gagné ✓', color: 'text-emerald-400', dot: 'bg-emerald-500', leads: ['La Fournée'] },
  ]

  return (
    <section ref={ref} className="py-28 max-w-6xl mx-auto px-4 sm:px-6">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <motion.div variants={stagger} initial="hidden" animate={inView ? 'visible' : 'hidden'}>
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium mb-6 uppercase tracking-wide">
            <KanbanSquare className="h-3 w-3" /> Pipeline CRM
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold leading-tight mb-5">
            Suivez chaque lead de la{' '}
            <span className="text-zinc-400">détection au closing</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-zinc-400 leading-relaxed mb-8">
            Pipeline Kanban intégré avec 6 étapes : Nouveau · Contacté · RDV · Proposition · Gagné · Perdu.
            Notes, historique de contact et export XLSX inclus.
          </motion.p>
          <motion.ul variants={stagger} className="space-y-3">
            {[
              'Pipeline visuel Nouveau → Gagné en un glisser-déposer',
              'Notes et timeline par lead',
              'Export XLSX pour vos outils CRM existants (Pro)',
              'Scoring mis à jour automatiquement après chaque audit',
            ].map((item) => (
              <motion.li key={item} variants={fadeUp} className="flex items-start gap-3 text-sm text-zinc-400">
                <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                {item}
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>

        {/* Pipeline mockup */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
        >
          <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/80 overflow-hidden shadow-2xl shadow-black/50">
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/[0.06] bg-zinc-950/50">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
              <span className="ml-3 text-[11px] text-zinc-500">Pipeline CRM — Boulangeries Paris</span>
            </div>
            <div className="p-4 grid grid-cols-4 gap-2">
              {COLUMNS.map(({ label, color, dot, leads }, ci) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.2 + ci * 0.1, duration: 0.4 }}
                  className="space-y-2"
                >
                  <div className={`flex items-center gap-1.5 text-[10px] font-medium ${color}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                    {label}
                  </div>
                  {leads.map((name, li) => (
                    <motion.div
                      key={name}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={inView ? { opacity: 1, scale: 1 } : {}}
                      transition={{ delay: 0.4 + ci * 0.1 + li * 0.08, duration: 0.3 }}
                      className="bg-zinc-800/60 border border-white/[0.05] rounded-lg p-2"
                    >
                      <p className="text-[10px] font-medium text-white leading-tight">{name}</p>
                      <p className="text-[9px] text-zinc-500 mt-0.5">Paris 15e</p>
                    </motion.div>
                  ))}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* ─── Pricing ─────────────────────────────────────────────────────────────── */

const FREE_FEATURES = [
  { label: '3 scans / mois', ok: true },
  { label: '10 leads par scan', ok: true },
  { label: 'Scoring Chaud / Tiède / Froid', ok: true },
  { label: 'Pipeline CRM Kanban', ok: true },
  { label: 'Audit Core Web Vitals', ok: false },
  { label: 'Export XLSX', ok: false },
]

const PRO_FEATURES = [
  'Scans illimités',
  'Jusqu\'à 60 leads par scan',
  'Scoring Chaud / Tiède / Froid',
  'Pipeline CRM Kanban',
  'Audit Core Web Vitals (Speed Insights)',
  'Export XLSX',
  'Support prioritaire',
]

function Pricing() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="pricing" ref={ref} className="py-28 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-amber-500/5 blur-[100px]" />
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <motion.div variants={stagger} initial="hidden" animate={inView ? 'visible' : 'hidden'} className="text-center mb-14">
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold mb-4">
            Tarifs simples et transparents
          </motion.h2>
          <motion.p variants={fadeUp} className="text-zinc-400 text-lg">
            Commencez gratuitement, passez en Pro quand vous êtes prêt.
          </motion.p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="grid sm:grid-cols-2 gap-5"
        >
          {/* Free */}
          <motion.div
            variants={fadeUp}
            className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 p-8 flex flex-col"
          >
            <div className="mb-8">
              <p className="text-zinc-400 text-sm font-medium mb-2">Gratuit</p>
              <p className="text-5xl font-bold">0€<span className="text-lg font-normal text-zinc-500">/mois</span></p>
              <p className="text-xs text-zinc-500 mt-1.5">Pour découvrir l&apos;outil</p>
            </div>
            <ul className="space-y-3 flex-1 mb-8">
              {FREE_FEATURES.map(({ label, ok }) => (
                <li key={label} className="flex items-center gap-2.5 text-sm">
                  {ok
                    ? <Check className="h-4 w-4 text-amber-400 shrink-0" />
                    : <X className="h-4 w-4 text-zinc-700 shrink-0" />
                  }
                  <span className={ok ? 'text-zinc-300' : 'text-zinc-600'}>{label}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/login"
              className="text-center py-3 rounded-xl text-sm font-medium border border-white/10 text-zinc-300 hover:border-white/20 hover:text-white transition-all"
            >
              Commencer gratuitement
            </Link>
          </motion.div>

          {/* Pro */}
          <motion.div
            variants={fadeUp}
            className="relative rounded-2xl border border-amber-500/40 bg-gradient-to-b from-amber-500/[0.07] to-transparent p-8 flex flex-col"
          >
            <div className="absolute -top-3 left-6">
              <span className="bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                Populaire
              </span>
            </div>
            <div className="mb-8">
              <p className="text-zinc-400 text-sm font-medium mb-2">Pro</p>
              <p className="text-5xl font-bold">29€<span className="text-lg font-normal text-zinc-500">/mois</span></p>
              <p className="text-xs text-zinc-500 mt-1.5">Sans engagement · Annulable à tout moment</p>
            </div>
            <ul className="space-y-3 flex-1 mb-8">
              {PRO_FEATURES.map((label) => (
                <li key={label} className="flex items-center gap-2.5 text-sm text-zinc-300">
                  <Check className="h-4 w-4 text-amber-400 shrink-0" />
                  {label}
                </li>
              ))}
            </ul>
            <Link
              href="/login"
              className="text-center py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90 transition-opacity"
            >
              Passer à Pro
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

/* ─── Final CTA ───────────────────────────────────────────────────────────── */

function FinalCTA() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <motion.section
      ref={ref}
      variants={stagger}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      className="py-24 text-center px-4 border-t border-white/[0.06]"
    >
      <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold mb-4">
        Prêt à trouver vos prochains clients ?
      </motion.h2>
      <motion.p variants={fadeUp} className="text-zinc-400 text-lg mb-10">
        Commencez avec 3 scans gratuits — aucune carte bancaire requise.
      </motion.p>
      <motion.div variants={fadeUp}>
        <Link
          href="/login"
          className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-lg hover:opacity-90 transition-opacity shadow-xl shadow-amber-900/30"
        >
          Créer mon compte gratuitement
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </Link>
        <p className="text-xs text-zinc-600 mt-4">3 scans gratuits · Sans carte bancaire · Sans engagement</p>
      </motion.div>
    </motion.section>
  )
}

/* ─── Footer ──────────────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="border-t border-white/[0.06] py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
            <Target className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-sm">Lead<span className="text-amber-400">Hunter</span></span>
          <span className="text-zinc-600 text-sm ml-2">— Prospection locale automatique</span>
        </div>
        <nav className="flex items-center gap-5 text-sm text-zinc-600">
          <Link href="/login" className="hover:text-white transition-colors">Connexion</Link>
          <a href="#scanner" className="hover:text-white transition-colors">Fonctionnalités</a>
          <a href="#pricing" className="hover:text-white transition-colors">Tarifs</a>
        </nav>
      </div>
    </footer>
  )
}

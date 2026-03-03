'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, useInView, animate } from 'framer-motion'
import {
  Target,
  MapPin,
  Zap,
  Globe,
  KanbanSquare,
  Download,
  Database,
  ArrowRight,
  Check,
  Star,
} from 'lucide-react'

/* ─── Animation helpers ──────────────────────────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

function AnimatedCounter({
  target,
  decimals = 0,
  suffix = '',
}: {
  target: number
  decimals?: number
  suffix?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!inView) return
    const ctrl = animate(0, target, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) =>
        setValue(decimals ? Math.round(v * 10) / 10 : Math.round(v)),
    })
    return ctrl.stop
  }, [inView, target, decimals])

  return (
    <span ref={ref}>
      {decimals ? value.toFixed(decimals) : value.toLocaleString('fr-FR')}
      {suffix}
    </span>
  )
}

/* ─── LandingPage ────────────────────────────────────────────────────────── */

export function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navbar />
      <Hero />
      <StatsBar />
      <Features />
      <HowItWorks />
      <Pricing />
      <Testimonials />
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
      className="sticky top-0 z-50 bg-white/85 backdrop-blur-xl border-b border-zinc-200"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
            <Target className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-zinc-900">
            Lead<span className="text-amber-500">Hunter</span>
          </span>
        </div>
        <nav className="hidden sm:flex items-center gap-6 text-sm text-zinc-600">
          <a href="#features" className="hover:text-zinc-900 transition-colors">Fonctionnalités</a>
          <a href="#pricing" className="hover:text-zinc-900 transition-colors">Tarifs</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            Se connecter
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90 transition-opacity"
          >
            Commencer gratuitement
          </Link>
        </div>
      </div>
    </motion.header>
  )
}

/* ─── Hero ────────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center">
      {/* Animated background blobs */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-0 left-1/4 w-72 h-72 rounded-full bg-amber-400/20 blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-10 right-1/4 w-56 h-56 rounded-full bg-orange-400/15 blur-3xl"
          animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
        />
      </div>

      <motion.div variants={stagger} initial="hidden" animate="visible">
        <motion.div
          variants={fadeUp}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 backdrop-blur border border-amber-200/60 text-amber-700 text-sm font-medium mb-6"
        >
          <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
          500+ professionnels font confiance à LeadHunter
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="text-4xl sm:text-5xl lg:text-6xl font-bold text-zinc-900 leading-tight mb-6"
        >
          Trouvez vos prochains clients{' '}
          <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
            avant vos concurrents
          </span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="text-lg sm:text-xl text-zinc-500 max-w-2xl mx-auto mb-10"
        >
          Scannez n'importe quelle zone, détectez les entreprises sans site web ou avec un site
          obsolète, et générez des leads qualifiés avec un scoring automatique Chaud&nbsp;/&nbsp;Tiède&nbsp;/&nbsp;Froid.
        </motion.p>

        <motion.div
          variants={fadeUp}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/login"
            className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-base hover:opacity-90 transition-opacity shadow-lg shadow-amber-200"
          >
            Commencer gratuitement
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <a
            href="#how-it-works"
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-zinc-200 bg-white text-zinc-700 font-medium text-base hover:bg-zinc-50 transition-colors"
          >
            Voir comment ça marche
          </a>
        </motion.div>
      </motion.div>
    </section>
  )
}

/* ─── Stats Bar ───────────────────────────────────────────────────────────── */

const STATS = [
  { target: 50000, suffix: '+', label: 'entreprises scannées' },
  { target: 12000, suffix: '+', label: 'leads générés' },
  { target: 4.8, decimals: 1, suffix: '/5', label: 'satisfaction client' },
]

function StatsBar() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
      className="border-y border-zinc-200 bg-white"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-3 gap-4 text-center">
        {STATS.map((s) => (
          <div key={s.label}>
            <p className="text-2xl sm:text-3xl font-bold text-zinc-900">
              <AnimatedCounter target={s.target} decimals={s.decimals} suffix={s.suffix} />
            </p>
            <p className="text-sm text-zinc-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </motion.section>
  )
}

/* ─── Features ────────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: MapPin,
    title: 'Scanner de zone',
    description: `Scannez n'importe quelle ville ou code postal en quelques secondes. Prospection locale ultra-ciblée.`,
  },
  {
    icon: Zap,
    title: 'Scoring automatique',
    description: 'Leads classés Chaud / Tiède / Froid selon leur potentiel commercial. Concentrez-vous sur ce qui compte.',
  },
  {
    icon: Globe,
    title: 'Audit de site web',
    description: 'Performance, compatibilité mobile, SEO et technologies analysés automatiquement pour chaque prospect.',
  },
  {
    icon: KanbanSquare,
    title: 'Pipeline CRM',
    description: 'Kanban visuel de la prospection à la signature. Suivez chaque opportunité sans friction.',
  },
  {
    icon: Download,
    title: 'Export CSV',
    description: `Exportez vos leads qualifiés et alimentez directement vos campagnes d'emailing ou cold calling.`,
  },
  {
    icon: Database,
    title: 'Multi-sources',
    description: 'Aggrégation Google Maps et annuaires professionnels pour une couverture maximale.',
  },
]

function Features() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="features" ref={ref} className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate={inView ? 'visible' : 'hidden'}
        className="text-center mb-12"
      >
        <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-zinc-900 mb-4">
          Tout ce qu'il faut pour une prospection automatique efficace
        </motion.h2>
        <motion.p variants={fadeUp} className="text-zinc-500 text-lg max-w-xl mx-auto">
          De la détection au closing, LeadHunter couvre l'intégralité de votre cycle de prospection.
        </motion.p>
      </motion.div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate={inView ? 'visible' : 'hidden'}
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <motion.div
            key={title}
            variants={fadeUp}
            whileHover={{ y: -5, boxShadow: '0 16px 40px -12px rgba(0,0,0,0.10)' }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className="bg-white rounded-2xl border border-zinc-200 p-6 hover:bg-zinc-50/60 transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 mb-4">
              <Icon className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-semibold text-zinc-900 mb-2">{title}</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">{description}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}

/* ─── How it works ────────────────────────────────────────────────────────── */

const STEPS = [
  {
    number: '01',
    title: 'Définissez votre zone de prospection',
    description: `Entrez une ville, un code postal ou tirez une zone sur la carte. Choisissez votre secteur d'activité cible.`,
  },
  {
    number: '02',
    title: 'LeadHunter scanne et score automatiquement',
    description: `En quelques secondes, des centaines d'entreprises sont analysées, évaluées et classées selon leur potentiel.`,
  },
  {
    number: '03',
    title: 'Contactez les meilleurs leads depuis votre CRM',
    description: `Accédez à votre pipeline, exportez en CSV ou lancez vos campagnes directement depuis l'interface.`,
  },
]

function HowItWorks() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="how-it-works" ref={ref} className="relative bg-zinc-950 py-20 overflow-hidden">
      {/* Static glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />
      {/* Pulsing orb */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full bg-amber-500/8 blur-2xl pointer-events-none"
        animate={{ scale: [1, 1.35, 1], opacity: [0.25, 0.55, 0.25] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="text-center mb-12"
        >
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Comment ça marche ?
          </motion.h2>
          <motion.p variants={fadeUp} className="text-zinc-400 text-lg max-w-xl mx-auto">
            Trois étapes pour transformer une zone géographique en pipeline de prospects qualifiés.
          </motion.p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="grid gap-8 sm:grid-cols-3"
        >
          {STEPS.map((step) => (
            <motion.div key={step.number} variants={fadeUp} className="text-center">
              <motion.div
                whileHover={{ scale: 1.1, rotate: [-3, 3, 0] }}
                transition={{ duration: 0.35 }}
                className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold text-lg mb-4"
              >
                {step.number}
              </motion.div>
              <h3 className="font-semibold text-white text-lg mb-2">{step.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ─── Pricing ─────────────────────────────────────────────────────────────── */

const PLANS = [
  {
    name: 'Gratuit',
    price: '0€',
    period: '/mois',
    popular: false,
    features: [
      '50 scans / mois',
      '100 leads maximum',
      'Scoring basique',
      'Export CSV basique',
      'Pipeline CRM',
    ],
    cta: 'Commencer gratuitement',
    href: '/login',
    variant: 'outline' as const,
  },
  {
    name: 'Pro',
    price: '29€',
    period: '/mois',
    popular: true,
    features: [
      'Scans illimités',
      'Leads illimités',
      'Audit de site avancé',
      'Alertes automatiques',
      'Export CSV avancé',
      'Support prioritaire',
    ],
    cta: 'Essayer Pro',
    href: '/pricing',
    variant: 'primary' as const,
  },
]

function Pricing() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="pricing" ref={ref} className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate={inView ? 'visible' : 'hidden'}
        className="text-center mb-12"
      >
        <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-zinc-900 mb-4">
          Des tarifs simples et transparents
        </motion.h2>
        <motion.p variants={fadeUp} className="text-zinc-500 text-lg">
          Commencez gratuitement, passez en Pro quand vous êtes prêt.
        </motion.p>
      </motion.div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate={inView ? 'visible' : 'hidden'}
        className="grid gap-6 sm:grid-cols-2 max-w-2xl mx-auto"
      >
        {PLANS.map((plan) => (
          <motion.div
            key={plan.name}
            variants={fadeUp}
            whileHover={{ y: -5 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className={`relative rounded-2xl border p-8 flex flex-col ${
              plan.popular
                ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-400/50 shadow-xl shadow-amber-100/50'
                : 'bg-white border-zinc-200'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Le plus populaire
                </span>
              </div>
            )}

            <div className="mb-6">
              <p className="font-semibold text-zinc-900 text-lg mb-1">{plan.name}</p>
              <p className="text-4xl font-bold text-zinc-900">
                {plan.price}
                <span className="text-base font-normal text-zinc-500">{plan.period}</span>
              </p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {plan.features.map((f, i) => (
                <motion.li
                  key={f}
                  initial={{ opacity: 0, x: -8 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.35 + i * 0.07, duration: 0.3 }}
                  className="flex items-center gap-2 text-sm text-zinc-600"
                >
                  <Check className="h-4 w-4 text-amber-500 shrink-0" />
                  {f}
                </motion.li>
              ))}
            </ul>

            <Link
              href={plan.href}
              className={`w-full text-center py-2.5 rounded-xl font-medium text-sm transition-opacity ${
                plan.variant === 'primary'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90'
                  : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              {plan.cta}
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}

/* ─── Testimonials ────────────────────────────────────────────────────────── */

const TESTIMONIALS = [
  {
    name: 'Marie L.',
    role: 'Freelance web',
    quote: '12 clients trouvés en 2 semaines dans ma région. Le scanner de zone est incroyablement précis.',
    initials: 'ML',
  },
  {
    name: 'Thomas D.',
    role: 'Agence Pixel',
    quote: 'Le scoring nous fait gagner 3h/semaine de qualification. On ne contacte que les leads vraiment chauds.',
    initials: 'TD',
  },
  {
    name: 'Sarah M.',
    role: 'Responsable commercial',
    quote: 'Indispensable pour notre prospection cold email B2B. La qualité des leads est bien supérieure à nos anciens outils.',
    initials: 'SM',
  },
]

function Testimonials() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="bg-zinc-100 py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="text-center mb-12"
        >
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-zinc-900 mb-4">
            Ils ont boosté leur prospection
          </motion.h2>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="grid gap-6 sm:grid-cols-3"
        >
          {TESTIMONIALS.map((t) => (
            <motion.div
              key={t.name}
              variants={fadeUp}
              whileHover={{ y: -5, boxShadow: '0 16px 40px -12px rgba(0,0,0,0.10)' }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="bg-white rounded-2xl border border-zinc-200 p-6"
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={inView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ delay: 0.3 + i * 0.08, type: 'spring', stiffness: 400, damping: 15 }}
                  >
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  </motion.span>
                ))}
              </div>
              <p className="text-zinc-600 text-sm leading-relaxed mb-6">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white text-xs font-bold">
                  {t.initials}
                </div>
                <div>
                  <p className="font-medium text-zinc-900 text-sm">{t.name}</p>
                  <p className="text-xs text-zinc-500">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
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
      className="max-w-6xl mx-auto px-4 sm:px-6 py-20 text-center"
    >
      <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-zinc-900 mb-4">
        Prêt à booster votre prospection ?
      </motion.h2>
      <motion.p variants={fadeUp} className="text-zinc-500 text-lg mb-8">
        Rejoignez 500+ professionnels qui génèrent des leads qualifiés chaque jour.
      </motion.p>
      <motion.div variants={fadeUp}>
        <Link
          href="/login"
          className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-base hover:opacity-90 transition-opacity shadow-lg shadow-amber-200"
        >
          Créer mon compte gratuitement
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
        <p className="text-xs text-zinc-400 mt-3">Sans carte bancaire · Gratuit pour toujours</p>
      </motion.div>
    </motion.section>
  )
}

/* ─── Footer ──────────────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="border-t border-zinc-200/60 bg-white/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
            <Target className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-zinc-900 text-sm">
            Lead<span className="text-amber-500">Hunter</span>
          </span>
          <span className="text-zinc-400 text-sm ml-2">— Prospection automatique pour agences web et commerciaux</span>
        </div>
        <nav className="flex items-center gap-5 text-sm text-zinc-500">
          <Link href="/login" className="hover:text-zinc-900 transition-colors">Connexion</Link>
          <a href="#features" className="hover:text-zinc-900 transition-colors">Fonctionnalités</a>
          <a href="#pricing" className="hover:text-zinc-900 transition-colors">Tarifs</a>
        </nav>
      </div>
    </footer>
  )
}

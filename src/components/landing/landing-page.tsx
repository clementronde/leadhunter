'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
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
  Radar,
  BarChart2,
  Building2,
  X,
} from 'lucide-react'

/* ─── Animation helpers ──────────────────────────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

/* ─── LandingPage ────────────────────────────────────────────────────────── */

export function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navbar />
      <Hero />
      <TrustBar />
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
            Essayer gratuitement
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
          <Radar className="h-3.5 w-3.5" />
          Google Maps · INSEE / Sirene · Scoring automatique
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="text-4xl sm:text-5xl lg:text-6xl font-bold text-zinc-900 leading-tight mb-6"
        >
          Trouvez des clients locaux{' '}
          <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
            qui ont besoin de vous
          </span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="text-lg sm:text-xl text-zinc-500 max-w-2xl mx-auto mb-10"
        >
          Scannez n'importe quelle ville, détectez les entreprises sans site web ou avec un site
          obsolète, et obtenez des leads qualifiés avec un scoring{' '}
          <span className="text-red-500 font-medium">Chaud</span>{' '}·{' '}
          <span className="text-amber-500 font-medium">Tiède</span>{' '}·{' '}
          <span className="text-blue-500 font-medium">Froid</span> automatique.
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

        <motion.p variants={fadeUp} className="text-xs text-zinc-400 mt-4">
          3 scans gratuits · Sans carte bancaire · Sans engagement
        </motion.p>
      </motion.div>
    </section>
  )
}

/* ─── Trust Bar ───────────────────────────────────────────────────────────── */

const TRUST_ITEMS = [
  { icon: Building2, label: '45+ types d\'entreprises supportés' },
  { icon: Database, label: 'Google Maps + INSEE / Sirene' },
  { icon: Zap, label: 'Scoring Chaud / Tiède / Froid' },
  { icon: BarChart2, label: 'Audit Core Web Vitals (Pro)' },
]

function TrustBar() {
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {TRUST_ITEMS.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2 justify-center text-center sm:text-left sm:justify-start">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
              <Icon className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-xs sm:text-sm text-zinc-600 font-medium">{label}</p>
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
    title: 'Scanner Google Maps',
    description: 'Cherchez des restaurants, coiffeurs, plombiers… dans n\'importe quelle ville. Résultats enrichis avec rating, site web et coordonnées.',
    badge: null,
  },
  {
    icon: Database,
    title: 'Scanner INSEE / Sirene',
    description: 'Accédez à la base officielle des entreprises françaises par code postal et activité NAF. Données fiables et à jour.',
    badge: null,
  },
  {
    icon: Zap,
    title: 'Scoring automatique',
    description: 'Chaque lead est classé Chaud / Tiède / Froid selon la présence web, la qualité du site, les avis Google et le potentiel commercial.',
    badge: null,
  },
  {
    icon: Globe,
    title: 'Audit de site web',
    description: 'Performance Core Web Vitals, compatibilité mobile, SEO, technologies détectées — analysés automatiquement pour chaque prospect.',
    badge: 'Pro',
  },
  {
    icon: KanbanSquare,
    title: 'Pipeline CRM Kanban',
    description: 'Suivez vos leads de la découverte à la signature dans un tableau visuel. Nouveau · Contacté · RDV · Proposition · Gagné · Perdu.',
    badge: null,
  },
  {
    icon: Download,
    title: 'Export XLSX',
    description: 'Exportez vos leads qualifiés en Excel et alimentez directement vos campagnes d\'emailing ou outils CRM existants.',
    badge: 'Pro',
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
          Tout ce qu'il faut pour prospecter efficacement
        </motion.h2>
        <motion.p variants={fadeUp} className="text-zinc-500 text-lg max-w-xl mx-auto">
          De la détection au closing, LeadHunter couvre l'intégralité de votre cycle de prospection locale.
        </motion.p>
      </motion.div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate={inView ? 'visible' : 'hidden'}
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {FEATURES.map(({ icon: Icon, title, description, badge }) => (
          <motion.div
            key={title}
            variants={fadeUp}
            whileHover={{ y: -5, boxShadow: '0 16px 40px -12px rgba(0,0,0,0.10)' }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className="relative bg-white rounded-2xl border border-zinc-200 p-6 hover:bg-zinc-50/60 transition-colors"
          >
            {badge && (
              <span className="absolute top-4 right-4 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                {badge}
              </span>
            )}
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
    title: 'Choisissez votre cible',
    description: 'Saisissez un type d\'entreprise (ex : plombiers, restaurants) et une ville ou code postal. Lancez le scan en un clic.',
  },
  {
    number: '02',
    title: 'LeadHunter analyse et classe',
    description: 'Des dizaines d\'entreprises sont détectées, leur site web audité, et chaque lead scoré automatiquement Chaud / Tiède / Froid.',
  },
  {
    number: '03',
    title: 'Contactez depuis votre pipeline',
    description: 'Gérez vos prospects dans le CRM Kanban intégré, exportez en XLSX ou intégrez à vos outils existants.',
  },
]

function HowItWorks() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="how-it-works" ref={ref} className="relative bg-zinc-950 py-20 overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />
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
            Trois étapes pour passer d'une ville à un pipeline de prospects qualifiés.
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

const FREE_FEATURES: { label: string; included: boolean }[] = [
  { label: '3 scans / mois', included: true },
  { label: '10 leads par scan', included: true },
  { label: 'Scoring Chaud / Tiède / Froid', included: true },
  { label: 'Pipeline CRM Kanban', included: true },
  { label: 'Audit Core Web Vitals', included: false },
  { label: 'Export XLSX', included: false },
  { label: 'Support prioritaire', included: false },
]

const PRO_FEATURES_LANDING: { label: string }[] = [
  { label: 'Scans illimités' },
  { label: 'Leads illimités par scan' },
  { label: 'Scoring Chaud / Tiède / Froid' },
  { label: 'Pipeline CRM Kanban' },
  { label: 'Audit Core Web Vitals' },
  { label: 'Export XLSX' },
  { label: 'Support prioritaire' },
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
        {/* Free */}
        <motion.div
          variants={fadeUp}
          whileHover={{ y: -4 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          className="bg-white rounded-2xl border border-zinc-200 p-8 flex flex-col"
        >
          <div className="mb-6">
            <p className="font-semibold text-zinc-900 text-lg mb-1">Gratuit</p>
            <p className="text-4xl font-bold text-zinc-900">
              0€<span className="text-base font-normal text-zinc-500">/mois</span>
            </p>
            <p className="text-xs text-zinc-400 mt-1">Pour découvrir l'outil</p>
          </div>

          <ul className="space-y-3 mb-8 flex-1">
            {FREE_FEATURES.map(({ label, included }) => (
              <li key={label} className="flex items-center gap-2 text-sm">
                {included ? (
                  <Check className="h-4 w-4 text-amber-500 shrink-0" />
                ) : (
                  <X className="h-4 w-4 text-zinc-300 shrink-0" />
                )}
                <span className={included ? 'text-zinc-700' : 'text-zinc-400'}>{label}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/login"
            className="w-full text-center py-2.5 rounded-xl font-medium text-sm border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Commencer gratuitement
          </Link>
        </motion.div>

        {/* Pro */}
        <motion.div
          variants={fadeUp}
          whileHover={{ y: -4 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          className="relative bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-2xl border border-amber-400/50 shadow-xl shadow-amber-100/50 p-8 flex flex-col"
        >
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
              Le plus populaire
            </span>
          </div>

          <div className="mb-6">
            <p className="font-semibold text-zinc-900 text-lg mb-1">Pro</p>
            <p className="text-4xl font-bold text-zinc-900">
              29€<span className="text-base font-normal text-zinc-500">/mois</span>
            </p>
            <p className="text-xs text-zinc-400 mt-1">Sans engagement · Annulable à tout moment</p>
          </div>

          <ul className="space-y-3 mb-8 flex-1">
            {PRO_FEATURES_LANDING.map(({ label }) => (
              <motion.li
                key={label}
                initial={{ opacity: 0, x: -8 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-2 text-sm text-zinc-700"
              >
                <Check className="h-4 w-4 text-amber-500 shrink-0" />
                {label}
              </motion.li>
            ))}
          </ul>

          <Link
            href="/login"
            className="w-full text-center py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90 transition-opacity"
          >
            Essayer Pro
          </Link>
        </motion.div>
      </motion.div>
    </section>
  )
}

/* ─── Testimonials ────────────────────────────────────────────────────────── */

const TESTIMONIALS = [
  {
    name: 'Marie L.',
    role: 'Freelance développement web',
    quote: 'En 3 scans j\'avais déjà identifié 30 restaurants sans site dans ma ville. J\'ai signé 2 clients en moins d\'une semaine.',
    initials: 'ML',
  },
  {
    name: 'Thomas D.',
    role: 'Agence digitale',
    quote: 'Le scoring chaud/tiède/froid nous fait gagner un temps fou. On contacte uniquement les leads vraiment prioritaires.',
    initials: 'TD',
  },
  {
    name: 'Sarah M.',
    role: 'Commerciale indépendante',
    quote: 'Le pipeline CRM intégré est parfait pour mon usage. Plus besoin de jongler entre plusieurs outils pour ma prospection locale.',
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
        Prêt à trouver vos prochains clients ?
      </motion.h2>
      <motion.p variants={fadeUp} className="text-zinc-500 text-lg mb-8">
        Commencez avec 3 scans gratuits — aucune carte bancaire requise.
      </motion.p>
      <motion.div variants={fadeUp}>
        <Link
          href="/login"
          className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-base hover:opacity-90 transition-opacity shadow-lg shadow-amber-200"
        >
          Créer mon compte gratuitement
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
        <p className="text-xs text-zinc-400 mt-3">3 scans gratuits · Sans carte bancaire · Sans engagement</p>
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
          <span className="text-zinc-400 text-sm ml-2">— Prospection locale automatique</span>
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

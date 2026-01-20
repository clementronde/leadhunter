# 🎯 LeadHunter

**Outil de prospection automatisé pour agences web**

LeadHunter permet d'identifier les entreprises locales qui n'ont pas de site web ou dont le site nécessite une refonte, et de gérer le pipeline de prospection.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8)

## ✨ Fonctionnalités

- **🔍 Scanner de zone** - Recherche d'entreprises par ville/quartier
- **📊 Dashboard** - Vue d'ensemble des leads et statistiques
- **🎯 Scoring automatique** - Priorisation des prospects selon leur potentiel
- **📱 Audit de sites** - Analyse performance, mobile, SSL, technologies
- **📋 Pipeline CRM** - Suivi du cycle de vente (Kanban)
- **📤 Export CSV** - Export des leads pour emailing

## 🚀 Démarrage rapide

### 1. Cloner et installer

```bash
git clone <votre-repo>
cd leadhunter
npm install
```

### 2. Configuration

Copier le fichier d'environnement :

```bash
cp .env.example .env.local
```

**Mode développement (sans base de données) :**
L'application fonctionne avec des données mockées par défaut.

**Avec Supabase (recommandé pour production) :**

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Exécuter le script SQL `supabase-schema.sql` dans l'éditeur SQL
3. Ajouter les credentials dans `.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 3. Lancer le serveur

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## 📁 Structure du projet

```
src/
├── app/                    # Pages Next.js (App Router)
│   ├── page.tsx           # Dashboard
│   ├── leads/             # Liste et détail des leads
│   ├── scanner/           # Scanner de zone
│   ├── pipeline/          # Vue Kanban CRM
│   └── settings/          # Configuration
├── components/
│   ├── ui/                # Composants réutilisables
│   ├── layout/            # Sidebar, Header
│   ├── dashboard/         # Stats, Charts
│   └── leads/             # LeadCard, Table, Filters
├── lib/
│   ├── api.ts             # Services API
│   ├── store.ts           # État global (Zustand)
│   ├── utils.ts           # Utilitaires
│   └── mock-data.ts       # Données de test
└── types/
    └── index.ts           # Types TypeScript
```

## 🛠️ Stack technique

| Composant | Technologie |
|-----------|-------------|
| Framework | Next.js 16 (App Router) |
| UI | Tailwind CSS + shadcn-style |
| State | Zustand |
| Database | Supabase (PostgreSQL) |
| Charts | Recharts |
| Icons | Lucide React |

## 📊 Algorithme de scoring

Les leads sont scorés de 0 à 100 selon :

| Critère | Impact |
|---------|--------|
| Pas de site web | +45 points |
| Performance < 50 | +15-25 points |
| Pas de HTTPS | +15 points |
| Non mobile-friendly | +20 points |
| Technologies obsolètes | +15 points |
| Mauvais SEO | +10-20 points |

**Priorité :**
- 🔥 Hot : Score ≥ 75
- 🌤️ Warm : Score 50-74
- ❄️ Cold : Score < 50

## 🚢 Déploiement

### Vercel (recommandé)

1. Push le code sur GitHub
2. Importer sur [vercel.com](https://vercel.com)
3. Ajouter les variables d'environnement
4. Déployer !

```bash
npx vercel
```

## 📝 Roadmap

- [ ] Intégration Google Places API pour le scan
- [ ] Audit automatique avec PageSpeed Insights
- [ ] Capture de screenshots automatique
- [ ] Génération de rapports PDF
- [ ] Notifications par email
- [ ] API Sirene (INSEE) pour données entreprises

## 📄 Licence

Projet privé - Artichaud Studio

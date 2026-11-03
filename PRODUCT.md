# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: freelances and small web agencies (1–5 people) looking for local businesses that have no website, or a website worth rebuilding, and who then contact those businesses themselves. They prospect in short sessions between client work, usually on a laptop, and need to go from "a city + a trade" to "a call or email sent" without learning a CRM.

## Product Purpose

LeadHunter scans a zone (trade + city) through Google Maps / Places, enriches each business (phone, website, rating, reviews, INSEE/Sirene data), audits existing websites (performance, mobile, HTTPS, CMS) and scores every lead hot / warm / cold. The user then triages, contacts, follows up and tracks the deal in a pipeline. Success: a user finds and contacts qualified prospects within minutes of signing up, and comes back daily to the follow-up list.

## Positioning

Built for the web-agency pitch specifically: the lead score is driven by the state of the business's web presence (no site, obsolete site, failing audit), so the list is already sorted by "who needs a website", and the audit gives the user a concrete argument for the first call.

## Operating Context

- Daily loop: Today (follow-ups due) → Triage (keyboard sort of new leads) → Lead detail (audit, contact, notes) → Outreach (email campaigns, inbox).
- Acquisition loop: Scanner (trade + city, Google Maps) → Leads list → Map.
- Pipeline kanban: Nouveau · Contacté · RDV · Proposition · Gagné · Perdu.
- Priority screens for UX polish (user-confirmed): Scanner, Leads + lead detail, Today + Triage.

## Capabilities and Constraints

- Stack: Next.js 16 (App Router), React 19, Tailwind CSS 4, Supabase auth/data, Stripe billing, framer-motion, lucide-react, recharts, leaflet.
- Plans: Free (0 €/month: 3 scans/month, 10 leads per scan, scoring, pipeline; no audit, no XLSX export) and Pro (29 €/month, no commitment: unlimited scans, up to 60 leads per scan, Core Web Vitals audit, XLSX export, priority support).
- Interface language: French.

## Brand Commitments

- Name: LeadHunter.
- The current amber/orange visual identity (zinc dark UI, amber accents, landing with animated product mockups) is the one the user prefers. A restrained Linear-style redesign (near-black, hairlines, single sober amber, Geist) was built and rejected by the user on 2026-11-03 as reading "AI slop"; do not re-propose it. Any visual change starts from the existing look and is validated with the user on a concrete example before being rolled out.
- DESIGN.md (Linear analysis) is a reference document only, not the applied design system.

## Evidence on Hand

None yet: no customers, testimonials, logos or usage figures. Never fabricate them. Proof on the landing page comes from demonstrating the product itself (scan, audit, scoring, pipeline) with demo data clearly framed as an example.

## Product Principles

1. From a city and a trade to a first contact in minutes: every screen points to the next action.
2. The web presence is the argument: surface "no site / site to rebuild / audit failures" first, everywhere.
3. Daily habit over dashboard: Today and Triage are the home of a returning user.
4. Keyboard-fast for repeat work, obvious for first use.

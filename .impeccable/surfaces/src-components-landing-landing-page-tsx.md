---
version: 1
slug: "src-components-landing-landing-page-tsx"
primary_target: "src/components/landing/landing-page.tsx"
related_targets: ["src/app/page.tsx"]
---

# Landing (/, unauthenticated)

Mode: Persuade. Audience: freelances and small web agencies. Action: launch a scan (trade + city) → sign-up → Scanner prefilled. Proof: the product itself, demo data labeled as example; no invented customers or figures. Build path: code-led (no image generation available).

## Direction contract

THESIS: The list arrives already sorted by "who needs a website". The page refuses the centred-headline + glow + three-feature-cards template; it is a working scan form feeding a real-looking scored result list.

OWN-WORLD: DESIGN.md (Linear structure) pinned: #08090a canvas, charcoal panels #0f1011, 1px hairlines #23252a, Geist at 600 with tight negative tracking, Geist Mono for scores/phones/URLs only. One sober amber (#e2a336) for the primary action, selection and the score; red/blue only as hot/cold state. No gradients, glows, particles, shimmer.

STORY: Visitor sees a scan form, types a trade and a city, the example panel re-labels itself; understands score = web presence + activity (real weights from scoreProspect); sees the audit as the first-call argument; sees the daily loop (Today, keyboard triage); compares Free vs Pro; scans.

FIRST VIEWPORT: Left-aligned headline (≈64px) and one-line subhead on the left third; the working scan form (Activité · Ville · Scanner) under it; right/below, a wide product panel listing 6 example leads with score, presence status and reason. Primary action = the form's "Scanner" button.

FORM: Product-UI-led page in the pinned Linear world, scan form as hero. Signature interaction: typing in the hero form re-labels the example result list live. seed:c7cea8d352221e74 (roll recorded; user-pinned direction stays binding)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

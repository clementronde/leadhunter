---
name: LeadHunter
description: "Near-black prospecting workbench: charcoal panels, 1px hairlines, Geist, and one sober amber that marks the action, the selection and the score."
colors:
  canvas: "#08090a"
  sidebar-well: "#0b0c0d"
  surface-1: "#0f1011"
  surface-2: "#141516"
  surface-3: "#18191a"
  track: "#1a1b1e"
  hairline: "#23252a"
  hairline-strong: "#34343a"
  ink: "#f7f8f8"
  ink-muted: "#d0d6e0"
  ink-subtle: "#8a8f98"
  ink-tertiary: "#62666d"
  accent: "#e2a336"
  accent-hover: "#ebb757"
  accent-text: "#e6b04f"
  accent-soft-text: "#ebc27a"
  on-accent: "#1a1204"
  state-hot: "oklch(70.4% 0.191 22.216)"
  state-hot-text: "oklch(80.8% 0.114 19.571)"
  state-cold: "oklch(74.6% 0.16 232.661)"
  state-cold-text: "oklch(82.8% 0.111 230.318)"
  state-success: "oklch(76.5% 0.177 163.223)"
  state-success-text: "oklch(84.5% 0.143 164.978)"
  state-meeting-text: "oklch(81.1% 0.111 293.571)"
  destructive: "oklch(57.7% 0.245 27.325)"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "64px"
    fontWeight: 600
    lineHeight: 1.04
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  figure:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  page-title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  lede:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.625
  body-lg:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.625
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.43
  ui:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
  meta:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.33
  micro:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.45
  score-lg:
    fontFamily: "Geist Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "32px"
    fontWeight: 500
    lineHeight: 1
    fontFeature: "\"tnum\""
  mono:
    fontFamily: "Geist Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
    fontFeature: "\"tnum\""
rounded:
  xs: "4px"
  sm: "5px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
spacing:
  "1": "4px"
  "1.5": "6px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  section: "96px"
  section-lg: "112px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0 14px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.on-accent}"
  button-secondary:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.lg}"
    padding: "0 14px"
    height: "36px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.ink}"
  button-outline:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.lg}"
    padding: "0 14px"
    height: "36px"
  button-ghost:
    textColor: "{colors.ink-subtle}"
    rounded: "{rounded.lg}"
    padding: "0 14px"
    height: "36px"
  button-sm:
    typography: "{typography.ui}"
    padding: "0 12px"
    height: "32px"
  input:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
    height: "36px"
  card:
    backgroundColor: "{colors.surface-1}"
    rounded: "{rounded.xl}"
    padding: "20px"
  showcase-panel:
    backgroundColor: "{colors.surface-1}"
    rounded: "{rounded.2xl}"
    padding: "20px"
  badge:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.micro}"
    rounded: "{rounded.md}"
    padding: "2px 6px"
  nav-item:
    textColor: "{colors.ink-subtle}"
    typography: "{typography.ui}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "32px"
  nav-item-active:
    textColor: "{colors.ink}"
  kbd:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.md}"
    padding: "0 6px"
    height: "24px"
---

# Design System: LeadHunter

## Overview

**Creative North Star: "The Sorted Ledger"**

LeadHunter is a dark workbench where the list arrives already sorted. Everything sits on a near-black canvas, in charcoal panels separated by 1px hairlines; depth comes from stepping the surface a shade lighter, not from shadow or colour. Type is Geist at 600 with tight negative tracking for headings and a dense 11/12/13/14px ladder for the working UI; Geist Mono is reserved for the things you compare or dial: scores, phone numbers, URLs, keys.

Colour carries meaning, not mood. One sober amber marks the primary action, the current selection and the score; red, amber and sky speak lead temperature (hot, warm, cold); emerald speaks success. Nothing else is chromatic. The marketing page is product-UI-led: its proof is a working scan form feeding a real-looking scored result list, framed in the same panels the app uses.

Lineage: the structure (canvas, charcoal ladder, hairlines, product-UI marketing) descends from Linear; the accent, fonts and state vocabulary are LeadHunter's own.

**Key Characteristics:**
- Near-black canvas, three-step charcoal surface ladder, 1px hairlines.
- One amber accent, dark ink on amber fills; never a second warm hue (orange is remapped onto amber).
- Temperature colours (red / amber / sky) and success (emerald) only as state, at 10% tint with 25% border.
- Geist 600 with negative tracking for headings; Geist Mono with tabular numerals for scores and data.
- Flat: no gradients, glows or atmospheric light. Motion is short and state-driven.

## Colors

A near-monochrome cool charcoal ladder with a single sober amber and a strict state vocabulary.

### Primary
- **Sober Amber** (accent): the fill of the one primary action per view, the caret, focus rings (at 75% alpha), text selection (at 28%), the active nav icon and the brand tile. Hover lifts to **Lit Amber** (accent-hover).
- **Amber Ink** (accent-text): amber as text on dark: the Pro plan label, links, the large score numeral on the landing example, the "Plan Pro" line in the sidebar.
- **Burnt Ink** (on-accent): the only text colour allowed on an amber fill. White on amber is never used.

### State (not accents)
- **Hot Red** (state-hot / state-hot-text): hot leads (score dot, "Chaud" chip), failing audit metrics (< 50), critical issues, form errors.
- **Warm Amber** (accent / accent-soft-text): warm leads ("Tiède"), mid audit metrics (50–89), warnings, and the "Devis envoyé" status.
- **Cold Sky** (state-cold / state-cold-text): cold leads ("Froid"), info severity, and the "Contacté" status.
- **Success Emerald** (state-success / state-success-text): audit metrics ≥ 90, "Gagné", success badges and the success button.
- **Meeting Violet** (state-meeting-text): only the "RDV" pipeline status.
- **Destructive Red** (destructive): destructive button fill only.

Status chips follow one recipe from the shared map: 10% tint of the hue, 300-step text, 25% border. "Nouveau" is neutral grey; "Perdu" is dimmed grey (5% tint, tertiary text).

### Neutral
- **Canvas Black** (canvas): page background, sticky headers at 85–95% with blur.
- **Sidebar Well** (sidebar-well): the app sidebar only, a hair darker than surface-1.
- **Charcoal 1 / 2 / 3** (surface-1, surface-2, surface-3): panels and inputs / raised controls, popovers, kbd / hover and skeletons.
- **Track** (track): empty progress and score-bar tracks.
- **Hairline / Strong Hairline** (hairline, hairline-strong): every border and divider; strong for form shells, outline buttons, popovers and kbd keys. Row dividers inside panels use hairline at 60%.
- **Ink ladder** (ink, ink-muted, ink-subtle, ink-tertiary): headings and values / secondary copy and button labels / meta, placeholders, column heads / group labels and disabled marks.

### Named Rules
**The One Amber Rule.** Amber is the only hue that is not a state. It marks the primary action, the selection and the score, nothing decorative. One amber fill per view.

**The Temperature Rule.** Red means hot, amber means warm, sky means cold, emerald means success. A hue used outside its meaning is a bug, not a variation.

**The Tint Recipe Rule.** Coloured chips and badges are 10% tint, 25% border, light text. Never a solid saturated chip.

## Typography

**Display Font:** Geist (with ui-sans-serif, system-ui, Segoe UI)
**Body Font:** Geist
**Label/Mono Font:** Geist Mono (with ui-monospace, SF Mono, Menlo)

**Character:** One neutral grotesque doing all the talking, tightened at size; a mono that appears only where a number or identifier is read and compared. Stylistic sets ss01 and cv11 are on globally; headings balance, paragraphs wrap pretty.

### Hierarchy
- **Display** (600, 64px desktop / 56px tablet / 40px mobile, 1.04, -0.035em): the landing hero headline only, left-aligned, max ~720px.
- **Headline** (600, 40px / 32px mobile, 1.1, -0.03em): landing section heads (closing head steps to 44px).
- **Figure** (600, 28px, -0.02em): prices and headline numbers.
- **Page Title** (600, 24px, -0.02em): standalone pages such as login.
- **Lede** (400, 17px, 1.625, ink-subtle): the one-line hero subhead, max 640px.
- **Body Large** (400, 16px, 1.625, ink-subtle): marketing section copy, max ~520px.
- **Title** (600, 15px, -0.01em): card titles, the app header h1, the wordmark.
- **Body** (400, 14px): default app text, buttons, inputs, table cells.
- **UI** (500, 13px): nav items, small buttons, secondary lines, captions.
- **Meta** (400, 12px): field labels, timestamps, "why this score", counts.
- **Micro** (500, 11px): badges, column heads, nav group labels, plan line.
- **Score** (Geist Mono 500, 32px, tabular): the selected lead's score; rows use Mono 13–14px.

### Named Rules
**The Mono-Is-Data Rule.** Geist Mono appears only on scores, phone numbers, URLs/domains, counts and keyboard keys, always with tabular numerals. Never on prose or headings.

**The Sentence-Case Label Rule.** Labels and section markers are sentence case at 11–12px in ink-subtle or ink-tertiary. No uppercase, no letter-spacing on labels.

## Layout

The app is a fixed left sidebar (240px expanded, 60px collapsed, 100ms colour / 200ms width transitions) over a content column capped at 1100px with 16px padding (24px from md). Each screen opens with a 56px sticky header (title 15px, subtitle 13px, actions right); on mobile a 48px top bar replaces the sidebar, which slides in over a 60% black scrim.

The landing uses a 1200px container (16px / 24px gutters), a 56px sticky nav, and sections separated by a single top hairline with 96px vertical padding (112px from sm). Two-column bands split 5:7 or 7:5; the hero is left-aligned with the product panel spanning full width beneath it.

Rhythm is a 4px grid: 8px and 12px gaps inside components, 16–24px between blocks, 20px inside panels. Control heights: 32px (small, nav items), 36px (default buttons, inputs), 40px (large, hero submit).

## Elevation & Depth

Flat by default. Depth is tonal: canvas, then charcoal 1, 2, 3, each separated by a hairline. Panels carry only a 1px inner top highlight. Real shadows exist in two places: floating layers (popovers, menus, palette) and the single hero showcase panel on the landing.

### Shadow Vocabulary
- **Panel highlight** (`box-shadow: inset 0 1px 0 rgba(255,255,255,0.03)`; 0.04 on landing panels): the top edge of every card.
- **Floating layer** (`box-shadow: 0 16px 40px -12px rgba(0,0,0,0.7)`): popovers, notification panel, menus.
- **Showcase drop** (`box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 30px 80px -40px rgba(0,0,0,0.9)`): the landing results panel only.
- **Key cap** (`box-shadow: 0 1px 0 #34343a`): kbd keys.

### Named Rules
**The No-Light Rule.** Nothing glows. No coloured shadows, no radial light behind content, no gradient fills or gradient text. Depth is a surface step and a hairline.

## Shapes

Gently rounded, never pill-shaped except dots, avatars and progress tracks. Controls are 8px; chips, nav items and kbd keys 6px; app cards 12px; landing showcase panels 16px; the brand tile and checkbox squares 5px. Every container has a 1px hairline border. Status is marked with a 6px dot or a tinted chip, never with a coloured edge.

## Components

### Buttons
Quiet and solid; one amber per view.
- **Shape:** gently rounded (8px), 36px tall, 14px horizontal padding, 14px/500 label, 16px icons with an 8px gap.
- **Primary:** amber fill, burnt-ink label; hover to lit amber; 1px press-down on active.
- **Secondary / Outline:** charcoal 2 (hairline) or charcoal 1 (strong hairline) with muted-ink label; hover to charcoal 3 and full ink.
- **Ghost:** subtle ink, hover adds a 5% white wash. **Link:** amber-ink, underline on hover.
- **Success / Destructive:** emerald-600 or red-600 fill with white label, for confirm/delete only.
- **States:** 150ms ease-out on colour; focus ring 2px amber at 75% with 2px offset; disabled 40% opacity; loading shows an inline spinner.

### Chips
- **Style:** 6px radius, 11px/500, 2px 6px padding, 1px border. Neutral on charcoal 2; coloured chips follow the Tint Recipe.
- **Temperature chip:** a 6px dot plus the label (Chaud / Tiède / Froid) in the 300-step text.
- **"Exemple" marker:** neutral outline chip that labels every piece of demo data.

### Cards / Containers
- **Corner Style:** 12px in the app, 16px for landing showcase panels.
- **Background:** charcoal 1.
- **Shadow Strategy:** panel highlight only (see Elevation).
- **Border:** 1px hairline; internal rows divided by hairline at 60%; toolbars and footers split by a full hairline.
- **Internal Padding:** 20px; header rows 12px × 20px.

### Inputs / Fields
- **Style:** 36px, charcoal 1, 1px hairline, 8px radius, 14px text, ink-subtle placeholder; hover to strong hairline.
- **Focus:** border to amber at 60% plus a 2px amber ring at 20%; amber caret.
- **Error / Disabled:** red border and ring with a 12px red message beneath; disabled at 50%.
- **Scan form (signature):** a single strong-hairline shell (12px radius, 6px inset) holding labelled fields (12px label left, 15px input) split by a 1px divider, ending in the 40px amber submit. Focused fields get a 3% white wash and 1px amber ring.

### Navigation
- **Sidebar items:** 32px, 6px radius, 13px/500, 16px icon. Rest: subtle ink, grey icon. Hover: 4% white wash, near-white text. Active: 7% white wash, white text, amber icon. Group labels 11px tertiary ink, sentence case.
- **Command search:** charcoal row with a mono "Ctrl K" key.
- **Landing nav:** 13px links in subtle ink, hover to white; sticky with canvas at 85% and blur.

### Scored Result Row (signature)
A dense grid row: temperature dot, business name (14px), web-presence reason (13px subtle), reviews (13px tabular), a 40px amber score bar whose opacity rises with the score, and the Mono score. Selected row takes a 4.5% white wash; hover 2.5%. The detail column shows the large Mono score, temperature label and "Pourquoi ce score" reasons as small grey-dot bullets.

### Keyboard Keys
24px min, 6px radius, charcoal 2, strong hairline, Mono 11px, key-cap shadow. Used wherever a shortcut is taught (triage, palette, landing).

### Motion
- **App:** state transitions 100–250ms, ease-out or `cubic-bezier(0.16, 1, 0.3, 1)`. Page enter is a 180ms fade with a 4px rise. Triage card exits in 200ms.
- **Landing:** one authored moment: the example result list staggers in (400ms per row, 60ms apart, after 150ms) and re-sorts with layout animation (300ms) as the visitor types; the detail column cross-fades in 180ms. Nothing else animates on scroll.
- **Reduced motion:** honoured globally (durations clamped to 0.01ms, smooth scroll off) and in framer-motion (`useReducedMotion` disables initial, layout and exit animation).

## Do's and Don'ts

### Do:
- **Do** keep one amber fill per view, with burnt-ink (#1a1204) text on it.
- **Do** build depth with the surface ladder (canvas → surface-1 → surface-2 → surface-3) and 1px hairlines.
- **Do** use red / amber / sky strictly for hot / warm / cold, emerald for success, via the 10% tint / 25% border recipe.
- **Do** set scores, phones, URLs and keys in Geist Mono with tabular numerals.
- **Do** label demo data as "Exemple" and prove the product with the product itself.
- **Do** keep app transitions between 100ms and 250ms and honour prefers-reduced-motion.

### Don't:
- **Don't** use gradient fills, gradient text or radial light washes behind content.
- **Don't** use glow blobs, coloured shadows, particles or shimmer badges.
- **Don't** use emoji or text glyphs (✓ ✕) as icons; use lucide icons at 14–16px.
- **Don't** set uppercase, letter-spaced eyebrows or kickers above headings.
- **Don't** mark state with a coloured side border on cards, rows or alerts; use a dot or a tinted chip.
- **Don't** introduce a second accent hue (orange, blue, purple) or put white text on amber.
- **Don't** use Geist Mono for prose or headings.

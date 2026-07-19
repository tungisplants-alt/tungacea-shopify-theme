# Tungacea Shopify Theme — Refinement Pass (Tungacea-v1)

## Context
Dawn-based Shopify Online Store 2.0 Liquid theme. Premium dark editorial botanical
brand (rare Anthuriums / collector). Pure Liquid/CSS refinement — no rebuild, no
deploy/publish. Approved logo + Rakkan lockup and archive system preserved.

## Refinement goals (this pass)
Make the site feel less flat-black, more luxurious/nuanced via charcoal/graphite
tonal layering + restrained (moderate) oxblood accents. Premium branded password page.

## What was implemented (2026-07-19)
- **Palette (config/settings_data.json)**: refined saved swatches — scheme-1 #0A0A0A
  (base), scheme-2 #151517 (charcoal), scheme-3 #6E1C28 (oxblood surface),
  scheme-4 #1F1E22 (graphite), scheme-5 #4E141E (deep wine). Primary buttons on dark
  schemes now oxblood w/ ivory label. Instagram link set to instagram.com/tungacea.
- **tungacea.css**: appended REFINEMENT PASS — panel sheen for charcoal/graphite
  (raised layers), toned radial crown on red panels, oxblood eyebrow ticks, secondary
  button hover → oxblood, primary hover → deeper wine, oxblood focus rings, oxblood
  sale badge, footer oxblood crown + social hover. Header/Rakkan lockup rules untouched.
- **Homepage tonal layering (templates/index.json)**: brand_statement → graphite
  (scheme-4), community → charcoal (scheme-2). Structure/content unchanged.
- **Password page**: rebuilt main-password-header.liquid to show the approved
  logo+Rakkan lockup (same classes/geometry, scaled as one unit) instead of plain text;
  email-signup-banner.liquid now falls back to new hero asset, renders eyebrow +
  Instagram(@tungacea) + collectors note; password.json copy = "Private access" /
  "Enter the Tungacea collection." / collector supporting copy. tungacea.css now loaded
  on password layout for brand consistency.
- **New asset**: assets/tungacea-password.jpg (attached dark anthurium hero).

## Verification
- JSON + {% schema %} validated; CSS brace-balance checked.
- Static mocks (real CSS + assets) screenshotted: lockup relationship preserved
  (white mark primary, red Rakkan at lower-left base, bottom edges aligned); premium
  password hero; visible black→graphite→charcoal→wine tonal steps.
- NOTE: No live Shopify store in this container, so runtime testing_agent is N/A for a
  pure Liquid theme; verified via mocks/validation instead.

## Assets used on password page
- tungacea-logo.png (white mark) + tungacea-rakkan.png (red seal) = approved lockup.
- tungacea-password.jpg (new anthurium hero, from attachment IMG_8548).

## No deploy / publish performed. Changes are on branch Tungacea-v1 only.

## Password-page refinement pass 2 (2026-06 — current branch Tungacea-v1)
User choices: ~30% slimmer header; entry button copy = "Enter with access code";
default minimal footer (hide duplicate Instagram icon, keep Shopify/admin line quiet).
Files changed:
- **assets/section-password.css**:
  - Top header slimmed ~30%: padding 2.4/3.2rem → 1.6/2/2.4rem across mobile/tablet/desktop.
  - Brand lockup scaled down as ONE unit (relationship preserved): scale 1.72/2 → 1.2 (mobile) /
    1.3 (tablet ≥750) / 1.4 (desktop ≥990). Frame dims always = 91×80 base logo box × scale,
    so white-mark/red-Rakkan baseline alignment is identical. Header height ~224px → ~128/144/160px.
  - Top password link finer (1.05rem, 0.24em tracking, lighter tone).
  - Secondary meta row gets a quiet oxblood hairline divider (tonal nuance, controlled red).
  - Hero composition: object-position center 26–30% + deeper lower gradient wash so the
    Anthurium + red venation stay the hero and the pot/substrate reads as shadow.
  - Form: zero-radius underline field, graphite hover, oxblood focus (already present).
  - Footer: `.list-social` hidden (Instagram already shown as @tungacea in hero), Shopify/admin
    captions made very quiet; tighter padding.
- **locales/en.default.json**: password_page copy → English "access code" set
  (heading, button "Enter with access code", placeholder, error). Locale STRUCTURE untouched
  (multilingual EU capability intact; only en.default values refined).
Verified via static mock (real CSS + assets) screenshotted desktop 1920 — slimmer refined
header, lockup preserved, oxblood accents restrained, hero elegant, footer minimal. No publish.

## Refinement pass 3 — mobile header, divider, language selector (2026-07-19, Tungacea-v1)
User choices: refine existing selectors in place (keep native behaviour); keep the
Shopify Markets country selector as-is (refine LANGUAGE only); validate via theme-check
(no live store). Files changed:
- **snippets/language-localization.liquid** (rewritten): reusable native selector.
  Uses `localization.available_languages` + native `{% form 'localization' %}` (no fake
  URLs, preserves current page). Deutsch→English pinned first, subtle divider, then all
  other PUBLISHED languages alphabetical by endonym. Compact ISO trigger (EN/DE) + chevron,
  visually-hidden "Select language / Current language". aria-current + oxblood checkmark on
  active; small oxblood dot + "Preferred" label on de/en. `compact` + `show_label` params.
- **sections/main-password-header.liquid**: added `.password-header__utils` wrapping the
  language form + subtle vertical divider + access-code control on one line; wrapped
  access-code text in `.password-link__label`.
- **layout/password.liquid**: loads `localization-form.js` so the selector works on password.
- **assets/localization-form.js**: null-guarded `.menu-drawer` and `this.header` so the
  native selector runs on the password page (no header-wrapper / drawer there). Storefront
  behaviour unchanged.
- **sections/header.liquid**: desktop language selector → `compact: true` (still before search).
- **snippets/header-drawer.liquid**: mobile drawer language selector → `show_label: true`
  ("Language" row, below nav / above social).
- **assets/section-password.css**: (1) mobile header padding 1.6rem→1rem vertical (~9% shorter,
  logo/Rakkan untouched); (2) oxblood divider constrained to `--tungacea-signup-width` (44rem)
  = exact email-field width, shared var on field + `.email-signup-banner__meta`; (3) utility-area
  layout + dropdown positioning (absolute, in-viewport); (4) mobile access-code collapses to
  padlock icon (label kept for screen readers) so lang code + control stay one line, no clip.
- **assets/tungacea.css**: shared `.tungacea-lang` premium styling (graphite panel, off-white
  text, oxblood active/preferred, caret rotation, drawer row, reduced-motion). Applies on
  storefront + drawer + password.
- **locales/en.default.json + de.json**: added localization keys `preferred`, `select_language`,
  `current_language`, `close_language_menu` (EN + DE). Other locales fall back to en.default.
Verified: @shopify/theme-check-node → 0 Liquid/JSON/schema errors, 0 offenses in touched files.
Only published Shopify languages render (dynamic). No deploy/publish. NOTE: publishing the 20
EU languages is a merchant action in Shopify admin (Settings→Languages / Translate & Adapt);
the theme reflects them automatically.


## Backlog / next
- P1: optional refined empty-state for collection/search pages.
- P2: dedicated password-page CSS split if it grows; A/B copy variants.
- P2: mirror the "access code" wording into other EU locale files (de/fr/etc.) when desired.

# Tungacea Shopify Theme — PRD / Change Log

## Repo
- GitHub: tungisplants-alt/tungacea-shopify-theme, branch **Tungacea-v1** (Dawn-based).
- No standalone app. No backend. No deploy/publish. Theme files only.

## Task (2026-07-18): English default + dedicated Private Archive
Two focused changes, preserving the approved dark/oxblood/serif "botanical" identity and
without touching checkout, cart, products, inventory, accounts or payments.

### Part 1 — English default storefront
- Existing custom storefront content (index.json homepage sections, specimen block schema
  defaults) was already English; verified no German umlauts/German UI wording anywhere
  outside `locales/`.
- New custom Tungacea UI text routed through Shopify locale keys + Liquid `t` filter
  (never hard-coded in Liquid). English is the default; matching German added.
- Language selector preserved (Dawn-native `localization-form`): header + footer,
  `enable_language_selector`/`enable_country_selector` intact in header-group/footer-group.
  Only shows when >1 language (Dawn behaviour). Country/market selection kept separate.
- Navigation left under Shopify menus — no hard-coded menu.

### Part 2 — Dedicated Private Archive
- `templates/page.archive.json` — new page template (merchant assigns to a Page).
- `sections/main-private-archive.liquid` — editorial archive section: eyebrow/heading/intro
  (locale defaults, merchant-overridable), manual **specimen blocks** (image, secondary image,
  name, Plant ID, genetics, parentage, breeder/source, year, archive status, notes, optional
  link + label). Empty fields hidden. Optional archive **collection** picker (empty by default,
  never auto Current Drop / main sales). Lightweight JS status filters (no reload, no libs,
  progressive enhancement — hidden until JS wires them, all specimens visible without JS).
- `assets/section-private-archive.css` — alternating image-first editorial rows, subtle status
  labels, reduced-motion support.
- Homepage "archive" rich-text CTA fixed: added optional **Archive page** picker +
  Archive button label; button now links to the selected page (default label "Enter the archive"
  via locale), and outputs nothing if no page selected. Old `shopify://collections/all` link removed.

## Files changed
- Added: templates/page.archive.json, sections/main-private-archive.liquid,
  assets/section-private-archive.css
- Edited: sections/rich-text.liquid, templates/index.json,
  locales/en.default.json, locales/de.json, locales/en.default.schema.json, locales/de.schema.json

## Validation
- All JSON strict-valid; all `{% schema %}` blocks parse; every JSON-referenced section exists.
- theme-check (node): 0 offenses on new/edited files (remaining offenses are pre-existing Dawn).
- Cannot render Liquid locally (no Shopify store); verification is static only.

## Backlog / next
- Merchant setup steps: create a Page, assign the `page.archive` template, add specimen blocks,
  then point the homepage "Archive" section's Archive page picker at that page.
- Optional: add real specimen photography (kept out per "no stock imagery").

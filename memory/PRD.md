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

## Task (2026-07-19): Product-card IMAGE click fix
Bug: clicking/tapping a product-card image did nothing (only the title link worked),
on storefront + editor. Applies to all sales cards via the single `snippets/card-product.liquid`.

### Root cause (two compounding CSS issues)
1. The media anchor (`.card__media > a.full-unstyled-link`) wraps `.media`, which is
   `position:absolute` (component-card.css). With no in-flow child, the anchor (`display:block`)
   collapsed to **0 height** → no clickable/tappable area over the image.
2. On media cards the inner `.card__content` (holding the badge) is painted **on top** of the
   absolutely-positioned media and, being a plain div, **intercepted every click** over the image.
   Dawn's fallback whole-card overlay (`.card__heading a::after`) was already disabled in
   tungacea.css (`display:none`), so nothing else made the image clickable.

### Fix (CSS only — `assets/tungacea.css`, scoped to `.product-card-wrapper`)
- Size the existing media anchor to fill `.card__media` (`position:absolute; inset:0; z-index:1`)
  → full image is a real link to the same product URL as the title. Added `:focus-visible` outline.
- `.card--media .card__inner > .card__content { pointer-events:none }` so clicks pass through the
  inner overlay to the media link, while the badge stays visible (scoped to media cards so
  text-only card titles keep working).
- `.card__badge { pointer-events:none }` — decorative badges never block the media link.
- No Liquid change (anchor + aria-label already present). Hover images, ratios, badges, Quick Add,
  View specimen buttons and title link all preserved. Private Archive/product/cart/nav untouched.

### Validation
- Browser (Playwright) test against the actual theme CSS + real card DOM: image center + all four
  corners + over-badge all hit the product link and navigate on click/tap; Quick Add and title link
  remain independently clickable; badge still visible. No live Shopify store available; DOM/CSS
  behaviour verified in an isolated harness using the real stylesheets.
- Only file changed: `assets/tungacea.css` (+34 lines).

## Backlog / next
- Merchant setup steps: create a Page, assign the `page.archive` template, add specimen blocks,
  then point the homepage "Archive" section's Archive page picker at that page.
- Optional: add real specimen photography (kept out per "no stock imagery").

# Tungacea — Shopify Online Store 2.0 Theme (Dawn-based)

## Goal
Transform a Dawn theme into a dark, editorial, photography-first "private botanical archive"
for Tungacea (rare/dark Anthuriums, Germany). Pure Liquid theme edit. No standalone app,
no backend, no deploy/publish. Save to current GitHub branch (Tungacea-v1).

## Brand assets (baked as defaults, still editable in Theme Editor)
- Logo = silver seedling → assets/tungacea-logo.png
- Rakkan seal = red "TA" seal → assets/tungacea-rakkan.png (setting: rakkan_image / rakkan_width)
- Hero photo → assets/tungacea-hero.jpg (image-banner fallback)
- About photo → assets/tungacea-about.jpg (image-with-text fallback)
- Archive photo (unused by default per "use sparingly") → assets/tungacea-archive.jpg

## Design system
- Palette: bg #0A0A0A, secondary #121212, surface #181818, text #F2EEE8, muted #B9B2A9,
  oxblood accent #7A1F2D / deep #5B1621. Set in config/settings_data.json color schemes 1–5.
- Type: headings serif Cormorant (cormorant_n4), body sans Jost (jost_n4), heading_scale 132.
- Sharp (0 radius) editorial buttons/pills, hairline borders, no shadows, film-grain overlay.

## Implemented (2026-06)
- config/settings_data.json: dark schemes, serif+sans fonts, card/button/media styling, cart drawer.
- config/settings_schema.json: added Rakkan seal image_picker + width settings under Logo group.
- assets/tungacea.css: full dark editorial layer (header, hero, cards, collection, product,
  specimen dossier, newsletter, footer, mobile).
- templates/index.json: editorial homepage order — hero, current_drop, brand_statement,
  featured_genetics, about, archive (oxblood teaser), community, newsletter.
- sections/header.liquid: default logo fallback to baked asset.
- sections/image-banner.liquid & image-with-text.liquid: baked hero/about photo fallbacks.
- snippets/rakkan-seal.liquid: fallback to bundled Rakkan asset.
- sections/main-product.liquid: specimen record now reads metafields
  (custom.plant_id, genetics, parentage, breeder_source, rarity, care, photo_conditions,
  sale_type, shipping_note) with manual fallbacks + photo-condition/sale tags. Empty rows hidden.

## Preserved
Product/cart/search/account/collection/localization/checkout, app blocks, valid JSON templates,
index.json integrity, Theme Editor compatibility, SEO, structured data, accessibility.

## Notes / Backlog
- Theme Check binary not available in this container (no Ruby); JSON + liquid tag balance validated manually.
- Visual QA requires a Shopify store preview / Theme Editor (cannot render Liquid locally here).
- Featured collections (Current Drop / Selected Genetics) left as empty editable collection pickers.
- P1: optional header toggle to hide Rakkan on desktop; Instagram section image wiring.

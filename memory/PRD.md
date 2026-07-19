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

## Backlog / next
- P1: optional refined empty-state for collection/search pages.
- P2: dedicated password-page CSS split if it grows; A/B copy variants.

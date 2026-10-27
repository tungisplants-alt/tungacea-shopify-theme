# Tungacea — Interactive 360° Plant Viewer (password page)

## Problem statement
Replace ONLY the static plant hero visual on the existing Tungacea Shopify
password page with an interactive drag-to-rotate 360° video viewer of a dark
Anthurium. Preserve everything else (logo, red Rakkan seal, email signup,
access-code/password, header, language selector, editorial layout). Do not
redesign the page. Theme = Dawn 15.5, heavily customized. Branch: Tungacea-v1.

## Architecture (existing, reused)
- Hero lives in `sections/email-signup-banner.liquid` (enabled only on the
  `password` template), rendered inside `.banner__media` behind `.banner__content`.
- Layout: `layout/password.liquid`; header: `sections/main-password-header.liquid`
  (logo + Rakkan lockup, password modal, language selector). None of these changed.
- Brand styling: `tungacea.css`, `section-password.css` (near-black #0A0A0A,
  Cormorant/Jost fonts, oxblood #6E1C28 accents). Unchanged.

## What was implemented (this session)
Interactive 360° viewer scoped entirely to a new component; original static
hero preserved as the `{% else %}` fallback path.

Files changed:
- NEW `assets/anthurium-360.mp4` — re-encoded from upload: 1080x1920, H.264, no
  audio, keyframe every 0.2s (`-g 6`) for smooth scrubbing, +faststart, ~6.4MB.
- NEW `assets/anthurium-360-poster.jpg` — first-frame poster (no layout shift/blank).
- NEW `snippets/password-360-viewer.liquid` — video + hint markup, enqueues CSS/JS.
- NEW `assets/password-360-viewer.css` — scoped styles; `object-fit: contain`
  (no leaf cropping), pointer routing on `.banner.tng-360-active`, hint microcopy.
- NEW `assets/password-360-viewer.js` — vanilla Pointer Events engine.
- MOD `sections/email-signup-banner.liquid` — render viewer when enabled + add
  `tng-360-active` class + theme-editor settings (additive; original img kept).
- MOD `templates/password.json` — enable viewer defaults.

## Interaction design
- Pointer Events (mouse/pen/touch unified). Maps horizontal drag → `video.currentTime`.
  ~1 viewer width ≈ 1 full rotation, `drag_sensitivity` multiplier. Wraps (mod duration).
- rAF-throttled seeks. Mouse locks horizontal immediately; touch/pen uses axis
  detection (rotate only when |dx| > |dy|) + `touch-action: pan-y` so vertical
  page scroll is never blocked.
- Keyboard ArrowLeft/ArrowRight when focused; ARIA slider role + aria-valuenow.
- Optional slow idle auto-rotation (~85s/rotation), stops on interaction, resumes
  after ~4.5s idle. Disabled under prefers-reduced-motion.
- Fallback: if seeking can't be confirmed (watchdog) → seamless muted autoplay loop;
  reduced-motion → static poster/first frame. Never a frozen/broken viewer.
- Never shows native controls / play button; always muted; playsinline.

## Theme-editor settings (email-signup-banner)
enable_360_viewer, video (optional override), video_poster, show_drag_hint,
drag_hint_text, drag_sensitivity, enable_idle_rotation.

## Test results (local faithful replica: real theme CSS + DOM; WebM used only so
Playwright's codec-less Chromium can decode — production uses the H.264 MP4)
- Desktop mouse/trackpad drag both directions OK; wrapping end<->start OK
- Touch horizontal rotates OK; vertical gesture ignored (scroll preserved) OK
- Keyboard arrows OK; hint fades after first interaction OK; no text selection OK
- muted OK, no controls OK, playsinline OK, object-fit contain (full plant) OK
- 0 console errors; Theme Check: 0 offenses in changed files (14 pre-existing,
  all in unrelated files)
- Not testable without a live store (unchanged, uses theme's own forms):
  email signup submit, storefront password submit, language/country selector.

## Known characteristic
With `object-fit: contain` (requested, to avoid cropping leaves), the video's own
dark-grey studio backdrop reads as a soft vertical panel against the pure-black
page. This is video content, not a CSS frame/border.

## Delivery
NOT saved to GitHub yet — awaiting user review, then user uses "Save to GitHub"
to commit to branch `Tungacea-v1`. Do not modify/publish the live theme.

## Backlog / next
- P1: If user wants fully seamless (no grey panel), consider a subtle CSS mask,
  a pure-black-background video, or cover with tuned object-position.
- P2: Optional poster preload via <link rel=preload> if TTFB matters.

## Update — per-breakpoint video framing (this session)
Tuned the ambient hero video so the Anthurium is the intentional focal subject
(layout/typography/forms unchanged). Added `assets/password-hero-video.css`
(enqueued only when the video renders), scoped to
`.password-main .banner__media .tungacea-hero-video`:
- object-fit: cover + restrained per-breakpoint zoom (transform: scale) + object-position.
- Desktop ≥1100: `scale(1.55) translate(9%,-13%)` — plant enlarged, lifted, centre-right;
  red leaf dominant, left text clear.
- Tablet 750–1099: `scale(1.4) translate(7%,-11%)`.
- Mobile ≤749: `object-position:66% 72%; scale(1.95)` — plant in lower-centre/right,
  dark foliage behind text (legible), red venation visible, moody dark gradient above.
- Poster regenerated from the video's true first frame (`anthurium-360-poster.jpg`)
  so poster and playback share identical framing (no jump). Reuses the existing
  `.banner::after` gradient wash for legibility; no new overlays/frames.
- Verified full loop at t=0/12 for 1440/1024/390: plant focal & recognisable,
  text/form readable, autoplay muted loop playsinline active, no layout shift,
  0 console errors, Theme Check 0 offenses in changed files. NOT saved to GitHub.
- Note: video is 9:16 in a very tall mobile hero, so a dark editorial gradient
  remains above the plant on mobile (physical aspect limit); reads as intentional.
The interactive drag-to-rotate concept was rejected. Fully reverted the hero to
the original approved static-image composition and replaced ONLY the image with
an autoplaying muted looping background video (drop-in replacement).
- DELETED: snippets/password-360-viewer.liquid, assets/password-360-viewer.css,
  assets/password-360-viewer.js, assets/anthurium-360-poster.jpg (all unused now).
- `sections/email-signup-banner.liquid`: removed `tng-360-active` class + all 360
  schema settings. Media block now: custom image → else ambient `<video>` (when
  `enable_hero_video`) → else original default `<img>`. The video reuses the exact
  `banner__media-image tungacea-default-media` classes, so `object-fit: cover`,
  `object-position: center 30%/26%` and the `.banner::after` gradient wash are
  identical to the approved static hero. Attributes: autoplay muted loop
  playsinline preload=auto, no controls, aria-hidden, tabindex=-1,
  poster=`tungacea-password.jpg` (the original approved image = seamless fallback).
- NEW `assets/password-hero-video.js` (~40 lines): enforces muted, retries play(),
  pauses on `visibilitychange`. No drag/scrub/pointer/keyboard/idle logic remains.
- `templates/password.json`: 360 keys removed; `enable_hero_video: true`.
- Kept asset: `assets/anthurium-360.mp4` (still the video source).
- Verified 1440/1024/390: full-bleed background video behind editorial text,
  autoplay muted loop, no controls, playsinline, mobile has NO separate portrait
  block (text/form in original position), no horizontal overflow, Theme Check 0
  offenses in changed files. NOT saved to GitHub.
Rebalanced the desktop hero into a centered two-column layout (scoped to
`.banner.email-signup-banner.tng-360-active`); interactive drag engine unchanged.
- Container `width:min(90vw,1280px); margin-inline:auto`, vertically centred via
  responsive `min-height` (no fixed vh that clips), generous padding-block.
- ≥1100px: two columns — text ~44% (max 52rem, readable) + viewer column, gap
  clamp(60–100px). Viewer height clamp(56–68rem / 66vh) with `aspect-ratio:9/16`
  so the plant is height-driven (up to ~382×680) and vertically centred; the old
  full-bleed overlay wash (`.banner::after`) is disabled in this mode.
- 900–1099px: tighter two-column (smaller gap/viewer).
- <900px: stacked — viewer on top (~82vw, max 43rem), editorial text/form below;
  vertical scroll + horizontal drag preserved.
- Removed the `media` class from the stage (base.css `.media > *` was forcing
  top:0/height:100% on the hint); hint now lives INSIDE the stage so it centres
  on the plant at its lower portion.
- Note: video is 9:16, so with `object-fit:contain` + max-height ~680px the plant
  width is capped ~382px (physical limit without cropping). Verified: drag both
  directions, wrapping, hint fade, 0 console errors, Theme Check clean.
- Screenshots at 1440 / 1024 / 390 shown to user for approval. NOT saved to GitHub.


---

# Phase 2A — Private Archive Teaser (homepage)
Branch: `feature/homepage-archive-teaser` (from origin/Tungacea-v1). Do NOT touch Tungacea-v1 directly.

## Goal
Replace homepage "Featured genetics" product grid with a distinctive, non-purchasable
Private Archive teaser: dark editorial botanical archive, restrained oxblood accent,
asymmetric ~58% image / 42% content, quiet luxury, thin archive hairline/frame.
No prices, availability, quick-add, badges, product grids or fake products.

## Implemented (2026-06)
- NEW `sections/private-archive-teaser.liquid` — reusable section, self-contained scoped CSS.
  Editable in Theme Editor: image, image-frame toggle, eyebrow/archive reference, heading (+size),
  body, button label, button link (button hidden cleanly when link blank), desktop layout direction
  (image left/right), image crop position, color scheme, top/bottom padding.
  Reuses theme tokens: `color-{scheme}` classes, `.page-width`, `.button`/`.button--secondary`,
  Cormorant/Jost fonts, `--color-foreground/background/button`, `--media-radius`.
  A11y: semantic <figure>/<h2>, image alt with heading fallback, bundled `tungacea-archive.jpg`
  default image, keyboard focus via theme button, entrance animation wrapped in
  `@media (prefers-reduced-motion: no-preference)`. No external libs, no hardcoded shop URLs.
- MODIFIED `templates/index.json`:
  - `featured_genetics` (featured-collection) -> `private_archive_teaser`.
  - Removed duplicate `archive` rich-text section (it repeated the new teaser).
  - Order: hero, current_drop, brand_statement, private_archive_teaser, about, community, newsletter.
- Local preview harnesses only (NOT theme files, safe to delete): `preview-archive.html`,
  `preview-archive-mobile.html`.

## Verified
- Theme Check (via @shopify/cli@3.80.7): new section + index.json = 0 offenses.
  13 pre-existing offenses (4 errors/9 warnings) all in untouched files.
- Hero, Current Drop, Specimen/Product cards + metafields, password/header/product/collection/
  private-archive pages, branding assets: untouched (git diff confirms only index.json changed).

## Delivery status
- NOT committed / pushed. Awaiting user feedback on preview before any refinement.

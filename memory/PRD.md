# Tungacea Shopify Theme (Dawn 15.5.0)

## Task (2026-06): Homepage 404 routing/template investigation
Store homepage reportedly rendered "404 – Seite nicht gefunden".

### Findings
- templates/index.json is a VALID Shopify homepage template.
- It references: image-banner, featured-collection (x2), rich-text, image-with-text, multicolumn, newsletter. All exist in /sections. No reference to main-404.
- templates/404.json is the only template using main-404 (correct).
- All block types used in index.json are defined in the referenced section schemas.
- Shopify Theme Check: 0 errors (8 pre-existing Dawn style warnings, unrelated).
- Git: index.json in this repo was never 404-pointing; last change (9c2b502) built the Tungacea homepage.

### Conclusion
Repository index.json required no repair; it is already correct. The reported 404 originated from the live store's published index template rendering main-404 (edited outside git). Publishing/syncing this branch's valid index.json resolves it. No deploy performed.

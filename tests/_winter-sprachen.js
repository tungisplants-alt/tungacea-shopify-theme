// Rendert das AUSGELIEFERTE Snippet mit LEEREN Feldern — genau der Zustand,
// den Tung im Theme-Editor jetzt hergestellt hat — gegen die ECHTEN
// Sprachdateien, einmal deutsch, einmal englisch.
const fs = require('fs');
const path = require('path');
const { Liquid } = require('liquidjs');

const THEME = path.join(__dirname, '..');
const strip = (s) => s.replace(/^\s*\/\*[\s\S]*?\*\//, '');
const LOC = {
  de: JSON.parse(strip(fs.readFileSync(path.join(THEME, 'locales/de.json'), 'utf8'))),
  en: JSON.parse(strip(fs.readFileSync(path.join(THEME, 'locales/en.default.json'), 'utf8'))),
};

let locale = 'de';
const engine = new Liquid({ root: path.join(THEME, 'snippets'), extname: '.liquid' });
engine.registerFilter('asset_url', (v) => '/assets/' + v);
engine.registerFilter('stylesheet_tag', () => '');
engine.registerFilter('money', (v) => (Number(v) / 100).toFixed(2).replace('.', ',') + ' €');
engine.registerFilter('t', (key) => {
  const hit = String(key).split('.').reduce((o, k) => (o == null ? undefined : o[k]), LOC[locale]);
  if (hit === undefined) throw new Error('FEHLENDER Schluessel [' + locale + ']: ' + key);
  return hit;
});

// Leere Felder: genau der gespeicherte Zustand aus templates/product.json.
const block = {
  id: 'vorschau', shopify_attributes: '',
  settings: {
    produkt: { selected_or_first_available_variant: { id: 1, price: 390, available: true } },
    ueberschrift: '', hinweis: '',
  },
};

(async () => {
  const css = ['base.css', 'tungacea.css', 'section-main-product.css', 'component-winter-pack.css']
    .map((f) => fs.readFileSync(path.join(THEME, 'assets', f), 'utf8')).join('\n');

  const sp = [];
  for (const [loc, titel] of [['de', 'Deutsche Seite'], ['en', 'Englische Seite']]) {
    locale = loc;
    const zeile = await engine.renderFile('winter-pack', { block });
    sp.push(`<div class="sp"><p class="note">${titel}</p><div class="spalte">
      <fieldset class="v"><legend>SAMEN</legend>
        <span class="chip chip--an">2</span><span class="chip">4</span><span class="chip">6</span></fieldset>
      ${zeile}
      <button type="button" class="kauf">${loc === 'de' ? 'IN DEN WARENKORB LEGEN' : 'ADD TO CART'}</button>
    </div></div>`);
  }

  fs.writeFileSync(path.join(__dirname, 'winter-sprachen.html'),
`<!doctype html><html lang="de"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Cormorant:wght@400&family=Jost:wght@400&display=swap" rel="stylesheet">
<style>${css}</style><style>
html{font-size:62.5%}
body{background:#0a0a0a;color:#f2eee8;font-family:'Jost',sans-serif;margin:0;font-size:1.6rem}
.shell{padding:3.6rem 3.6rem 5rem}
h1{font-family:'Cormorant',serif;font-weight:400;font-size:2.6rem;margin:0 0 .5rem}
.intro{color:rgba(205,198,188,.86);font-size:1.35rem;line-height:1.6;max-width:86ch;margin:0 0 3.2rem}
.reihe{display:flex;gap:5rem}
.note{font-size:1.05rem;letter-spacing:.2em;text-transform:uppercase;color:rgba(205,198,188,.6);margin:0 0 1.4rem}
.spalte{width:409px;max-width:100%}
.v{border:0;padding:0;margin:0 0 2rem}
.v legend{font-size:1.05rem;letter-spacing:.2em;color:rgba(205,198,188,.7);padding:0;margin-bottom:.9rem}
.chip{display:inline-block;min-width:4.2rem;text-align:center;padding:.9rem 1.2rem;margin-right:.8rem;
  border:1px solid rgba(242,238,232,.22);font-size:1.3rem}
.chip--an{background:#f2eee8;color:#0a0a0a;border-color:#f2eee8}
.kauf{display:block;width:100%;padding:1.6rem;margin-top:2.4rem;border:0;cursor:pointer;
  background:rgb(150,45,58);color:#f2eee8;font-family:'Jost',sans-serif;font-size:1.3rem;letter-spacing:.18em}
</style></head><body><div class="shell">
<h1>Winterverpackung — beide Sprachen</h1>
<p class="intro">Aus dem eingebauten Snippet <code>winter-pack.liquid</code> mit den echten Sprachdateien,
mit <strong>leeren</strong> Feldern — also genau dem Zustand, den du gerade im Theme-Editor hergestellt hast.
Spaltenbreite 409&nbsp;px wie auf der Produktseite.</p>
<div class="reihe">${sp.join('')}</div></div></body></html>`);
  console.log('geschrieben: winter-sprachen.html');
})();

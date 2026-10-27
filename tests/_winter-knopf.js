// Rendert das AUSGELIEFERTE Snippet winter-pack.liquid mit dem echten
// Theme-CSS. Die drei Fassungen unterscheiden sich NUR in einer
// Modifier-Klasse — dieselbe Auszeichnung, dieselben Texte.
const fs = require('fs');
const path = require('path');
const { Liquid } = require('liquidjs');

const THEME = path.join(__dirname, '..');
const strip = (s) => s.replace(/^\s*\/\*[\s\S]*?\*\//, '');
const LOC = JSON.parse(strip(fs.readFileSync(path.join(THEME, 'locales/de.json'), 'utf8')));

const engine = new Liquid({ root: path.join(THEME, 'snippets'), extname: '.liquid' });
engine.registerFilter('asset_url', (v) => '/assets/' + v);
engine.registerFilter('stylesheet_tag', () => '');
engine.registerFilter('money', (v) => (Number(v) / 100).toFixed(2).replace('.', ',') + ' €');
engine.registerFilter('t', (key) => {
  const hit = String(key).split('.').reduce((o, k) => (o == null ? undefined : o[k]), LOC);
  if (hit === undefined) throw new Error('FEHLENDER Schluessel: ' + key);
  return hit;
});

const block = {
  id: 'vorschau', shopify_attributes: '',
  settings: {
    produkt: { selected_or_first_available_variant: { id: 1, price: 390, available: true } },
    ueberschrift: '', hinweis: '',
  },
};

const umfeld = (zeile) => `
  <fieldset class="v"><legend>SAMEN</legend>
    <span class="chip chip--an">2</span><span class="chip">4</span><span class="chip">6</span></fieldset>
  ${zeile}
  <button type="button" class="kauf">IN DEN WARENKORB LEGEN</button>`;

(async () => {
  const css = ['base.css', 'tungacea.css', 'section-main-product.css', 'component-winter-pack.css']
    .map((f) => fs.readFileSync(path.join(THEME, 'assets', f), 'utf8')).join('\n');

  const roh = await engine.renderFile('winter-pack', { block });

  // Modifier-Klasse an dieselbe gerenderte Auszeichnung haengen.
  const mit = (klasse) => klasse ? roh.replace('class="winter-pack"', 'class="winter-pack ' + klasse + '"') : roh;
  // Der bestaetigte Zustand, wie das Skript ihn setzt.
  const fertig = mit('').replace('class="winter-pack__knopf"', 'class="winter-pack__knopf ist-fertig"')
                        .replace('>Hinzufügen<', '>Hinzugefügt<');

  // Nur noch Fassung A — B und C sind nach Tungs Wahl aus dem CSS entfernt,
  // und eine Vorschau darf nichts zeigen, was es nicht gibt.
  const faelle = [
    ['Fassung A — Textknopf rechts', '', 'Die Zeile bleibt eine Zeile. Der Knopf sitzt dort, wo auf dieser Seite Handlungen sitzen.'],
  ];

  const karten = faelle.map(([t, k, n]) =>
    `<div class="sp"><p class="note">${t}</p><p class="erl">${n}</p><div class="spalte">${umfeld(mit(k))}</div></div>`
  ).join('');

  fs.writeFileSync(path.join(__dirname, 'winter-knopf.html'),
`<!doctype html><html lang="de"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Cormorant:wght@400&family=Jost:wght@400&display=swap" rel="stylesheet">
<style>${css}</style><style>
html{font-size:62.5%}
body{background:#0a0a0a;color:#f2eee8;font-family:'Jost',sans-serif;margin:0;font-size:1.6rem}
.shell{padding:3.4rem 3.4rem 4rem}
h1{font-family:'Cormorant',serif;font-weight:400;font-size:2.6rem;margin:0 0 .5rem}
.intro{color:rgba(205,198,188,.86);font-size:1.35rem;line-height:1.6;max-width:92ch;margin:0 0 3rem}
.reihe{display:flex;gap:3.4rem;align-items:flex-start}
.note{font-size:1.05rem;letter-spacing:.2em;text-transform:uppercase;color:rgba(205,198,188,.62);margin:0 0 .6rem}
.erl{font-size:1.15rem;line-height:1.5;color:rgba(205,198,188,.72);margin:0 0 1.4rem;min-height:5.2rem}
.spalte{width:409px;max-width:100%}
.v{border:0;padding:0;margin:0 0 2rem}
.v legend{font-size:1.05rem;letter-spacing:.2em;color:rgba(205,198,188,.7);padding:0;margin-bottom:.9rem}
.chip{display:inline-block;min-width:4.2rem;text-align:center;padding:.9rem 1.2rem;margin-right:.8rem;
  border:1px solid rgba(242,238,232,.22);font-size:1.3rem}
.chip--an{background:#f2eee8;color:#0a0a0a;border-color:#f2eee8}
.kauf{display:block;width:100%;padding:1.6rem;margin-top:2.4rem;border:0;cursor:pointer;
  background:rgb(150,45,58);color:#f2eee8;font-family:'Jost',sans-serif;font-size:1.3rem;letter-spacing:.18em}
.unten{margin-top:4rem;display:flex;gap:3.4rem;align-items:flex-start}
.schmal{width:330px}
</style></head><body><div class="shell">
<h1>Winterverpackung — Knopf statt Kästchen</h1>
<p class="intro">Aus dem eingebauten Snippet <code>winter-pack.liquid</code> mit dem echten Theme-CSS.
Alle drei zeigen <strong>dieselbe Auszeichnung</strong>, sie unterscheiden sich nur in einer CSS-Klasse.
Spaltenbreite 409&nbsp;px wie auf der Produktseite.</p>
<div class="reihe">${karten}</div>
<div class="unten">
  <div><p class="note">Nach dem Klick (Fassung A)</p>
    <p class="erl">Zwei Sekunden lang, dann zurück. Die Meldung sagt nur, dass dieser Klick durchging — sie behauptet nichts über den Inhalt des Warenkorbs.</p>
    <div class="spalte">${fertig}</div></div>
  <div><p class="note">Fassung A auf dem Telefon (330 px)</p>
    <p class="erl">Titel und Knopf bleiben nebeneinander.</p>
    <div class="spalte schmal">${umfeld(mit(''))}</div></div>
</div>
</div></body></html>`);
  console.log('geschrieben: winter-knopf.html');
})();

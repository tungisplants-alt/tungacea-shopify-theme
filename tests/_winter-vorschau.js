// Rohbau-Vorschau der Winterverpackung.
//
// Rendert das AUSGELIEFERTE Snippet snippets/winter-pack.liquid mit dem
// echten Theme-CSS und den echten Sprachdateien — kein Nachbau. Ein Nachbau
// hat in diesem Projekt schon einmal eine Darstellung gezeigt, die es so
// nicht gab.
//
// Gehoert nicht zum Theme; Shopify liefert tests/ nicht aus.
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
engine.registerFilter('t', function (key) {
  const hit = String(key).split('.').reduce((o, k) => (o == null ? undefined : o[k]), LOC);
  if (hit === undefined) throw new Error('FEHLENDER Schluessel: ' + key);
  return hit;
});

const block = (hinweis) => ({
  id: 'vorschau',
  shopify_attributes: '',
  settings: {
    produkt: { selected_or_first_available_variant: { id: 123456, price: 390, available: true } },
    ueberschrift: 'Winterverpackung',
    hinweis: hinweis,
  },
});

const faelle = [
  ['deine Fassung', 'Heatpack und Isolierfolie. Unter 10 °C empfohlen.'],
  ['nur der Grund', 'Heatpack und Isolierfolie. Unter 10 °C nehmen Anthurien Schaden.'],
  ['ohne Hinweiszeile', ''],
  [
    'langer Text — Belastungstest',
    'Heatpack und Isolierfolie. Anthurien nehmen unter 10 °C Schaden, und im Paket ist es unterwegs kälter als die Tagestemperatur draußen.',
  ],
];

// Das Umfeld der Produktseite, damit die Zeile nicht im Leeren steht.
const umfeld = (zeile) => `
  <fieldset class="tg-varianten">
    <legend>SAMEN</legend>
    <span class="tg-chip tg-chip--aktiv">2</span><span class="tg-chip">4</span><span class="tg-chip">6</span>
  </fieldset>
${zeile}
  <button type="button" class="tg-kaufen">IN DEN WARENKORB LEGEN</button>`;

(async () => {
  const css = ['base.css', 'tungacea.css', 'section-main-product.css', 'component-winter-pack.css']
    .map((f) => '/* ' + f + ' */\n' + fs.readFileSync(path.join(THEME, 'assets', f), 'utf8'))
    .join('\n');

  const karten = [];
  for (const [titel, hinweis] of faelle) {
    const zeile = await engine.renderFile('winter-pack', { block: block(hinweis) });
    karten.push(
      '<div><p class="karte__note">' + titel + '</p><div class="spalte">' + umfeld(zeile) + '</div></div>'
    );
  }

  const eigen = `
  /* Das Theme setzt diese Basis in layout/theme.liquid. Ohne sie waeren alle
     rem-Werte 1,6-fach zu gross — der Produkttitel stand so einmal bei 54px
     statt 34px. */
  html { font-size: 62.5%; }
  body { background:#0a0a0a; color:#f2eee8; font-family:'Jost',sans-serif; margin:0; font-size:1.6rem; }
  .shell { max-width:1320px; margin:0 auto; padding:4rem 2.4rem 8rem; }
  h2.kopf { font-family:'Cormorant',serif; font-weight:400; font-size:2.6rem; margin:0 0 .6rem; }
  .intro { color:rgba(205,198,188,.88); font-size:1.4rem; line-height:1.6; max-width:70ch; margin:0 0 3.6rem; }
  .reihe { display:flex; flex-direction:column; gap:4.4rem; }
  .karte__note { font-size:1.05rem; letter-spacing:.2em; text-transform:uppercase;
    color:rgba(205,198,188,.6); margin:0 0 1.4rem; }
  /* Die Infospalte der Produktseite ist rund 409px breit. */
  .spalte { width:409px; max-width:100%; }
  .tg-varianten { border:0; padding:0; margin:0 0 2rem; }
  .tg-varianten legend { font-size:1.05rem; letter-spacing:.2em; color:rgba(205,198,188,.7); padding:0; margin-bottom:.9rem; }
  .tg-chip { display:inline-block; min-width:4.2rem; text-align:center; padding:.9rem 1.2rem; margin-right:.8rem;
    border:1px solid rgba(242,238,232,.22); font-size:1.3rem; }
  .tg-chip--aktiv { background:#f2eee8; color:#0a0a0a; border-color:#f2eee8; }
  .tg-kaufen { display:block; width:100%; padding:1.6rem; margin-top:2.4rem; border:0; cursor:pointer;
    background:rgb(150,45,58); color:#f2eee8; font-family:'Jost',sans-serif; font-size:1.3rem; letter-spacing:.18em; }
`;

  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tungacea — Winterverpackung</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant:wght@400&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
<style>${css}</style><style>${eigen}</style></head><body>
<div class="shell">
  <h2 class="kopf">Winterverpackung</h2>
  <p class="intro">Gerendert aus dem eingebauten Snippet <code>winter-pack.liquid</code> mit dem echten
  Theme-CSS. Preis 3,90&nbsp;€, Spaltenbreite 409&nbsp;px wie auf der Produktseite.
  Die Kästchen lassen sich anklicken.</p>
  <div class="reihe">
${karten.join('\n')}
  </div>
</div>
</body></html>`;

  fs.writeFileSync(path.join(__dirname, 'winter-vorschau.html'), html);
  console.log('geschrieben: winter-vorschau.html — aus snippets/winter-pack.liquid');
})();

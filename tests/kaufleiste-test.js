// Prueft die feste Kaufleiste (snippets/sticky-buy-bar.liquid) gegen die
// ECHTEN Sprachdateien: ein ausverkauftes Produkt bekommt sie gar nicht, die
// Beschriftung kommt auf Deutsch und Englisch aus den Sprachdateien, und die
// Produktseite bindet Skript und Stylesheet ein.
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
engine.registerFilter('money', (v) => (Number(v) / 100).toFixed(2).replace('.', ',') + '€');
engine.registerFilter('t', function (key) {
  const hit = String(key).split('.').reduce((o, k) => (o == null ? undefined : o[k]), LOC[locale]);
  if (hit === undefined) throw new Error('FEHLENDER Schluessel [' + locale + ']: ' + key);
  return hit;
});

let geprueft = 0;
let fehler = 0;
function pruefe(name, ist, soll) {
  geprueft++;
  if (JSON.stringify(ist) !== JSON.stringify(soll)) {
    fehler++;
    console.log('FEHLER  ' + name + '\n   ist:  ' + JSON.stringify(ist) + '\n   soll: ' + JSON.stringify(soll));
  }
}

async function render(produkt, sprache = 'de') {
  locale = sprache;
  return engine.renderFile('sticky-buy-bar', { product: produkt, section_id: 'template--1__main' });
}

(async () => {
  const frei = { available: true, selected_or_first_available_variant: { price: 3499 } };
  const aus = { available: false, selected_or_first_available_variant: { price: 3499 } };

  const de = await render(frei, 'de');
  pruefe('verfuegbar: Leiste ist da', /<sticky-buy-bar\b/.test(de), true);
  pruefe('Abschnitt-ID wird mitgegeben', /data-section-id="template--1__main"/.test(de), true);
  pruefe('Preis des gewaehlten Exemplars', />34,99€</.test(de), true);
  pruefe('Deutsch: Knopf und Verfuegbarkeit', />In den Warenkorb</.test(de) && />Verfügbar</.test(de), true);
  const en = await render(frei, 'en');
  pruefe('Englisch: Knopf und Verfuegbarkeit', />Add to cart</.test(en) && />Available</.test(en), true);
  pruefe('Englisch: kein deutsches Wort', /Warenkorb|Verfügbar/.test(en), false);

  const leer = await render(aus, 'de');
  pruefe('ausverkauft: gar keine Leiste', leer.trim(), '');

  const abschnitt = fs.readFileSync(path.join(THEME, 'sections/main-product.liquid'), 'utf8');
  pruefe('Produktseite bindet die Leiste ein', /render 'sticky-buy-bar'/.test(abschnitt), true);
  pruefe('Produktseite laedt Skript und Stylesheet', /sticky-buy-bar\.js/.test(abschnitt) && /component-sticky-buy-bar\.css/.test(abschnitt), true);
  const js = fs.readFileSync(path.join(THEME, 'assets/sticky-buy-bar.js'), 'utf8');
  pruefe('Skript hoert auf den echten Kaufknopf', /ProductSubmitButton-/.test(js), true);
  const css = fs.readFileSync(path.join(THEME, 'assets/component-sticky-buy-bar.css'), 'utf8');
  pruefe('nur am Handy (Laptop: display none)', /\.sticky-buy-bar\s*\{\s*display:\s*none/.test(css) && /max-width:\s*749px/.test(css), true);

  console.log(fehler + ' Fehler in ' + geprueft + ' Pruefungen');
  process.exit(fehler ? 1 : 0);
})().catch((e) => { console.log('ABBRUCH: ' + e.message); process.exit(1); });

// Prueft das Snippet etikett-details.liquid gegen die echten Sprachdateien.
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
engine.registerFilter('t', function (key) {
  const hit = String(key).split('.').reduce((o, k) => (o == null ? undefined : o[k]), LOC[locale]);
  if (hit === undefined) throw new Error('FEHLENDER Schluessel [' + locale + ']: ' + key);
  return hit;
});

const soll = {
  de: ['Das Etikett', 'Wetterfest · UV-beständig · aus recyceltem Acryl', 'Maße', '16 × 120 mm, 3 mm stark', 'Material', 'Acrylglas, schwarz, beidseitig matt', 'Im Freien', 'UV-, frost- und feuchtigkeitsbeständig', 'Stabilität', '30-mal stärker als Glas, dabei leichter', 'Nachhaltig', 'Aus recyceltem Acryl', 'Gravur', 'kein Aufdruck', 'Namen', 'bis zu zwei Zeilen', 'Fertigung', 'Bei Verzug melde ich mich', '<details', '<dl class="etikett-fakten">', 'produkt-klappe__sub'],
  en: ['The label', 'Weatherproof · UV-resistant · made from recycled acrylic', 'Size', 'Outdoors', 'Strength', 'Sustainable', 'Engraving', 'Production', '30 times stronger than glass'],
};
// Die Zahl bei der Stabilitaet ist 30 (so steht sie in den FAQ des Haendlers); die 20 aus der Erinnerung gilt nicht.
const verboten = ['garantiert', '20-mal', '20 Mal', '20x', '20 times'];

(async () => {
  let checks = 0, fails = 0;
  for (const loc of ['de', 'en']) {
    locale = loc;
    const html = await engine.renderFile('etikett-details', { block: { shopify_attributes: '' } });
    for (const s of soll[loc]) { checks++; if (!html.includes(s)) { fails++; console.log('FEHLER [' + loc + '] fehlt "' + s + '"'); } }
    for (const v of verboten) { checks++; if (html.includes(v)) { fails++; console.log('FEHLER [' + loc + '] enthaelt "' + v + '"'); } }
    // Genau acht Zeilen, jede mit Stichwort und Wert, .
    checks++; if ((html.match(/etikett-fakten__zeile/g) || []).length !== 8) { fails++; console.log('FEHLER [' + loc + '] nicht genau acht Zeilen'); }
  }
  console.log('\n' + (checks - fails) + '/' + checks + ' Pruefungen bestanden, ' + fails + ' Fehler.');
  process.exit(fails ? 1 : 0);
})();

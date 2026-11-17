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
  de: ['Das Etikett', 'Maße', '16 × 120 mm', 'Material', 'Acrylglas, schwarz, mattiert (Frosted Black), 3 mm stark', 'Gravur', 'Namen', 'Platz für zwei Zeilen', 'Haltbarkeit', 'Witterungs-, UV- und wasserfest', 'Laut Hersteller des Acrylglases', 'Fertigung', 'richtet sich nach deiner Anfrage', 'melde ich mich bei dir', '<details', 'produkt-klappe'],
  en: ['The label', 'Size', 'Material', 'Durability', 'According to the maker of the acrylic glass', 'Production', 'depends on your request', 'I will get in touch'],
};
const verboten = ['Fortlaufend', 'garantiert'];

(async () => {
  let checks = 0, fails = 0;
  for (const loc of ['de', 'en']) {
    locale = loc;
    const html = await engine.renderFile('etikett-details', { block: { shopify_attributes: '' } });
    for (const s of soll[loc]) { checks++; if (!html.includes(s)) { fails++; console.log('FEHLER [' + loc + '] fehlt "' + s + '"'); } }
    for (const v of verboten) { checks++; if (html.includes(v)) { fails++; console.log('FEHLER [' + loc + '] enthaelt "' + v + '"'); } }
    // Die 20-fach-Angabe steht nur als Herstellerangabe da, nie als eigene Behauptung.
    checks++; if (/20/.test(html) && !/Hersteller|maker/.test(html)) { fails++; console.log('FEHLER [' + loc + '] 20-fach ohne Herstellerangabe'); }
  }
  console.log('\n' + (checks - fails) + '/' + checks + ' Pruefungen bestanden, ' + fails + ' Fehler.');
  process.exit(fails ? 1 : 0);
})();

// Prueft das Snippet etikett-bestellung.liquid gegen die echten Sprachdateien.
//
// Zwei Dinge duerfen nie auseinanderlaufen: die Menge und die Namen. Deshalb gilt
// hier, dass genau ein Zweig im Formular aktiv ist (der andere ist "disabled")
// und dass die Menge im Namen-Zweig ein verstecktes Feld ist, kein Tippfeld.
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
engine.registerFilter('stylesheet_tag', (v) => '<link rel="stylesheet" href="' + v + '">');
engine.registerFilter('money', (v) => (Number(v) / 100).toFixed(2).replace('.', ',') + '€');
engine.registerFilter('t', function (key, ...rest) {
  const opts = {};
  for (const r of rest) {
    if (Array.isArray(r) && typeof r[0] === 'string') opts[r[0]] = r[1];
    else if (r && typeof r === 'object') Object.assign(opts, r);
  }
  let hit = String(key).split('.').reduce((o, k) => (o == null ? undefined : o[k]), LOC[locale]);
  if (hit === undefined) throw new Error('FEHLENDER Schluessel [' + locale + ']: ' + key);
  for (const [k, v] of Object.entries(opts)) hit = hit.split('{{ ' + k + ' }}').join(String(v));
  return hit;
});

const produkt = { selected_or_first_available_variant: { price: 250 } };
const block = (settings) => ({ id: 'b1', shopify_attributes: '', settings: Object.assign({ gattung: 'Anthurium', ab_1: 10, preis_1: 2.25, ab_2: 25, preis_2: 2 }, settings || {}) });
const ctx = (extra) => Object.assign({
  product: produkt, block: block(), form_id: 'product-form-main', section_id: 'main',
  cart: { currency: { iso_code: 'EUR' } }, request: { locale: { iso_code: locale } },
}, extra || {});
// settings und template sind in Shopify Globale und fuer die eingebetteten Snippets (whatsapp-option) sichtbar.
const globale = (settings) => ({ settings: settings || { whatsapp_nummer: '+49 151 2345678' }, template: { name: 'product' }, product: produkt });

const faelle = [
  { name: 'Grundaufbau: Felder haengen am Kaufformular, Namen-Zweig aktiv, Mengenfeld des spaeteren Zweigs aus',
    erwartet: {
      de: ['data-form="product-form-main"', 'name="properties[Namen]"', 'name="properties[Zeile 1]"', 'form="product-form-main"', 'name="properties[_namen_anzahl]"', 'data-eb-menge-namen', 'type="hidden" name="quantity"', 'data-eb-menge-spaeter', 'disabled', 'value="Anthurium"', 'Namen eintragen', 'Namen später nennen', 'Namen auf den Etiketten'],
      en: ['name="properties[Names]"', 'name="properties[Line 1]"', 'Enter names', 'Send names later', 'Names on the labels'],
    },
    verboten: ['<form'] },
  { name: 'Staffeln: Anzeige und Daten fuer die Summe', erwartet: { de: ['data-stufen="10:225,25:200"', 'ab 10 Stück 2,25 €', 'ab 25 Stück 2,00 €'], en: ['data-stufen="10:225,25:200"', 'from 10 pieces 2,25 €'] } },
  { name: 'Stufe ohne echten Rabatt (Preis nicht niedriger) erscheint nicht', ctx: { block: block({ preis_1: 3, ab_2: 0 }) }, erwartet: ['data-stufen=""'], verboten: ['ab 10 Stück', 'ab 25 Stück'] },
  { name: 'Eine Stufe ab 1 Stueck ist keine Staffel', ctx: { block: block({ ab_1: 1, ab_2: 25, preis_2: 2 }) }, erwartet: ['data-stufen="25:200"'] },
  { name: 'Gattung ist aenderbar vorbelegt', ctx: { block: block({ gattung: 'Philodendron' }) }, erwartet: ['value="Philodendron"'] },
  { name: 'Logo-Weg: WhatsApp-Link mit vorausgefuelltem Satz', erwartet: { de: ['wa.me/491512345678', 'eigenen%20Logo', 'etikett-bestellung__logo', 'Du möchtest dein eigenes Logo'], en: ['wa.me/491512345678', 'own%20logo', 'Want your own logo'] } },
  { name: 'Namen spaeter: eigener WhatsApp-Satz', erwartet: { de: ['Bestellnummer'], en: ['order%20number'] } },
  { name: 'Ohne gueltige Nummer: kein Link und kein Logo-Block', settings: { whatsapp_nummer: '' }, verboten: ['wa.me', 'etikett-bestellung__logo', 'Du möchtest dein eigenes Logo'] },
  { name: 'Skript und Stil werden geladen', erwartet: ['etikett-bestellung.js', 'component-etikett-bestellung.css'] },
];

(async () => {
  let checks = 0;
  let fails = 0;
  for (const loc of ['de', 'en']) {
    locale = loc;
    for (const f of faelle) {
      let html;
      try {
        html = await engine.renderFile('etikett-bestellung', ctx(f.ctx), { globals: globale(f.settings) });
      } catch (e) {
        console.log('FEHLER [' + loc + '] ' + f.name + ': ' + e.message);
        fails++; checks++;
        continue;
      }
      const soll = Array.isArray(f.erwartet) ? f.erwartet : (f.erwartet || {})[loc] || [];
      for (const s of soll) { checks++; if (!html.includes(s)) { fails++; console.log('FEHLER [' + loc + '] ' + f.name + ': fehlt "' + s + '"'); } }
      for (const v of f.verboten || []) { checks++; if (html.includes(v)) { fails++; console.log('FEHLER [' + loc + '] ' + f.name + ': enthaelt "' + v + '"'); } }
    }
  }
  console.log('\n' + (checks - fails) + '/' + checks + ' Pruefungen bestanden, ' + fails + ' Fehler.');
  process.exit(fails ? 1 : 0);
})();

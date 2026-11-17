// Prueft das Snippet etikett-bestellung.liquid gegen die echten Sprachdateien.
//
// Menge und Namen duerfen nie auseinanderlaufen. Deshalb ist die Menge ein
// verstecktes Feld, kein Tippfeld: Sie ergibt sich aus der Liste.
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
const block = (settings) => ({ id: 'b1', shopify_attributes: '', settings: Object.assign({ gattung: 'Anthurium', ab_1: 10, preis_1: 225, ab_2: 25, preis_2: 200 }, settings || {}) });
const ctx = (extra) => Object.assign({
  product: produkt, block: block(), form_id: 'product-form-main', section_id: 'main',
  cart: { currency: { iso_code: 'EUR' } }, request: { locale: { iso_code: locale } },
}, extra || {});
// settings und template sind in Shopify Globale und fuer die eingebetteten Snippets (whatsapp-option) sichtbar.
const globale = (settings) => ({ settings: settings || { whatsapp_nummer: '+49 151 2345678' }, template: { name: 'product' }, product: produkt });

const faelle = [
  { name: 'Aufbau: drei Teile mit Kopfzeile, Liste, Preis, Logo',
    erwartet: {
      de: ['Deine Etiketten', '>Preis<', 'Eigenes Logo', 'data-eb-gruppen', 'data-eb-gruppe-neu', 'Weitere Gattung', 'Füge eine ganze Liste ein'],
      en: ['Your labels', '>Price<', 'Your own logo', 'Another genus', 'Paste a whole list'],
    } },
  { name: 'Eine Position: Felder haengen am Kaufformular, Eigenschaft "Etiketten", versteckte Anzahl',
    erwartet: {
      de: ['data-form="product-form-main"', 'name="properties[Etiketten]"', 'form="product-form-main"', 'name="properties[_namen_anzahl]"', 'type="hidden" name="quantity"'],
      en: ['name="properties[Labels]"'],
    },
    verboten: ['<form', 'type="number"', '<textarea'] },
  { name: 'Die Variante des Etiketts steht fuer den Warenkorb-Abgleich am Block', erwartet: ['data-variante="'] },
  { name: 'Staffel: drei Stufen immer sichtbar, Daten fuer die Summe',
    erwartet: { de: ['data-stufen="10:225,25:200"', '1–9', 'ab 10', 'ab 25', '2,50 €', '2,25 €', '2,00 €', 'data-ab="1"', 'data-ab="10"', 'data-ab="25"'], en: ['data-stufen="10:225,25:200"', '1–9', '10+', '25+'] } },
  { name: 'Stufe ohne echten Rabatt (Preis nicht niedriger) erscheint nicht', ctx: { block: block({ preis_1: 300, ab_2: 0 }) }, erwartet: ['data-stufen=""'], verboten: ['eb__stufen', 'data-ab="10"'] },
  { name: 'Nur Stufe 2 gueltig: erste Stufe reicht bis ab_2 minus 1', ctx: { block: block({ ab_1: 0, preis_1: 0, ab_2: 25, preis_2: 200 }) }, erwartet: { de: ['data-stufen="25:200"', '1–24', 'ab 25'], en: ['data-stufen="25:200"', '1–24', '25+'] }, verboten: ['data-ab="10"'] },
  { name: 'Stufe 2 teurer als Stufe 1 ist keine Staffel', ctx: { block: block({ preis_2: 240 }) }, erwartet: ['data-stufen="10:225"'], verboten: ['data-ab="25"'] },
  { name: 'Eine Stufe ab 1 Stueck ist keine Staffel', ctx: { block: block({ ab_1: 1, ab_2: 25, preis_2: 200 }) }, erwartet: ['data-stufen="25:200"'] },
  { name: 'Gattung ist vorbelegt (fuer die erste Gruppe)', ctx: { block: block({ gattung: 'Philodendron' }) }, erwartet: ['data-gattung="Philodendron"'] },
  { name: 'Logo: drei Wahlmoeglichkeiten, Tungacea ist vorgewaehlt, Eigenschaft "Logo" geht mit',
    erwartet: {
      de: ['data-eb-logo="tungacea"', 'data-eb-logo="ohne"', 'data-eb-logo="eigenes"', 'role="radiogroup"', 'aria-checked="true" data-eb-logo="tungacea"', 'name="properties[Logo]"', 'value="Tungacea-Logo"', 'Ohne Logo', 'Eigenes Logo', 'Mein Logo steht oben auf dem Etikett'],
      en: ['name="properties[Logo]"', 'value="Tungacea logo"', 'No logo', 'Own logo', 'My logo sits at the top'],
    } },
  { name: 'Eigenes Logo: WhatsApp-Zeile mit vorausgefuelltem Satz, erst bei dieser Wahl sichtbar',
    erwartet: { de: ['href="https://wa.me/491512345678?text=', 'eigenen%20Logo', 'Auf Anfrage per WhatsApp', 'data-eb-logo-weg hidden', 'eb__pfeil'], en: ['wa.me/491512345678', 'own%20logo', 'On request via WhatsApp', 'data-eb-logo-weg hidden'] },
    verboten: ['etikett-bestellung__whatsapp'] },
  { name: 'Ohne gueltige Nummer: nur Tungacea und Ohne Logo, kein Link',
    settings: { whatsapp_nummer: '' }, erwartet: ['data-eb-logo="tungacea"', 'data-eb-logo="ohne"'], verboten: ['wa.me', 'data-eb-logo="eigenes"', 'eb__zeile-knopf--link', 'data-eb-logo-weg'] },
  { name: 'Vorschaubilder: je Wahl Vorder- und Rueckseite, nur die vorgewaehlte (Tungacea) ist sichtbar, Texte uebersetzt',
    erwartet: {
      de: ['etikett-vorschau-tungacea-vorne.svg', 'etikett-vorschau-tungacea-hinten.svg', 'etikett-vorschau-ohne-vorne.svg', 'etikett-vorschau-eigenes-vorne.svg', 'etikett-vorschau-leer.svg', 'data-eb-vorschau="ohne" data-seite="front"', 'Vorderseite', 'Rückseite', 'Rückseite mit dem Rakkan und der Marke Tungacea', 'Vorderseite ohne Logo: Gattung und Name beginnen weiter oben', 'loading="lazy"'],
      en: ['Front', 'Back', 'Back with the Rakkan seal and the Tungacea mark', 'Front without a logo'],
    },
    verboten: ['data-eb-vorschau="tungacea" data-seite="front" src="/assets/etikett-vorschau-tungacea-vorne.svg" alt="Vorderseite mit Tungacea-Logo, Gattung und Name, Beispiel Anthurium Tungacea × Premium Tag" width="22" height="126" loading="lazy" hidden'] },
  { name: 'Messen wie im Generator: Schriftbreiten werden vor dem Skript geladen',
    erwartet: ['etikett-schrift.js', 'etikett-bestellung.js'],
    verboten: [] },
  { name: 'Alle Texte, die das Skript braucht, stehen als Daten am Block (uebersetzt)',
    erwartet: { de: ['data-t-name-neu="Name hinzufügen"', 'data-t-fehler-namen="Trag mindestens einen Namen ein."', 'data-t-fehler-gattung=', 'data-t-pro="pro Etikett"', 'data-t-fertig="In den Warenkorb gelegt."', 'data-t-mehr="{{ n }} weitere anzeigen"', 'data-t-weniger="Weniger anzeigen"', 'data-t-zwei-zeilen="2 Zeilen"', 'data-t-zu-lang="Zu lang"', 'data-t-zeichen="Zeichen nicht möglich: {{ z }}"', 'data-t-voll=', 'data-t-fehler-passt=', 'data-t-hinweis-ohne="Nur der Text, ohne Logo und ohne Rakkan. Dafür hat ein Name mehr Platz."'], en: ['data-t-name-neu="Add name"', 'data-t-fehler-namen="Enter at least one name."', 'data-t-pro="each"', 'data-t-mehr="Show {{ n }} more"', 'data-t-weniger="Show less"', 'data-t-zwei-zeilen="2 lines"', 'data-t-zu-lang="Too long"'] } },
  { name: 'Vorschlagsliste fuer Gattungen', erwartet: ['<datalist', 'Anthurium', 'Philodendron'] },
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

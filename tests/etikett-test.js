// Prueft das ausgelieferte Snippet etikett.liquid gegen die echten
// Sprachdateien.
//
// Zwei Zustaende haengen am Preis und am Lieferumfang der Pflanze, und beide
// duerfen sich nicht verwechseln: Ein inklusives Etikett mit Knopf wuerde den
// Kunden zahlen lassen, was er schon bezahlt hat. Und ein vorausgewaehltes
// Zubuchen waere nach § 312a Abs. 3 BGB unwirksam, deshalb kein Kaestchen.
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
engine.registerFilter('money_without_trailing_zeros', (v) => (Number(v) / 100).toFixed(2).replace('.', ',').replace(',00', '') + '€');
engine.registerFilter('image_url', (v, o) => (v && v.src ? v.src : '') + '?width=' + (o && o.width));
engine.registerFilter('image_tag', (v) => '<img src="' + v + '">');
engine.registerFilter('t', function (key) {
  const hit = String(key).split('.').reduce((o, k) => (o == null ? undefined : o[k]), LOC[locale]);
  if (hit === undefined) throw new Error('FEHLENDER Schluessel [' + locale + ']: ' + key);
  return hit;
});

const zusatz = (preis, verfuegbar, id) => ({
  url: '/products/archiv-etikett',
  selected_or_first_available_variant: { id: id || 55667788, price: preis, available: verfuegbar },
});
const pflanze = (preisCent, lieferumfang) => ({
  title: 'Anthurium Test "Q"',
  handle: 'anthurium-test-q',
  selected_or_first_available_variant: { price: preisCent },
  metafields: { custom: { lieferumfang: lieferumfang ? { value: lieferumfang } : null } },
});
const block = (settings) => ({ id: 'b1', shopify_attributes: '', settings: Object.assign({ produkt: zusatz(250, true), schwelle: 100, ueberschrift: '', hinweis_inklusive: '', hinweis_zubuchbar: '', bild: null }, settings || {}) });

const faelle = [
  { name: 'Ohne Lieferumfang erscheint nichts (z. B. das Zusatzprodukt selbst)', product: pflanze(15000, null), block: block(), leer: true },
  { name: '150 € Exemplar: inklusive, kein Knopf', product: pflanze(15000, 'Dieses Exemplar'), block: block(),
    erwartet: { de: ['Archiv-Etikett', 'inklusive', 'Schwarzes Acryl', 'etikett--inklusive'], en: ['Archive label', 'included', 'Black acrylic', 'etikett--inklusive'] },
    verboten: ['<button', 'data-etikett', 'etikett.js', '+ 2,50'] },
  { name: 'Genau auf der Grenze (100 €) ist inklusive', product: pflanze(10000, 'Cutting der Mutterpflanze'), block: block(), erwartet: ['etikett--inklusive'], verboten: ['<button'] },
  { name: 'Ein Cent darunter (99,99 €): zubuchbar mit Knopf und Preis', product: pflanze(9999, 'Dieses Exemplar'), block: block(),
    erwartet: { de: ['etikett--zubuchbar', '+ 2,50 €', '<button', 'data-etikett', 'data-variante="55667788"', 'etikett.js', 'Für diese Pflanze dazubuchen', '>Hinzufügen<'], en: ['etikett--zubuchbar', '+ 2,50 €', 'Add it for this plant', '>Add<', 'data-label-fertig="Added"'] },
    verboten: ['inklusive</span>', 'included</span>'] },
  { name: 'Namen der Pflanze und Schluessel stehen am Knopf (maskiert)', product: pflanze(5000, 'Dieses Exemplar'), block: block(),
    erwartet: { de: ['data-handle="anthurium-test-q"', 'data-fuer="Anthurium Test ', 'data-schluessel-fuer="Für"'], en: ['data-schluessel-fuer="For"'] },
    verboten: ['Test "Q"'] },
  { name: 'Saemling ueber der Grenze bekommt den Knopf, nicht "inklusive"', product: pflanze(15000, 'Sämling aus dieser Kreuzung'), block: block(), erwartet: ['etikett--zubuchbar', '<button'], verboten: ['etikett--inklusive'] },
  { name: 'Gekeimter Samen ueber der Grenze bekommt den Knopf', product: pflanze(15000, 'Gekeimter Samen aus dieser Kreuzung'), block: block(), erwartet: ['etikett--zubuchbar'], verboten: ['etikett--inklusive'] },
  { name: 'Inklusive braucht kein Zusatzprodukt', product: pflanze(15000, 'Dieses Exemplar'), block: block({ produkt: null }), erwartet: ['etikett--inklusive'] },
  { name: 'Zubuchbar ohne Zusatzprodukt: nichts', product: pflanze(5000, 'Dieses Exemplar'), block: block({ produkt: null }), leer: true },
  { name: 'Zubuchbar, Zusatzprodukt ausverkauft: nichts', product: pflanze(5000, 'Dieses Exemplar'), block: block({ produkt: zusatz(250, false) }), leer: true },
  { name: 'Eingestellte Schwelle 50 €: 60 € ist inklusive', product: pflanze(6000, 'Dieses Exemplar'), block: block({ schwelle: 50 }), erwartet: ['etikett--inklusive'] },
  { name: 'Eingestellte Schwelle 200 €: 150 € ist zubuchbar', product: pflanze(15000, 'Dieses Exemplar'), block: block({ schwelle: 200 }), erwartet: ['etikett--zubuchbar'] },
  { name: 'Eigener Text schlaegt die Uebersetzung', product: pflanze(15000, 'Dieses Exemplar'), block: block({ ueberschrift: 'Etikett', hinweis_inklusive: 'Eigener Satz.' }),
    erwartet: ['Etikett', 'Eigener Satz.'], verboten: ['Archive label', 'Black acrylic'] },
  { name: 'Kein Kontrollkaestchen (§ 312a Abs. 3 BGB)', product: pflanze(5000, 'Dieses Exemplar'), block: block(), erwartet: ['type="button"'], verboten: ['type="checkbox"', 'checked'] },
  { name: 'Titel und kleine Zeile fuehren auf die Seite des Etiketts (inklusive)', product: pflanze(15000, 'Dieses Exemplar'), block: block(),
    erwartet: { de: ['class="etikett__link" href="/products/archiv-etikett"', 'class="etikett__mehr" href="/products/archiv-etikett"', 'Bilder ansehen und mehr Etiketten kaufen'], en: ['etikett__link', 'See photos and buy more labels'] } },
  { name: 'Titel und kleine Zeile fuehren auf die Seite des Etiketts (zubuchbar)', product: pflanze(5000, 'Dieses Exemplar'), block: block(),
    erwartet: ['class="etikett__link" href="/products/archiv-etikett"', 'etikett__mehr'] },
  { name: 'Ohne Zusatzprodukt gibt es keinen Link', product: pflanze(15000, 'Dieses Exemplar'), block: block({ produkt: null }), verboten: ['<a ', 'etikett__mehr', 'etikett__link'] },
  { name: 'Mit Bild: es wird gerendert', product: pflanze(15000, 'Dieses Exemplar'), block: block({ bild: { src: '/etikett.jpg', alt: 'Etikett' } }), erwartet: ['etikett__bild', '<img'] },
  { name: 'Ohne Bild: kein Bildbereich', product: pflanze(15000, 'Dieses Exemplar'), block: block(), verboten: ['etikett__bild', '<img'] },
];

(async () => {
  let checks = 0;
  let fails = 0;
  for (const loc of ['de', 'en']) {
    locale = loc;
    for (const f of faelle) {
      let html;
      try {
        html = await engine.renderFile('etikett', { product: f.product, block: f.block });
      } catch (e) {
        console.log('FEHLER [' + loc + '] ' + f.name + ': ' + e.message);
        fails++; checks++;
        continue;
      }
      if (f.leer) {
        checks++;
        if (html.trim() !== '') { fails++; console.log('FEHLER [' + loc + '] ' + f.name + ': es wurde etwas gerendert'); }
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

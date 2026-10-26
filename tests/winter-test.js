// Prueft das ausgelieferte Snippet winter-pack.liquid gegen die echten
// Sprachdateien.
//
// Der wichtigste Fall steht ganz unten: Das Kaestchen darf NIE vorausgewaehlt
// sein. Vorausgewaehlte kostenpflichtige Zusatzleistungen sind nach
// § 312a Abs. 3 BGB unwirksam. Das ist keine Geschmacksfrage, deshalb haengt
// hier eine Pruefung daran und nicht nur ein Kommentar.
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
engine.registerFilter('money', (v) => {
  const n = Number(v) / 100;
  return n.toFixed(2).replace('.', ',') + ' €';
});
engine.registerFilter('t', function (key) {
  const hit = String(key).split('.').reduce((o, k) => (o == null ? undefined : o[k]), LOC[locale]);
  if (hit === undefined) throw new Error('FEHLENDER Schluessel [' + locale + ']: ' + key);
  return hit;
});

const produkt = (preis, verfuegbar, id) => ({
  selected_or_first_available_variant: {
    id: id || 44556677,
    price: preis,
    available: verfuegbar,
  },
});

const faelle = [
  {
    name: 'Kein Produkt gewaehlt — es erscheint nichts',
    block: { id: 'b1', shopify_attributes: '', settings: { produkt: null } },
    leer: true,
  },
  {
    name: 'Produkt ausverkauft — es erscheint nichts',
    block: { id: 'b1', shopify_attributes: '', settings: { produkt: produkt(390, false) } },
    leer: true,
  },
  {
    name: 'Vollstaendig: Kaestchen, Preis, Hinweis, Variante',
    block: {
      id: 'b1',
      shopify_attributes: '',
      settings: {
        produkt: produkt(390, true, 99887766),
        ueberschrift: 'Winterverpackung',
        hinweis: 'Heatpack und Isolierfolie. Unter 10 °C empfohlen.',
      },
    },
    erwartet: [
      'Winterverpackung',
      '3,90 €',
      'Heatpack und Isolierfolie. Unter 10 °C empfohlen.',
      'data-winter-pack',
      'data-variante="99887766"',
      'type="checkbox"',
    ],
  },
  {
    name: 'Ohne eigene Ueberschrift greift der Sprachschluessel',
    block: {
      id: 'b1',
      shopify_attributes: '',
      settings: { produkt: produkt(390, true), ueberschrift: '' },
    },
    erwartet: ['Winterverpackung'],
  },
  {
    name: 'Ohne Hinweistext bleibt die zweite Zeile weg',
    block: {
      id: 'b1',
      shopify_attributes: '',
      settings: { produkt: produkt(390, true), ueberschrift: 'Winterverpackung', hinweis: '' },
    },
    erwartet: ['Winterverpackung'],
    verboten: ['winter-pack__sub'],
  },
  {
    name: 'RECHT: Das Kaestchen ist nicht vorausgewaehlt (§ 312a Abs. 3 BGB)',
    block: {
      id: 'b1',
      shopify_attributes: '',
      settings: { produkt: produkt(390, true), ueberschrift: 'Winterverpackung' },
    },
    erwartet: ['type="checkbox"'],
    verboten: ['checked'],
  },
];

(async () => {
  let checks = 0;
  let fails = 0;

  for (const loc of ['de', 'en']) {
    locale = loc;
    for (const f of faelle) {
      let html;
      try {
        html = await engine.renderFile('winter-pack', { block: f.block });
      } catch (e) {
        console.log('FEHLER [' + loc + '] ' + f.name + ': ' + e.message);
        fails++;
        checks++;
        continue;
      }

      if (f.leer) {
        checks++;
        if (html.trim() !== '') {
          fails++;
          console.log('FEHLER [' + loc + '] ' + f.name + ': es wurde etwas gerendert');
        }
        continue;
      }

      for (const soll of f.erwartet || []) {
        checks++;
        // Die Ueberschrift kommt im englischen Lauf aus der englischen Datei.
        const text = loc === 'en' && soll === 'Winterverpackung' ? 'Winter packaging' : soll;
        const vorhanden = loc === 'en' && soll === 'Winterverpackung' && f.block.settings.ueberschrift
          ? html.includes(soll) // eigene Ueberschrift wird nicht uebersetzt
          : html.includes(text);
        if (!vorhanden) {
          fails++;
          console.log('FEHLER [' + loc + '] ' + f.name + ': fehlt "' + text + '"');
        }
      }

      for (const darf of f.verboten || []) {
        checks++;
        if (html.includes(darf)) {
          fails++;
          console.log('FEHLER [' + loc + '] ' + f.name + ': enthaelt "' + darf + '"');
        }
      }
    }
  }

  console.log('\n' + (checks - fails) + '/' + checks + ' Pruefungen bestanden, ' + fails + ' Fehler.');
  process.exit(fails ? 1 : 0);
})();

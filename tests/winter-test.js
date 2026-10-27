// Prueft das ausgelieferte Snippet winter-pack.liquid gegen die echten
// Sprachdateien.
//
// Seit dem 26. Oktober ist es ein Knopf, kein Kontrollkaestchen: Das Kaestchen
// spiegelte den Warenkorb, und der aendert sich auch anderswo. Zwei Pruefungen
// haengen daran, dass es nie wieder eines wird — ein Kaestchen koennte wieder
// veralten, und ein vorausgewaehltes waere nach § 312a Abs. 3 BGB zusaetzlich
// unwirksam.
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
      '<button',
      'type="button"',
    ],
  },
  {
    name: 'Ohne eigene Ueberschrift greift der Sprachschluessel',
    block: {
      id: 'b1',
      shopify_attributes: '',
      settings: { produkt: produkt(390, true), ueberschrift: '' },
    },
    erwartet: { de: ['Winterverpackung'], en: ['Winter packaging'] },
  },
  {
    // Der eigentliche Fall: Ein eigener Hinweistext stuende sonst auch auf der
    // englischen Seite auf Deutsch. Leer heisst uebersetzt, nicht stumm.
    name: 'Ohne eigenen Hinweis greift der Sprachschluessel',
    block: {
      id: 'b1',
      shopify_attributes: '',
      settings: { produkt: produkt(390, true), ueberschrift: '', hinweis: '' },
    },
    erwartet: {
      de: ['Winterverpackung', 'Heatpack und Isolierfolie. Unter 10 °C empfohlen.', 'winter-pack__sub'],
      en: ['Winter packaging', 'Heat pack and thermal wrap. Recommended below 10 °C.', 'winter-pack__sub'],
    },
  },
  {
    // Gegenprobe: Ein eigener Text schlaegt die Uebersetzung bewusst — er
    // steht dann in beiden Sprachen gleich da. Das ist die dokumentierte
    // Wirkung, kein Versehen.
    name: 'Eigener Text schlaegt die Uebersetzung in beiden Sprachen',
    block: {
      id: 'b1',
      shopify_attributes: '',
      settings: { produkt: produkt(390, true), ueberschrift: 'Winterschutz', hinweis: 'Eigener Satz.' },
    },
    erwartet: ['Winterschutz', 'Eigener Satz.'],
    verboten: ['Winter packaging', 'thermal wrap'],
  },
  {
    // Kein Kontrollkaestchen mehr — weder angehakt noch leer. Ein Kaestchen
    // waere wieder ein Zustand, der veralten kann, und ein vorausgewaehltes
    // waere nach § 312a Abs. 3 BGB unwirksam.
    name: 'Kein Kontrollkaestchen, sondern ein Knopf (Zustand und § 312a Abs. 3 BGB)',
    block: {
      id: 'b1',
      shopify_attributes: '',
      settings: { produkt: produkt(390, true), ueberschrift: 'Winterverpackung' },
    },
    erwartet: ['type="button"'],
    verboten: ['type="checkbox"', 'checked'],
  },
  {
    // Beide Beschriftungen muessen uebersetzt sein — die im Knopf und die
    // nach dem Klick. Die zweite steckt in einem data-Attribut und waere
    // sonst die naechste Stelle, an der Deutsch auf der englischen Seite
    // stehen bleibt.
    name: 'Knopfbeschriftung und Bestaetigung sind uebersetzt',
    block: {
      id: 'b1',
      shopify_attributes: '',
      settings: { produkt: produkt(390, true), ueberschrift: '', hinweis: '' },
    },
    erwartet: {
      de: ['>Hinzufügen<', 'data-label-fertig="Hinzugefügt"'],
      en: ['>Add<', 'data-label-fertig="Added"'],
    },
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

      // Erwartungen je Sprache, wenn sie sich unterscheiden; sonst eine Liste
      // fuer beide. Die alte Sonderbehandlung fuer ein einzelnes Wort haette
      // einen zweiten uebersetzten Text nie geprueft.
      const soll_liste = Array.isArray(f.erwartet) ? f.erwartet : (f.erwartet || {})[loc] || [];
      for (const soll of soll_liste) {
        checks++;
        if (!html.includes(soll)) {
          fails++;
          console.log('FEHLER [' + loc + '] ' + f.name + ': fehlt "' + soll + '"');
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

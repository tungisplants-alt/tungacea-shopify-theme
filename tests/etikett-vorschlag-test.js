// Prueft snippets/etikett-vorschlag.liquid (Etikett-Vorschlag im Warenkorb).
//
// Was nicht verloren gehen darf:
//   - nur Pflanzen (mit Lieferumfang), nie Zusatzprodukte
//   - ab 100 € inklusive: keine Zeile (ausser Saemling und gekeimter Samen)
//   - gibt es zur Pflanze schon ein Etikett im Warenkorb: keine Zeile
//   - eine Zeile je Pflanze, auch bei zwei Positionen derselben Pflanze nur eine
//   - nichts vorausgewaehlt: Knopf, kein Kaestchen (§ 312a Abs. 3 BGB)
//   - die Schwelle im Snippet ist dieselbe wie in der Produktvorlage
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

const etikett = (verfuegbar = true) => ({
  handle: 'archiv-etikett', url: '/products/archiv-etikett',
  selected_or_first_available_variant: { id: 777, price: 250, available: verfuegbar },
});
const pos = (handle, preis, lieferumfang, extra) => Object.assign({
  product: { handle, title: 'Anthurium ' + handle, metafields: { custom: { lieferumfang: lieferumfang ? { value: lieferumfang } : null } } },
  variant: { price: preis, option1: 'A' }, properties: {}, quantity: 1,
}, extra || {});
const etikettPos = (fuer, menge = 1) => ({ product: { handle: 'archiv-etikett', title: 'Pflanzenetikett', metafields: { custom: { lieferumfang: null } } }, variant: { price: 250, option1: 'Default Title' }, properties: { _pflanze: fuer }, quantity: menge });

const faelle = [
  { name: 'Pflanze unter 100 €: Zeile mit Knopf, Namen und Preis', cart: [pos('a-1', 5000, 'Dieses Exemplar')], zeilen: 1,
    erwartet: ['data-etikett-vorschlag', 'data-variante="777"', 'data-handle="a-1"', 'data-fuer="Anthurium a-1"', '2,50 €', 'component-etikett-vorschlag.css', 'type="button"'], verboten: ['checkbox', 'checked'] },
  { name: 'Pflanze ab 100 €: inklusive, keine Zeile', cart: [pos('a-1', 10000, 'Dieses Exemplar')], zeilen: 0 },
  { name: 'Saemling ab 100 € bekommt eine Zeile', cart: [pos('s-1', 15000, 'Sämling aus dieser Kreuzung')], zeilen: 1 },
  { name: 'Gekeimter Samen ab 100 € bekommt eine Zeile', cart: [pos('s-2', 15000, 'Gekeimter Samen aus dieser Kreuzung')], zeilen: 1 },
  { name: 'Ohne Lieferumfang (Zusatzprodukt, Verpackung): keine Zeile', cart: [pos('winterverpackung', 500, null)], zeilen: 0 },
  { name: 'Etikett schon im Warenkorb: keine Zeile fuer diese Pflanze', cart: [pos('a-1', 5000, 'Dieses Exemplar'), etikettPos('a-1')], zeilen: 0 },
  { name: 'Etikett fuer eine andere Pflanze: die erste bekommt trotzdem eine Zeile', cart: [pos('a-1', 5000, 'Dieses Exemplar'), pos('a-2', 5000, 'Dieses Exemplar'), etikettPos('a-2')], zeilen: 1, erwartet: ['data-handle="a-1"'], verboten: ['data-handle="a-2"'] },
  { name: 'Vier Samen: ein Angebot ueber vier Etiketten', cart: [pos('s-1', 1500, 'Gekeimter Samen aus dieser Kreuzung', { quantity: 4 })], zeilen: 1,
    erwartet: { de: ['data-menge="4"', '4 × 2,50 € · Hinzufügen'], en: ['data-menge="4"', '4 × 2,50 € · Add'] } },
  { name: 'Samen-Packung 4x, Menge 1: vier Etiketten', cart: [pos('s-1', 1500, 'Gekeimter Samen aus dieser Kreuzung', { variant: { price: 1500, option1: '4x' } })], zeilen: 1, erwartet: ['data-menge="4"'] },
  { name: 'Samen-Packung 6x, Menge 2: zwoelf Etiketten', cart: [pos('s-1', 1500, 'Gekeimter Samen aus dieser Kreuzung', { variant: { price: 1500, option1: '6x' }, quantity: 2 })], zeilen: 1, erwartet: ['data-menge="12"'] },
  { name: 'Zwei verschiedene Packungen derselben Pflanze (2x + 4x): sechs', cart: [pos('s-1', 1500, 'Gekeimter Samen aus dieser Kreuzung', { variant: { price: 1000, option1: '2x' } }), pos('s-1', 1500, 'Gekeimter Samen aus dieser Kreuzung', { variant: { price: 2000, option1: '4x' } })], zeilen: 1, erwartet: ['data-menge="6"'] },
  { name: 'Packung 4x, zwei Etiketten schon im Warenkorb: noch zwei', cart: [pos('s-1', 1500, 'Gekeimter Samen aus dieser Kreuzung', { variant: { price: 1500, option1: '4x' } }), etikettPos('s-1', 2)], zeilen: 1, erwartet: ['data-menge="2"'] },
  { name: 'Variante "A" oder "Default Title" zaehlt als ein Stueck', cart: [pos('a-1', 5000, 'Dieses Exemplar', { variant: { price: 5000, option1: 'Default Title' } })], zeilen: 1, erwartet: ['data-menge="1"'] },
  { name: 'Vier Samen, eins schon im Warenkorb: noch drei', cart: [pos('s-1', 1500, 'Gekeimter Samen aus dieser Kreuzung', { quantity: 4 }), etikettPos('s-1', 1)], zeilen: 1, erwartet: ['data-menge="3"'] },
  { name: 'Vier Samen, vier Etiketten schon im Warenkorb: keine Zeile', cart: [pos('s-1', 1500, 'Gekeimter Samen aus dieser Kreuzung', { quantity: 4 }), etikettPos('s-1', 4)], zeilen: 0 },
  { name: 'Eine Pflanze: Menge 1, Text ohne Mal-Zeichen', cart: [pos('a-1', 5000, 'Dieses Exemplar')], zeilen: 1, erwartet: ['data-menge="1"'], verboten: ['1 × '] },
  { name: 'Zwei Positionen derselben Pflanze: nur eine Zeile', cart: [pos('a-1', 5000, 'Dieses Exemplar'), pos('a-1', 5000, 'Dieses Exemplar')], zeilen: 1 },
  { name: 'Zwei Pflanzen: zwei Zeilen', cart: [pos('a-1', 5000, 'Dieses Exemplar'), pos('a-2', 3000, 'Cutting der Mutterpflanze')], zeilen: 2 },
  { name: 'Hoechstens fuenf Zeilen', cart: [1, 2, 3, 4, 5, 6, 7].map((n) => pos('p-' + n, 5000, 'Dieses Exemplar')), zeilen: 5 },
  { name: 'Zusatzprodukt ausverkauft: nichts', cart: [pos('a-1', 5000, 'Dieses Exemplar')], zeilen: 0, ausverkauft: true },
  { name: 'Leerer Warenkorb: nichts', cart: [], zeilen: 0 },
];

(async () => {
  let n = 0, fehler = 0;
  const pruefe = (name, ok, info) => { n++; if (!ok) { fehler++; console.log('FEHLER ' + name + (info ? ': ' + info : '')); } };
  for (const loc of ['de', 'en']) {
    locale = loc;
    for (const f of faelle) {
      const cart = { items: f.cart };
      const html = await engine.renderFile('etikett-vorschlag', { cart, all_products: { 'archiv-etikett': etikett(!f.ausverkauft) } });
      const z = (html.match(/class="etikett-vorschlag__zeile"/g) || []).length;
      pruefe('[' + loc + '] ' + f.name + ' (Zeilen)', z === f.zeilen, 'ist ' + z + ', soll ' + f.zeilen);
      if (f.zeilen === 0) pruefe('[' + loc + '] ' + f.name + ' (nichts ausgegeben)', html.trim() === '');
      for (const s of Array.isArray(f.erwartet) ? f.erwartet : (f.erwartet && f.erwartet[loc]) || []) pruefe('[' + loc + '] ' + f.name + ' fehlt "' + s + '"', html.includes(s));
      for (const s of f.verboten || []) pruefe('[' + loc + '] ' + f.name + ' enthaelt "' + s + '"', !html.includes(s));
      if (f.zeilen > 0) pruefe('[' + loc + '] ' + f.name + ' (Texte uebersetzt)', loc === 'de' ? html.includes('Pflanzenetikett dazu?') && html.includes('Hinzufügen') : html.includes('Add a plant label?'));
    }
  }
  // Schwelle des Snippets = Schwelle der Produktvorlage
  const snip = fs.readFileSync(path.join(THEME, 'snippets/etikett-vorschlag.liquid'), 'utf8');
  const raw = fs.readFileSync(path.join(THEME, 'templates/product.json'), 'utf8');
  const tpl = JSON.parse(raw.slice(raw.indexOf('{\n  "sections"')));
  const schwelle = Object.values(tpl.sections).flatMap((s) => Object.values(s.blocks || {})).find((b) => b.type === 'etikett').settings.schwelle;
  const m = snip.match(/assign schwelle_cent = (\d+)/);
  pruefe('Schwelle im Snippet gleich Schwelle der Vorlage', m && Number(m[1]) === schwelle * 100, 'Snippet ' + (m && m[1]) + ', Vorlage ' + schwelle * 100);
  pruefe('Skript steht im Layout (nicht im Snippet, das die Schublade neu zeichnet)', fs.readFileSync(path.join(THEME, 'layout/theme.liquid'), 'utf8').includes("'etikett-vorschlag.js' | asset_url") && !snip.includes("'etikett-vorschlag.js' | asset_url"));
  for (const [datei, was] of [['snippets/cart-drawer.liquid', 'Schublade'], ['sections/main-cart-items.liquid', 'Warenkorbseite']]) {
    pruefe(was + ' bindet den Vorschlag ein', fs.readFileSync(path.join(THEME, datei), 'utf8').includes("render 'etikett-vorschlag'"));
  }
  console.log('\n' + (n - fehler) + '/' + n + ' Pruefungen bestanden, ' + fehler + ' Fehler.');
  process.exit(fehler ? 1 : 0);
})();

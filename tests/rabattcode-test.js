// Prueft den Rabattcode im Warenkorb (snippets/rabattcode.liquid, assets/rabattcode.js) und die Einbindung.
const fs = require('fs');
const path = require('path');
const { Liquid } = require('liquidjs');
const THEME = path.join(__dirname, '..');
const strip = (s) => s.replace(/^\s*\/\*[\s\S]*?\*\//, '');
const LOC = { de: JSON.parse(strip(fs.readFileSync(path.join(THEME, 'locales/de.json'), 'utf8'))), en: JSON.parse(strip(fs.readFileSync(path.join(THEME, 'locales/en.default.json'), 'utf8'))) };
let locale = 'de';
const engine = new Liquid({ root: path.join(THEME, 'snippets'), extname: '.liquid' });
engine.registerFilter('asset_url', (v) => '/assets/' + v);
engine.registerFilter('stylesheet_tag', (v) => '<link href="' + v + '">');
engine.registerFilter('t', function (key, ...rest) {
  const opts = {};
  for (const r of rest) { if (Array.isArray(r) && typeof r[0] === 'string') opts[r[0]] = r[1]; }
  let hit = String(key).split('.').reduce((o, k) => (o == null ? undefined : o[k]), LOC[locale]);
  if (hit === undefined) throw new Error('FEHLENDER Schluessel [' + locale + ']: ' + key);
  for (const [k, v] of Object.entries(opts)) hit = hit.split('{{ ' + k + ' }}').join(String(v));
  return hit;
});
let n = 0, fehler = 0;
const pruefe = (name, ok) => { n++; if (!ok) { fehler++; console.log('FEHLER ' + name); } };
(async () => {
  const leer = await engine.renderFile('rabattcode', { cart: { cart_level_discount_applications: [] }, section: { id: 's1' } });
  pruefe('Feld mit Label, Eingabe und Knopf, zugeklappt', /<details class="rabattcode__klappe">/.test(leer) && /for="Rabattcode-s1"/.test(leer) && /name="code"/.test(leer) && /data-rabattcode-form/.test(leer) && !/rabattcode__ok/.test(leer));
  pruefe('Deutsche Texte', leer.includes('Rabattcode einlösen') && leer.includes('Einlösen'));
  const mit = await engine.renderFile('rabattcode', { cart: { cart_level_discount_applications: [{ type: 'discount_code', title: 'WILLKOMMEN' }, { type: 'automatic', title: 'Versand gratis' }] }, section: {} });
  pruefe('Angewendeter Code steht da, automatischer Rabatt nicht', mit.includes('✓ Code WILLKOMMEN angewendet') && !mit.includes('Versand gratis') && /hidden/.test(mit));
  locale = 'en';
  const en = await engine.renderFile('rabattcode', { cart: { cart_level_discount_applications: [] }, section: {} });
  pruefe('Englische Texte', en.includes('Enter discount code') && en.includes('Apply'));
  for (const [datei, was] of [['snippets/cart-drawer.liquid', 'Schublade'], ['sections/main-cart-footer.liquid', 'Warenkorbseite']]) {
    pruefe(was + ' bindet das Feld ein', fs.readFileSync(path.join(THEME, datei), 'utf8').includes("render 'rabattcode'"));
  }
  const js = fs.readFileSync(path.join(THEME, 'assets/rabattcode.js'), 'utf8');
  pruefe('Skript geht auf /discount/<Code> mit Rueckkehr in den Warenkorb', js.includes("'discount/' + encodeURIComponent(code)") && js.includes("'?redirect='"));
  pruefe('Skript im Layout geladen', fs.readFileSync(path.join(THEME, 'layout/theme.liquid'), 'utf8').includes("'rabattcode.js' | asset_url"));
  console.log('\n' + (n - fehler) + '/' + n + ' Pruefungen bestanden, ' + fehler + ' Fehler.');
  process.exit(fehler ? 1 : 0);
})();

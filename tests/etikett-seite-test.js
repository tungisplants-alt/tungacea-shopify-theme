// Prueft Kopf (sections/etikett-kopf.liquid) und Ablauf (snippets/etikett-ablauf.liquid)
// der Etikett-Seite gegen die echten Sprachdateien und die fertige Vorlage.
//
// Was nicht verloren gehen darf:
//   - Der Kopf setzt KEINE Ueberschrift erster Ebene (die steht mit dem Produktnamen)
//   - Ohne eigenes Bild steht das mitgelieferte Foto da, mit Alt-Text
//   - Der Ablauf nennt keine Zahl in Tagen (Tung hat noch keine Praxis), nur "je nach
//     Menge und Nachfrage", und die Mindestmenge fuer ein eigenes Logo kommt aus der Einstellung
//   - Die Vorlage hat Kopf + main, und der Ablauf-Block steht in block_order
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
const engine = new Liquid({ root: [path.join(THEME, 'snippets'), path.join(THEME, 'sections')], extname: '.liquid' });
require('./shopify-tags')(engine);
engine.registerFilter('asset_url', (v) => '/assets/' + v);
engine.registerFilter('stylesheet_tag', (v) => '<link rel="stylesheet" href="' + v + '">');
engine.registerFilter('image_url', (v) => v.src || v);
engine.registerFilter('image_tag', (v, o) => '<img src="' + v + '" alt="' + ((o && o.alt) || '') + '">');
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

let n = 0, fehler = 0;
function pruefe(name, ok, info) { n++; if (!ok) { fehler++; console.log('FEHLER ' + name + (info ? ': ' + info : '')); } }

(async () => {
  for (const loc of ['de', 'en']) {
    locale = loc;
    const kopf = await engine.renderFile('etikett-kopf', { section: { id: 's1', settings: { padding_top: 32, padding_bottom: 8, color_scheme: 'scheme-1', bild: null } } });
    pruefe('[' + loc + '] Kopf ohne <h1>', !/<h1/.test(kopf));
    pruefe('[' + loc + '] Kopf mit Ueberschrift, Satz und Eyebrow', kopf.includes('etikett-kopf__heading') && kopf.includes('etikett-kopf__lead') && kopf.includes('etikett-kopf__eyebrow'));
    pruefe('[' + loc + '] Mitgeliefertes Foto mit Alt-Text', kopf.includes('/assets/etikett-foto.jpg') && /alt="[^"]{20,}"/.test(kopf));
    pruefe('[' + loc + '] Text uebersetzt', loc === 'de' ? kopf.includes('Dein Name, in Acryl graviert.') : kopf.includes('Your name, engraved in acrylic.'));
    pruefe('['+loc+'] Kopf: Knopf zum Konfigurator und vier Fakten', kopf.includes('href="#etikett-konfigurator"') && (kopf.match(/etikett-kopf__fakt"/g) || []).length === 4);
    const eigen = await engine.renderFile('etikett-kopf', { section: { id: 's1', settings: { heading: 'Eigene Zeile', bild: { src: '/mein.jpg', alt: 'Mein Bild' }, color_scheme: 'scheme-1' } } });
    pruefe('[' + loc + '] Eigener Text und Bild ersetzen die Standardwerte', eigen.includes('Eigene Zeile') && eigen.includes('/mein.jpg') && !eigen.includes('etikett-foto.jpg'));
    const ablauf = await engine.renderFile('etikett-ablauf', { block: { shopify_attributes: '' }, logo_ab: 36 });
    pruefe('[' + loc + '] Ablauf: fuenf Zeilen, aufgeklappt', (ablauf.match(/etikett-fakten__zeile/g) || []).length === 5 && /<details[^>]* open/.test(ablauf));
    pruefe('[' + loc + '] Ablauf: Mindestmenge 36 kommt vor', ablauf.includes('36') && !ablauf.includes('{{'));
    pruefe('[' + loc + '] Ablauf: Mindestmenge aus der Einstellung', (await engine.renderFile('etikett-ablauf', { block: { shopify_attributes: '' }, logo_ab: 48 })).includes('48'));
    pruefe('[' + loc + '] Ablauf: keine Zahl in Tagen', !/\b\d+\s*(Werktage|Tage|days)\b/.test(ablauf));
    pruefe('[' + loc + '] Ablauf: ehrlich offen ("Menge und Nachfrage")', loc === 'de' ? ablauf.includes('Menge und Nachfrage') : ablauf.includes('quantity and demand'));
  }
  const raw = fs.readFileSync(path.join(THEME, 'templates/product.etikett.json'), 'utf8');
  const tpl = JSON.parse(raw.slice(raw.indexOf('{\n  "sections"')));
  pruefe('Vorlage: Kopf steht vor main', tpl.order[0] === 'kopf' && tpl.order[1] === 'main' && tpl.sections.kopf.type === 'etikett-kopf');
  const rawI = fs.readFileSync(path.join(THEME, 'templates/index.json'), 'utf8');
  const idx = JSON.parse(rawI.slice(rawI.indexOf('\n{\n') + 1));
  pruefe('Startseite: Etikett-Band nach dem Archiv-Teaser, mit Link zur Etikett-Seite', idx.order[idx.order.indexOf('private_archive_teaser') + 1] === 'etikett_band' && idx.sections.etikett_band.type === 'etikett-kopf' && idx.sections.etikett_band.settings.knopf_link === 'shopify://products/archiv-etikett');
  const main = tpl.sections.main;
  pruefe('Vorlage: Ablauf-Block definiert und in block_order', main.blocks.etikett_ablauf && main.block_order.includes('etikett_ablauf'));
  pruefe('Vorlage: Mindestmenge fuer eigenes Logo ist 36', main.blocks.etikett_bestellung.settings.logo_ab === 36);
  const mp = fs.readFileSync(path.join(THEME, 'sections/main-product.liquid'), 'utf8');
  pruefe('main-product: Ablauf-Block gerendert und im Schema', mp.includes("when 'etikett_ablauf'") && mp.includes('"type": "etikett_ablauf"') && mp.includes('"id": "logo_ab"'));
  const js = fs.readFileSync(path.join(THEME, 'assets/etikett-bestellung.js'), 'utf8');
  pruefe('Skript: eigenes Logo unter der Mindestmenge blockiert den Kauf', js.includes('logoZuWenig()') && js.includes('tFehlerLogo'));
  console.log('\n' + (n - fehler) + '/' + n + ' Pruefungen bestanden, ' + fehler + ' Fehler.');
  process.exit(fehler ? 1 : 0);
})();

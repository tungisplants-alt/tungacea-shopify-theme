const fs = require('fs');
const path = require('path');
const { Liquid } = require('liquidjs');

const THEME = path.join(__dirname, '..');
const strip = s => s.replace(/^\s*\/\*[\s\S]*?\*\//, '');
const locales = {
  de: JSON.parse(strip(fs.readFileSync(path.join(THEME, 'locales/de.json'), 'utf8'))),
  en: JSON.parse(strip(fs.readFileSync(path.join(THEME, 'locales/en.default.json'), 'utf8'))),
};

const NEW_DAYS = 30;
let activeLocale = 'de';

const engine = new Liquid({ root: path.join(THEME, 'snippets'), extname: '.liquid' });
engine.registerFilter('t', function (key) {
  const dict = locales[activeLocale];
  const hit = String(key).split('.').reduce((o, k) => (o == null ? undefined : o[k]), dict);
  if (hit === undefined) throw new Error('FEHLENDER Übersetzungsschlüssel [' + activeLocale + ']: ' + key);
  return hit;
});

const daysAgo = n => new Date(Date.now() - n * 86400 * 1000);

// Testmatrix: jede Zeile prüft eine andere Regel des Snippets.
const cases = [
  { name: 'Neu (vor 5 Tagen veröffentlicht)',        erwartet: ['new'],
    p: { available: true, price: 18000, compare_at_price: 0, tags: [], published_at: daysAgo(5), metafields: {} } },
  { name: 'Grenze: 29 Tage alt',                      erwartet: ['new'],
    p: { available: true, price: 18000, compare_at_price: 0, tags: [], published_at: daysAgo(29), metafields: {} } },
  { name: 'Grenze: 31 Tage alt',                      erwartet: [],
    p: { available: true, price: 18000, compare_at_price: 0, tags: [], published_at: daysAgo(31), metafields: {} } },
  { name: 'Selten per Tag',                           erwartet: ['rare'],
    p: { available: true, price: 42000, compare_at_price: 0, tags: ['Selten'], published_at: daysAgo(200), metafields: {} } },
  { name: 'Selten per Metafeld',                      erwartet: ['rare'],
    p: { available: true, price: 42000, compare_at_price: 0, tags: [], published_at: daysAgo(200),
         metafields: { custom: { is_rare: { value: true } } } } },
  { name: 'Sale',                                     erwartet: ['sale'],
    p: { available: true, price: 12000, compare_at_price: 16000, tags: [], published_at: daysAgo(200), metafields: {} } },
  { name: 'Alle drei',                                erwartet: ['new', 'rare', 'sale'],
    p: { available: true, price: 29000, compare_at_price: 38000, tags: ['selten'], published_at: daysAgo(3), metafields: {} } },
  { name: 'Verkauft + selten (kein Neu, kein Sale)',  erwartet: ['rare'],
    p: { available: false, price: 42000, compare_at_price: 55000, tags: ['rare'], published_at: daysAgo(2), metafields: {} } },
  { name: 'Nichts trifft zu',                         erwartet: [],
    p: { available: true, price: 18000, compare_at_price: 0, tags: [], published_at: daysAgo(400), metafields: {} } },
  { name: 'Tag „neubau" darf NICHT als „neu" zählen', erwartet: [],
    p: { available: true, price: 18000, compare_at_price: 0, tags: ['Neubau', 'rarely-watered'], published_at: daysAgo(400), metafields: {} } },
  { name: 'Automatik aus (0 Tage), Tag erzwingt Neu', erwartet: ['new'], newDays: 0,
    p: { available: true, price: 18000, compare_at_price: 0, tags: ['neu'], published_at: daysAgo(400), metafields: {} } },
  { name: 'Automatik aus (0 Tage), frisch, kein Tag', erwartet: [], newDays: 0,
    p: { available: true, price: 18000, compare_at_price: 0, tags: [], published_at: daysAgo(2), metafields: {} } },
  { name: 'Unicorn per Tag', erwartet: ['unicorn'],
    p: { available: true, price: 95000, compare_at_price: 0, tags: ['Unicorn'], published_at: daysAgo(200), metafields: {} } },
  { name: 'Unicorn per Metafeld', erwartet: ['unicorn'],
    p: { available: true, price: 95000, compare_at_price: 0, tags: [], published_at: daysAgo(200),
         metafields: { custom: { is_unicorn: { value: true } } } } },
  { name: 'Unicorn verdraengt Selten (Tag)', erwartet: ['unicorn'],
    p: { available: true, price: 95000, compare_at_price: 0, tags: ['selten','unicorn'], published_at: daysAgo(200), metafields: {} } },
  { name: 'Unicorn verdraengt Selten (Metafeld)', erwartet: ['unicorn'],
    p: { available: true, price: 95000, compare_at_price: 0, tags: [], published_at: daysAgo(200),
         metafields: { custom: { is_rare: { value: true }, is_unicorn: { value: true } } } } },
  { name: 'Neu + Unicorn + Sale', erwartet: ['new','unicorn','sale'],
    p: { available: true, price: 88000, compare_at_price: 120000, tags: ['unicorn'], published_at: daysAgo(4), metafields: {} } },
  { name: 'Tag „unicorns“ darf NICHT zaehlen', erwartet: [],
    p: { available: true, price: 18000, compare_at_price: 0, tags: ['unicorns'], published_at: daysAgo(400), metafields: {} } },
  { name: 'Verkauftes Unicorn: nur Unicorn', erwartet: ['unicorn'],
    p: { available: false, price: 95000, compare_at_price: 120000, tags: ['unicorn'], published_at: daysAgo(3), metafields: {} } },
];

async function renderFlags(product, locale, newDays) {
  activeLocale = locale;
  return (await engine.renderFile('specimen-card-flags', {
    product,
    settings: { specimen_new_days: newDays },
  })).trim();
}

(async () => {
  let fails = 0, checks = 0;
  const rows = [];
  for (const c of cases) {
    const nd = c.newDays === undefined ? NEW_DAYS : c.newDays;
    for (const loc of ['de', 'en']) {
      const html = await renderFlags(c.p, loc, nd);
      const found = [...html.matchAll(/specimen-card-flag-(\w+)/g)].map(m => m[1]);
      const ok = JSON.stringify(found) === JSON.stringify(c.erwartet);
      checks++;
      if (!ok) { fails++; console.log('FEHLER [' + loc + '] ' + c.name + ' -> ' + JSON.stringify(found) + ', erwartet ' + JSON.stringify(c.erwartet)); }
      if (c.erwartet.length === 0 && html !== '') { fails++; checks++; console.log('FEHLER [' + loc + '] ' + c.name + ' -> nicht leer: ' + JSON.stringify(html)); }
      if (loc === 'de') rows.push({ c, html });
    }
  }
  // Beschriftungen in beiden Sprachen belegen
  const label = await renderFlags(cases[6].p, 'en', NEW_DAYS);
  console.log('\nEN-Beschriftungen:', [...label.matchAll(/>([^<>]+)</g)].map(m => m[1].trim()).filter(Boolean).join(' | '));
  const labelDe = await renderFlags(cases[6].p, 'de', NEW_DAYS);
  console.log('DE-Beschriftungen:', [...labelDe.matchAll(/>([^<>]+)</g)].map(m => m[1].trim()).filter(Boolean).join(' | '));
  console.log('\n' + (checks - fails) + '/' + checks + ' Prüfungen bestanden, ' + fails + ' Fehler.');
  fs.writeFileSync(path.join(__dirname, 'cases.json'), JSON.stringify(cases.map(c => ({ name: c.name, erwartet: c.erwartet, newDays: c.newDays })), null, 1));
  process.exit(fails ? 1 : 0);
})();

// Prueft snippets/warenkorb-meilenstein.liquid (Balken im Warenkorb) gegen die echten Sprachdateien.
// Reihenfolge der Marken: Winterpackung (100) -> Premium-Etiketten (150) -> Versand (200).
// Winterpackung und Etiketten zaehlen den Wert der Pflanzen ohne Samen, der Versand den ganzen Warenkorb.
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

const umfang = (u) => ({ custom: { lieferumfang: u ? { value: u } : null } });
const pflanze = (cent) => ({ product: { handle: 'p', metafields: umfang('Dieses Exemplar') }, original_line_price: cent, quantity: 1 });
const samen = (cent) => ({ product: { handle: 's', metafields: umfang('Gekeimter Samen aus dieser Kreuzung') }, original_line_price: cent, quantity: 1 });
const etikett = (cent) => ({ product: { handle: 'archiv-etikett', metafields: umfang(null) }, original_line_price: cent, quantity: 1 });
const winter = (cent) => ({ product: { handle: 'winterverpackung', metafields: umfang(null) }, original_line_price: cent, quantity: 1 });
const WINTER = { handle: 'winterverpackung', selected_or_first_available_variant: { id: 999, available: true } };

async function rendere(items, settings, sprache) {
  locale = sprache || 'de';
  const gesamt = items.reduce((s, i) => s + i.original_line_price, 0);
  return engine.renderFile('warenkorb-meilenstein', {
    cart: { items, item_count: items.length, original_total_price: gesamt },
    all_products: { winterverpackung: WINTER },
    settings: settings || {},
  });
}

let n = 0, fehler = 0;
const pruefe = (name, ok) => { n++; if (!ok) { fehler++; console.log('FEHLER ' + name); } };

(async () => {
  let h = await rendere([pflanze(6000)]);
  pruefe('60 €: naechste Marke ist die Winterpackung, noch 40 €', h.includes('Noch 40 € bis zur kostenlosen Winterpackung') && !h.includes('✓'));
  pruefe('60 €: Balken steht auf 60 %', /aria-valuenow="60"/.test(h) && /width: 60%/.test(h));
  pruefe('60 €: kein Knopf', !h.includes('data-meilenstein-add'));
  h = await rendere([pflanze(10000)]);
  pruefe('100 €: Winterpackung erreicht, Knopf da, naechste Marke Etiketten (noch 50 €)', h.includes('✓ Winterpackung gratis') && h.includes('Noch 50 € bis zu den Premium-Etiketten gratis') && h.includes('data-meilenstein-add') && h.includes('data-variante="999"'));
  pruefe('100 €: Balken startet bei 0 % fuer die naechste Strecke', /aria-valuenow="0"/.test(h));
  h = await rendere([pflanze(10000), winter(0)]);
  pruefe('Winterpackung schon im Warenkorb: kein Knopf mehr', !h.includes('data-meilenstein-add') && h.includes('✓ Winterpackung gratis'));
  h = await rendere([pflanze(15000)]);
  pruefe('150 €: Etiketten erreicht, naechste Marke Versand (noch 50 €)', h.includes('✓ Premium-Etiketten gratis') && h.includes('Noch 50 € bis zum kostenlosen Versand'));
  h = await rendere([pflanze(20000)]);
  pruefe('200 €: alles erreicht, drei Haken, kein naechster Satz', (h.match(/✓/g) || []).length === 3 && h.includes('Du hast alle Vorteile erreicht.') && !h.includes('Noch '));
  h = await rendere([pflanze(8000), samen(12000)]);
  pruefe('Samen zaehlen nicht fuer die Marken der Pflanzen (80 € Pflanzen)', h.includes('Noch 20 € bis zur kostenlosen Winterpackung'));
  h = await rendere([pflanze(14000), etikett(5000)]);
  pruefe('Etiketten zaehlen nicht fuer Pflanzen-Marken, aber fuer den Versand (190 € gesamt)', h.includes('✓ Winterpackung gratis') && h.includes('Noch 10 € bis zu den Premium-Etiketten gratis'));
  h = await rendere([pflanze(14000), etikett(6000)]);
  pruefe('Versand zaehlt den ganzen Warenkorb (200 € gesamt, Pflanzen 140 €)', !h.includes('Noch 60 € bis zum kostenlosen Versand') && h.includes('Noch 10 € bis zu den Premium-Etiketten gratis'));
  h = await rendere([pflanze(10000)], { meilenstein_winter: false });
  pruefe('Winter-Marke aus: beginnt bei den Etiketten, kein Knopf, kein Haken', h.includes('Noch 50 € bis zu den Premium-Etiketten gratis') && !h.includes('Winterpackung') && !h.includes('data-meilenstein-add'));
  h = await rendere([pflanze(10000)], { meilenstein_aktiv: false });
  pruefe('Balken aus: nichts', h.trim() === '');
  pruefe('Nur Samen im Warenkorb: nichts', (await rendere([samen(3500)])).trim() === '');
  pruefe('Leerer Warenkorb: nichts', (await rendere([])).trim() === '');
  h = await rendere([pflanze(5000)], { meilenstein_winter_ab: 120, meilenstein_etikett_ab: 170, meilenstein_versand_ab: 250 });
  pruefe('Betraege aus den Einstellungen', h.includes('Noch 70 € bis zur kostenlosen Winterpackung'));
  const en = await rendere([pflanze(6000)], {}, 'en');
  pruefe('Englisch: Satz, Hinweis', en.includes('€40 to go for the free winter packaging'.replace('€40', '40€')) || /to go for the free winter packaging/.test(en));
  pruefe('Hinweis, was zaehlt', h.includes('ohne Samen'));
  // Einbindung und Einstellungen
  for (const [datei, was] of [['snippets/cart-drawer.liquid', 'Schublade'], ['sections/main-cart-items.liquid', 'Warenkorbseite']]) {
    pruefe(was + ' bindet den Balken ein', fs.readFileSync(path.join(THEME, datei), 'utf8').includes("render 'warenkorb-meilenstein'"));
  }
  const S = JSON.parse(fs.readFileSync(path.join(THEME, 'config/settings_schema.json'), 'utf8'));
  const grp = S.find((g) => g.name === 'Warenkorb-Meilensteine');
  const get = (id) => grp && grp.settings.find((s) => s.id === id);
  pruefe('Einstellungen vorhanden mit Standard 100 / 150 / 200', get('meilenstein_winter_ab').default === 100 && get('meilenstein_etikett_ab').default === 150 && get('meilenstein_versand_ab').default === 200 && get('meilenstein_aktiv').default === true && get('meilenstein_winter').default === true);
  const js = fs.readFileSync(path.join(THEME, 'assets/etikett-vorschlag.js'), 'utf8');
  pruefe('Skript bedient den Winterpackung-Knopf', js.includes('[data-meilenstein-add]'));
  console.log('\n' + (n - fehler) + '/' + n + ' Pruefungen bestanden, ' + fehler + ' Fehler.');
  process.exit(fehler ? 1 : 0);
})();

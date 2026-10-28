// Prueft snippets/catalogue-more.liquid (Fusszeile der Kollektion) gegen die
// echten Sprachdateien, mit nachgebautem paginate-Objekt.
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
engine.registerFilter('t', function (key, ...rest) {
  const opts = {};
  for (const r of rest) if (Array.isArray(r) && typeof r[0] === 'string') opts[r[0]] = r[1];
  let hit = String(key).split('.').reduce((o, k) => (o == null ? undefined : o[k]), LOC[locale]);
  if (hit === undefined) throw new Error('FEHLENDER Schluessel [' + locale + ']: ' + key);
  for (const [k, v] of Object.entries(opts)) hit = hit.split('{{ ' + k + ' }}').join(String(v));
  return hit;
});

let geprueft = 0;
let fehler = 0;
function pruefe(name, ist, soll) {
  geprueft++;
  if (JSON.stringify(ist) !== JSON.stringify(soll)) {
    fehler++;
    console.log('FEHLER  ' + name + '\n   ist:  ' + JSON.stringify(ist) + '\n   soll: ' + JSON.stringify(soll));
  }
}
const rendere = (paginate, shown) => engine.renderFile('catalogue-more', { paginate, shown, section_id: 'sec1' });

(async () => {
  // Seite 1 von 2: 12 von 14
  const erste = await rendere({ current_offset: 0, items: 14, next: { is_link: true, url: '/collections/x?page=2' } }, 12);
  pruefe('Seite 1: 12 von 14 angezeigt', /12 von 14 angezeigt/.test(erste), true);
  pruefe('Seite 1: Strich auf 85 Prozent', /width: 8[56](\.\d+)?%/.test(erste), true);
  pruefe('Seite 1: Knopf ist ein Link auf die naechste Seite', /<a class="catalogue-more__button" href="\/collections\/x\?page=2">Mehr anzeigen<\/a>/.test(erste), true);
  pruefe('Seite 1: Daten fuer das Skript', /data-next="\/collections\/x\?page=2"[\s\S]*data-shown="12"[\s\S]*data-total="14"/.test(erste) && /data-section-id="sec1"/.test(erste), true);
  pruefe('keine rohen Platzhalter', /%gezeigt%|%gesamt%/.test(erste.replace(/data-text-gezeigt="[^"]*"/, '')), false);

  // Seite 2 von 2: 2 Karten, davor 12
  const letzte = await rendere({ current_offset: 12, items: 14, next: { is_link: false } }, 2);
  pruefe('Letzte Seite: 14 von 14 angezeigt, kein Knopf', /14 von 14 angezeigt/.test(letzte) && !/catalogue-more__button/.test(letzte), true);
  pruefe('Letzte Seite: Strich voll', /width: 100%/.test(letzte), true);

  locale = 'en';
  const en = await rendere({ current_offset: 0, items: 14, next: { is_link: true, url: '/collections/x?page=2' } }, 12);
  pruefe('Englisch: Text und Knopf', /12 of 14 shown/.test(en) && />Show more</.test(en), true);
  console.log(fehler + ' Fehler in ' + geprueft + ' Pruefungen');
  process.exit(fehler ? 1 : 0);
})().catch((e) => { console.log('ABBRUCH: ' + e.message); process.exit(1); });

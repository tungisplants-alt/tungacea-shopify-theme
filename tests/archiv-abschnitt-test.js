// Prueft die Archiv-Vorlage sections/main-plant-archive.liquid.
//
// Die Vorlage durchlaeuft Produkte und Pflanzen selbst, weil paginate in Shopify
// nur wirkt, wenn der Durchlauf in derselben Datei steht (gemessen im Shop: an
// ein Snippet weitergereicht, kamen wieder nur 50 heraus). Sie baut daraus die
// Kacheln und die Werte fuer die Filter. Dieser Test prueft diese Logik; die
// Seitenteilung selbst kennt nur Shopify.
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
engine.registerFilter('image_url', (v) => String(v));
engine.registerFilter('image_tag', (v) => '<img src="' + v + '">');
engine.registerFilter('placeholder_svg_tag', () => '<svg></svg>');
engine.registerFilter('t', function (key, ...rest) {
  const opts = {};
  for (const r of rest) {
    if (Array.isArray(r) && typeof r[0] === 'string') opts[r[0]] = r[1];
    else if (r && typeof r === 'object') Object.assign(opts, r);
  }
  let hit = String(key).split('.').reduce((o, k) => (o == null ? undefined : o[k]), LOC[locale]);
  if (hit === undefined) throw new Error('FEHLENDER Schluessel [' + locale + ']: ' + key);
  if (hit && typeof hit === 'object') hit = Number(opts.count) === 1 ? hit.one : hit.other;
  for (const [k, v] of Object.entries(opts)) hit = hit.split('{{ ' + k + ' }}').join(String(v));
  return hit;
});

const feld = (v) => ({ value: v === undefined ? null : v });
const pflanze = (nr, extra) => Object.assign({
  bezeichnung: feld('Pflanze ' + nr), mutter_id: feld('TA-' + (1000 + nr)),
  stadium: feld('Jungpflanze'), generation: feld('F1'), reinheit: feld(null),
  linie: { value: [] }, merkmale: { value: [] }, zuechter: feld(null), besitzer: feld(null),
  fotos: { value: [] }, bilder: { value: [] }, fotograf: feld(null), bildfreigabe: feld(null),
  kreuzung: feld(null), merkmal: feld(null),
  system: { handle: 'p' + nr, url: '/pflanzen/p' + nr },
}, extra || {});
const produkt = (titel, verfuegbar, mutter, vater) => ({
  title: titel, available: verfuegbar,
  metafields: { custom: {
    mutterpflanze: { value: mutter ? { system: { handle: mutter } } : null },
    vaterpflanze: { value: vater ? { system: { handle: vater } } : null },
  } },
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
const rendere = (eintraege, produkte, extra = {}) => engine.renderFile('main-plant-archive', Object.assign({
  shop: { metaobjects: { mutterpflanze: { values: eintraege } } },
  collections: { all: { products: produkte } },
  section: { id: 's1', settings: { eyebrow: '', heading: '', intro: '' } },
  request: { design_mode: false },
}, extra));
const zaehle = (html, muster) => (html.match(muster) || []).length;

(async () => {
  const eintraege = [
    pflanze(1), pflanze(2, { merkmale: { value: [{ name: { value: 'Rote Aderung' } }] } }), pflanze(3), pflanze(4),
    pflanze(5, { besitzer: feld({ name: { value: 'Ree' } }) }),
    pflanze(6, { merkmale: { value: [{ name: { value: 'Samtig' } }, { name: { value: ' ' } }] } }),
  ];
  const produkte = [
    produkt('A', true, 'p1'),
    produkt('B', false, 'p2'),
    produkt('C', true, 'p3', 'p4'),
    produkt('D', true, null),
    produkt('E', true, 'p5'),
  ];
  const html = await rendere(eintraege, produkte);

  pruefe('fuenf eigene Pflanzen als Karten, die fremde nicht', zaehle(html, /<article\s+class="plant-card"/g), 5);
  pruefe('Karten stehen als Listenpunkte im Raster', zaehle(html, /<li>\s*<article/g), 5);
  const jaNein = [...html.matchAll(/data-angebot="(ja|nein)"/g)].map((m) => m[1]);
  pruefe('Angebot: Mutter (p1), Mutter (p3) und Vater (p4) ja; verkauft (p2) und ohne Pflanze nein', jaNein, ['ja', 'nein', 'ja', 'ja', 'nein']);
  pruefe('Zeile "Exemplare ... bis ..." steht nicht mehr im Archiv', /TA-1001 bis TA-1006|TA-1001 to TA-1006|plant-archive-range/.test(html), false);
  pruefe('Suchleiste ist da', /data-testid="plant-search"/.test(html), true);
  pruefe('Schnellwahl bietet das Angebot an (trennt: 3 von 5)', /data-einstieg="angebot"/.test(html), true);
  pruefe('Merkmal aus der Auswahl wird zum Schalter, leerer Name nicht', /data-facet="merkmale"/.test(html) && !/data-wert="\s*"/.test(html), true);
  pruefe('fremde Pflanze speist nichts ein: ID TA-1005 steht nirgends im Archiv', /TA-1005/.test(html), false);

  // Reihenfolge der Schnellwahl: Alle, Angebot vorhanden, Mutterpflanze, Etabliert,
  // Jungpflanze, dann Steckling/Klon und gekeimter Samen.
  const stufen = ['Jungpflanze', 'Samen', 'Etabliert', 'Steckling', 'Mutterpflanze'].map((st, i) => pflanze(i + 1, { stadium: feld(st), besitzer: feld(null) }));
  const h2 = await rendere(stufen, [produkt('A', true, 'p1')]);
  const nav = h2.slice(h2.indexOf('plant-search__tabs'), h2.indexOf('</nav>', h2.indexOf('plant-search__tabs')));
  const folge = [...nav.matchAll(/data-einstieg="(alle|angebot|stadium)"(?:\s+data-wert="([^"]*)")?/g)].map((m) => (m[1] === 'stadium' ? m[2] : m[1]));
  pruefe('Schnellwahl im Archiv: Alle, Angebot, Mutterpflanze, Etabliert, Jungpflanze, Steckling, Samen', folge, ['alle', 'angebot', 'Mutterpflanze', 'Etabliert', 'Jungpflanze', 'Steckling', 'Samen']);
  pruefe('Samen traegt im Archiv die Aufschrift Gekeimter Samen', />Gekeimter Samen </.test(nav), true);

  // Ohne Produkte kein Angebot, kein Fehler.
  const ohne = await rendere(eintraege, []);
  pruefe('ohne Produkte kein Angebot und keine Angebots-Schnellwahl', zaehle(ohne, /data-angebot="ja"/g) === 0 && !/data-einstieg="angebot"/.test(ohne), true);

  // Ohne Pflanzen keine Galerie, kein Fehler.
  const leer = await rendere([], produkte);
  pruefe('ohne Pflanzen keine Karten', zaehle(leer, /<article/g), 0);

  // Selbstpruefung im Editor: meldet die Liste mehr Eintraege als geladen wurden.
  const viele = Array.from({ length: 3 }, (_, i) => pflanze(i + 1));
  viele.size = 60; // nur zum Test: die Liste behauptet 60, der Durchlauf liefert 3
  const warnung = await rendere(viele, [], { request: { design_mode: true }, shop: { metaobjects: { mutterpflanze: { values: viele } } } });
  pruefe('Editor-Warnung erscheint, wenn weniger geladen als vorhanden', /data-testid="plant-archive-warning"/.test(warnung), true);
  const keineWarnung = await rendere(viele.slice(0, 3), [], { request: { design_mode: true } });
  pruefe('keine Warnung, wenn alles geladen ist', /plant-archive-warning/.test(keineWarnung), false);
  const besucher = await rendere(viele, [], { request: { design_mode: false } });
  pruefe('Besucher sehen nie eine Warnung', /plant-archive-warning/.test(besucher), false);

  // Englisch: dieselbe Vorlage, keine deutsche Beschriftung der Leiste.
  locale = 'en';
  const en = await rendere(eintraege, produkte);
  pruefe('Englisch rendert ohne fehlenden Schluessel', zaehle(en, /<article\s+class="plant-card"/g), 5);

  const archivCss = require('fs').readFileSync(require('path').join(__dirname, '..', 'assets/component-plant-archive.css'), 'utf8');
  pruefe('ausgeblendete Pflanzen (hidden) bleiben trotz display: flex unsichtbar', /\.plant-archive__grid > li\[hidden\]\s*\{\s*display:\s*none/.test(archivCss), true);

  console.log(fehler + ' Fehler in ' + geprueft + ' Pruefungen');
  process.exit(fehler ? 1 : 0);
})().catch((e) => { console.log('ABBRUCH: ' + e.message); process.exit(1); });

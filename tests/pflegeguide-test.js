// Prueft den Pflegeguide: sections/main-care-guide.liquid gegen die ECHTEN
// Sprachdateien, dazu die Zeile "Pflegeanleitung" (snippets/pflege-zeile.liquid)
// und den Link am Hinweistext im Passport.
//
// Leere Felder und leere Kapitel muessen verschwinden, auch in der Kapitel-
// Leiste; die Einheiten (kPa, umol/m2/s, Grad, mS/cm) setzt die Vorlage; der
// Disclaimer steht immer; die Produktseite verlinkt nur, wenn es die Seite gibt.
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

let geprueft = 0;
let fehler = 0;
function pruefe(name, ist, soll) {
  geprueft++;
  if (JSON.stringify(ist) !== JSON.stringify(soll)) {
    fehler++;
    console.log('FEHLER  ' + name + '\n   ist:  ' + JSON.stringify(ist) + '\n   soll: ' + JSON.stringify(soll));
  }
}

const block = (type, settings) => ({ type, settings, shopify_attributes: '' });
async function rendere(blocks, einstellungen = {}, sprache = 'de', nummer = '+49 179 1627287') {
  locale = sprache;
  return engine.renderFile('main-care-guide', {}, {
    globals: {
      section: { id: 's1', blocks, settings: { color_scheme: 'scheme-1', padding_bottom: 80, ...einstellungen } },
      settings: { whatsapp_nummer: nummer },
      template: { name: 'page' },
      product: null,
    },
  });
}
const zaehle = (h, re) => (h.match(re) || []).length;

(async () => {
  // Nur Stadien, ohne Inhalt: so liefert die Vorlage aus.
  const leer = await rendere(['steckling', 'etabliert', 'jungpflanze', 'saemling', 'samen', 'mutterpflanze'].map((s) => block('stadium', { stadium: s })));
  pruefe('sechs Stadien als aufklappbare Kaesten', zaehle(leer, /<details class="care-guide__stage"/g), 6);
  pruefe('Reihenfolge wie im Shop', ['Steckling/Klon', 'Etabliert', 'Jungpflanze', 'Sämling', 'Gekeimter Samen', 'Mutterpflanze'].map((w) => leer.indexOf('>' + w + '<')).every((v, i, a) => v > 0 && (i === 0 || v > a[i - 1])), true);
  pruefe('alle Kaesten zu (kein open)', /<details[^>]*\sopen/.test(leer), false);
  pruefe('leeres Stadium zeigt "Inhalt folgt."', zaehle(leer, /Inhalt folgt\./g), 6);
  pruefe('ohne Bedingungen, Naehrstoffe, Wasser: keine solchen Kapitel', /id="bedingungen"|id="naehrstoffe"|id="wasser"/.test(leer), false);
  pruefe('Kapitel-Leiste nennt nur Stadien (und Fragen)', zaehle(leer, /care-guide__nav-link/g), 2);
  pruefe('Stadienkapitel ist Nummer 01', /0 *1<\/p>\s*<h2[^>]*>Pflege nach Stadium/.test(leer) || /care-guide__number">01<\/p>/.test(leer), true);
  pruefe('Stufen 1 bis 5, Mutterpflanze heisst Zucht', ['Stufe 1', 'Stufe 2', 'Stufe 3', 'Stufe 4', 'Stufe 5', 'Zucht'].every((w) => leer.includes('>' + w + '<')), true);
  pruefe('Disclaimer steht immer', /care-guide__disclaimer/.test(leer) && /Das sind meine eigenen Erfahrungen unter meinen Bedingungen/.test(leer) && /von Empfehlungen aus Studien abweichen/.test(leer), true);
  pruefe('Kopf mit Ueberschrift und Foto-Variable', /So pflege ich meine Anthurien\./.test(leer) && /--guide-bild: url\('\/assets\/tungacea-archiv-kopf\.jpg'\)/.test(leer), true);

  // Voller Inhalt.
  const voll = await rendere([
    block('bedingung', { name: 'Substrat', wert: 'meine Mischung' }),
    block('bedingung', { name: 'Leer', wert: '' }),
    block('stadium', { stadium: 'steckling', kurz: 'Ein Satz.', vpd: '0,8–1,0', ppfd: '150–250', temperatur: '22–26', ec: '0,6–0,8', text: '<p>Ausfuehrlich.</p>' }),
    block('stadium', { stadium: 'samen', vpd: '0,6' }),
    block('naehrstoff', { name: 'Dünger A', art: 'basis', zweck: 'Wachstum', dosierung: '1 ml/l' }),
    block('naehrstoff', { name: 'Zusatz B', art: 'zusatz' }),
    block('wasser', { stadium: 'steckling', ph: '5,8', ec: '0,6' }),
    block('wasser', { stadium: 'etabliert', ph: '', ec: '' }),
  ], { ph_ziel: '5,8', ec_ziel: '', disclaimer: '' });
  pruefe('Kapitel in Reihenfolge 01 bis 04', ['id="bedingungen"', 'id="stadien"', 'id="naehrstoffe"', 'id="wasser"'].map((w) => voll.indexOf(w)).every((v, i, a) => v > 0 && (i === 0 || v > a[i - 1])), true);
  pruefe('Nummern 01 02 03 04', ['01', '02', '03', '04'].every((n) => voll.includes('care-guide__number">' + n + '<')), true);
  pruefe('Bedingung mit Wert steht da, leere nicht', /Substrat/.test(voll) && /meine Mischung/.test(voll) && !/>Leer</.test(voll), true);
  pruefe('Einheit VPD in kPa', /VPD 0,8–1,0 kPa/.test(voll), true);
  pruefe('Einheit PPFD in µmol/m²/s', /PPFD 150–250 µmol\/m²\/s/.test(voll), true);
  pruefe('Einheit Temperatur in °C', /22–26 °C/.test(voll), true);
  pruefe('Einheit EC in mS/cm', /EC 0,6–0,8 mS\/cm/.test(voll), true);
  pruefe('Stadium mit nur einem Wert zeigt nur diese Zahl', /VPD 0,6 kPa/.test(voll) && zaehle(voll, /care-guide__figures/g) === 2, true);
  pruefe('ausfuehrlicher Text und Ein-Satz-Zeile', /Ausfuehrlich\./.test(voll) && /Ein Satz\./.test(voll), true);
  pruefe('Basis und Zusatz als Marke', />Basis</.test(voll) && />Zusatz</.test(voll), true);
  pruefe('Naehrstoff ohne Zweck und Dosierung zeigt nur den Namen', /Zusatz B/.test(voll) && zaehle(voll, /care-guide__dose/g) === 1, true);
  pruefe('pH-Kachel da, EC-Kachel fehlt (leer)', /<small>pH<\/small><b>5,8<\/b>/.test(voll) && !/<small>EC<\/small>/.test(voll), true);
  pruefe('Wasserzeile mit Werten, leere Zeile nicht', /pH 5,8 · EC 0,6/.test(voll) && zaehle(voll, /class="care-guide__fact"/g) === 2, true);
  pruefe('Kapitel-Leiste: vier Kapitel plus Fragen', zaehle(voll, /care-guide__nav-link/g), 5);
  pruefe('Fragen-Knopf ist der WhatsApp-Link', /care-guide__button/.test(voll) && /wa\.me\/491791627287/.test(voll), true);
  pruefe('ohne gueltige Nummer: kein Fragen-Block, kein Fragen-Reiter', /care-guide__questions|href="#fragen"/.test(await rendere([block('stadium', { stadium: 'steckling' })], {}, 'de', '')), false);

  // Englisch und eigener Disclaimer.
  const en = await rendere([block('stadium', { stadium: 'samen', vpd: '0,6' }), block('stadium', { stadium: 'saemling' })], {}, 'en');
  pruefe('Englisch: Titel, Disclaimer, Stadien', /How I care for my Anthuriums\./.test(en) && /These are my own experiences under my own conditions/.test(en) && />Sprouted seed</.test(en) && />Seedling</.test(en), true);
  pruefe('Englisch: Stufe und Einheit', />Stage 1</.test(en) && /VPD 0,6 kPa/.test(en) && />Content coming soon\.</.test(en), true);
  pruefe('Englisch: kein deutsches Wort in Beschriftungen', /Stufe|Inhalt folgt|Pflege nach|Gekeimter|Sämling/.test(en), false);
  pruefe('eigener Disclaimer ersetzt den Standard', /Mein Text/.test(await rendere([], { disclaimer: 'Mein Text' })) && !/Das sind meine eigenen Erfahrungen/.test(await rendere([], { disclaimer: 'Mein Text' })), true);

  // Produktseite.
  const zeile = async (seite, sprache = 'de') => {
    locale = sprache;
    return engine.renderFile('pflege-zeile', { block: { settings: { titel: '', text: '' }, shopify_attributes: '' } }, { globals: { pages: seite ? { pflegeguide: { url: '/pages/pflegeguide' } } : {} } });
  };
  const mit = await zeile(true);
  pruefe('Zeile "Pflegeanleitung" mit Link zum Anfang des Guides (ohne Anker)', /Pflegeanleitung/.test(mit) && /href="\/pages\/pflegeguide"/.test(mit) && !/pflegeguide#/.test(mit), true);
  pruefe('Zeile ohne Seite: gar nichts', (await zeile(false)).trim(), '');
  pruefe('Zeile auf Englisch', /Care guide/.test(await zeile(true, 'en')) && /To the care guide/.test(await zeile(true, 'en')), true);
  const passport = fs.readFileSync(path.join(THEME, 'snippets/specimen-passport.liquid'), 'utf8');
  pruefe('Hinweistext im Passport traegt den Link zum Guide, nur wenn die Seite existiert', /pages\['pflegeguide'\]/.test(passport) && /specimen-passport__hint-link/.test(passport) && /products\.product\.pflege\.link/.test(passport), true);

  // Vorlage.
  const vorlage = JSON.parse(strip(fs.readFileSync(path.join(THEME, 'templates/page.pflegeguide.json'), 'utf8')));
  pruefe('Seitenvorlage page.pflegeguide hat den Abschnitt und sechs Stadien', vorlage.sections.main.type === 'main-care-guide' && vorlage.sections.main.block_order.length === 6, true);

  console.log(fehler + ' Fehler in ' + geprueft + ' Pruefungen');
  process.exit(fehler ? 1 : 0);
})().catch((e) => { console.log('ABBRUCH: ' + e.message); process.exit(1); });

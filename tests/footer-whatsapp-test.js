// Prueft das WhatsApp-Symbol in der Fusszeile: snippets/whatsapp-option.liquid
// im Symbol-Modus. Es nutzt dieselbe Nummer-Pruefung wie der Schreib-mir-Knopf;
// eine Nummer, die keine ist, gibt nichts aus, damit kein Link ins Leere fuehrt.
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
engine.registerFilter('inline_asset_content', (v) => '<svg class="icon icon-whatsapp" data-datei="' + v + '"></svg>');
engine.registerFilter('t', function (key) {
  const hit = String(key).split('.').reduce((o, k) => (o == null ? undefined : o[k]), LOC[locale]);
  if (hit === undefined) throw new Error('FEHLENDER Schluessel [' + locale + ']: ' + key);
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

async function rendere(nummer, sprache = 'de') {
  locale = sprache;
  return engine.renderFile('whatsapp-option', {
    symbol: true, css_laden: false, klasse: 'tungacea-footer__social-link link',
  }, { globals: { settings: { whatsapp_nummer: nummer }, template: { name: 'index' }, product: null } });
}

(async () => {
  const de = await rendere('+49 179 1627287');
  pruefe('Link auf wa.me mit Ziffern und Vorwahl', /href="https:\/\/wa\.me\/491791627287\?text=/.test(de), true);
  pruefe('nur das Symbol, kein sichtbarer Text', /icon-whatsapp/.test(de) && !/whatsapp-contact__hint|schnellere Antwort/.test(de), true);
  pruefe('Icon-Datei icon-whatsapp.svg', /data-datei="icon-whatsapp\.svg"/.test(de), true);
  pruefe('Beschriftung fuer Screenreader (Deutsch)', /aria-label="Per WhatsApp"/.test(de), true);
  pruefe('oeffnet in neuem Tab, sicher', /target="_blank"/.test(de) && /rel="noopener noreferrer"/.test(de), true);
  pruefe('Klasse der Fusszeile am Link', /class="tungacea-footer__social-link link"/.test(de), true);
  const en = await rendere('0179 1627287', 'en');
  pruefe('fuehrende 0 wird zu 49', /wa\.me\/491791627287/.test(en), true);
  pruefe('Beschriftung auf Englisch', /aria-label="On WhatsApp"/.test(en), true);
  pruefe('keine Nummer: gar nichts', (await rendere('')).trim(), '');
  pruefe('ungueltige Nummer: gar nichts', (await rendere('abc')).trim(), '');

  const footer = fs.readFileSync(path.join(THEME, 'sections/footer.liquid'), 'utf8');
  pruefe('Fusszeile bindet das Symbol neben Instagram ein', /render 'whatsapp-option', symbol: true/.test(footer) && /icon-instagram\.svg/.test(footer), true);
  pruefe('Fusszeile respektiert den Schalter whatsapp_aktiv', /settings\.whatsapp_aktiv != false/.test(footer), true);
  pruefe('Icon-Datei liegt im Theme', fs.existsSync(path.join(THEME, 'assets/icon-whatsapp.svg')), true);

  console.log(fehler + ' Fehler in ' + geprueft + ' Pruefungen');
  process.exit(fehler ? 1 : 0);
})().catch((e) => { console.log('ABBRUCH: ' + e.message); process.exit(1); });

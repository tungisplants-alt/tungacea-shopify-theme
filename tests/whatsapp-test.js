// Prueft den Schreib-mir-Knopf: snippets/whatsapp-contact.liquid gegen die ECHTEN
// Sprachdateien.
//
// Der Knopf ist ein Link auf wa.me. Ein falscher Link faellt nicht auf, er fuehrt
// einfach zu einer Seite "Nummer ungueltig", und der Kunde schreibt nicht. Darum
// wird hier die fertige Adresse geprueft, Zeichen fuer Zeichen:
//   - die Nummer steht nur mit Ziffern und Laendervorwahl im Pfad (kein +, kein
//     Leerzeichen, keine fuehrende 0)
//   - eine Nummer, die keine ist, blendet den Knopf aus, statt ins Leere zu fuehren
//   - der Satz ist kodiert, auch bei Anfuehrungszeichen, & und Sonderzeichen im
//     Produktnamen, und enthaelt kein rohes + fuer ein Leerzeichen
//   - Deutsch und Englisch kommen aus den Sprachdateien, nicht aus dem Snippet
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
// Wie der t-Filter in den anderen Pruefstaenden: wirft bei fehlendem Schluessel
// oder nicht ersetztem Platzhalter.
engine.registerFilter('t', function (key, ...rest) {
  const opts = {};
  for (const r of rest) {
    if (Array.isArray(r) && typeof r[0] === 'string') opts[r[0]] = r[1];
    else if (r && typeof r === 'object') Object.assign(opts, r);
  }
  let hit = String(key).split('.').reduce((o, k) => (o == null ? undefined : o[k]), LOC[locale]);
  if (hit === undefined) throw new Error('FEHLENDER Schluessel [' + locale + ']: ' + key);
  for (const [k, v] of Object.entries(opts)) hit = hit.split('{{ ' + k + ' }}').join(String(v));
  if (/\{\{/.test(hit)) throw new Error('Platzhalter nicht ersetzt: ' + key);
  return hit;
});

async function render(settings, { template = 'index', produkt = null, sprache = 'de' } = {}) {
  locale = sprache;
  return engine.renderFile('whatsapp-contact', {}, {
    globals: { settings, template: { name: template }, product: produkt },
  });
}
// Was der Browser aus dem Attribut macht: erst HTML zuruecknehmen, dann ist es die URL.
const unescapeHtml = (s) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const rohHref = (html) => (html.match(/href="([^"]*wa\.me[^"]*)"/) || [])[1];
const href = (html) => { const r = rohHref(html); return r === undefined ? undefined : unescapeHtml(r); };
const text = (html) => decodeURIComponent((href(html) || '').split('?text=')[1] || '');

let geprueft = 0;
let fehler = 0;
function pruefe(name, ist, soll) {
  geprueft++;
  if (JSON.stringify(ist) !== JSON.stringify(soll)) {
    fehler++;
    console.log('FEHLER  ' + name + '\n   ist:  ' + JSON.stringify(ist) + '\n   soll: ' + JSON.stringify(soll));
  }
}

(async () => {
  const gut = { whatsapp_nummer: '+49 179 1627287' };

  // ---- Die Nummer ---------------------------------------------------------
  {
    const h = href(await render(gut));
    pruefe('Nummer mit Plus und Leerzeichen: nur Ziffern im Pfad', h.split('?')[0], 'https://wa.me/491791627287');
    pruefe('kein Plus und kein Leerzeichen vor dem Fragezeichen', /[+ ]/.test(h.split('?')[0]), false);
  }
  const gleiche = {
    'fuehrende 0': '0179 1627287',
    'mit 0049': '0049 179 1627287',
    'mit Bindestrichen': '+49-179-1627287',
    'mit Klammern und Schraegstrich': '+49 (0179) 16 27 287'.replace('(0179)', '179'),
    'ohne Plus': '491791627287',
  };
  for (const [name, nr] of Object.entries(gleiche)) {
    const h = href(await render({ whatsapp_nummer: nr }));
    pruefe('Schreibweise "' + name + '" ergibt dieselbe Nummer', h && h.split('?')[0], 'https://wa.me/491791627287');
  }
  for (const [name, nr] of Object.entries({
    leer: '', 'nur Leerzeichen': '   ', 'zu kurz': '12345', 'Buchstaben': '+49 179 abc4567',
    'zu lang': '+49 179 16272871234567', 'nur Plus': '+',
  })) {
    const html = await render({ whatsapp_nummer: nr });
    pruefe('ungueltige Nummer "' + name + '": kein Knopf', html.trim() === '' || !/wa\.me/.test(html), true);
    pruefe('ungueltige Nummer "' + name + '": kein Link ins Leere', /href="[^"]*wa\.me/.test(html), false);
  }
  pruefe('Nummer fehlt ganz: kein Knopf', /wa\.me/.test(await render({})), false);

  // ---- Ein und Aus --------------------------------------------------------
  pruefe('abgeschaltet: kein Knopf', /wa\.me/.test(await render({ ...gut, whatsapp_aktiv: false })), false);
  pruefe('eingeschaltet: Knopf', /wa\.me/.test(await render({ ...gut, whatsapp_aktiv: true })), true);
  pruefe('Schalter nicht gesetzt: Knopf (Vorgabe ist an)', /wa\.me/.test(await render(gut)), true);

  // ---- Der Satz -----------------------------------------------------------
  pruefe('Startseite: allgemeiner Satz', text(await render(gut)), 'Hallo Tung, ich habe eine Frage zu Tungacea.');
  pruefe('Produktseite: Produktname im Satz',
    text(await render(gut, { template: 'product', produkt: { title: 'Anthurium Papillilaminum Marie' } })),
    'Hallo Tung, ich habe eine Frage zu Anthurium Papillilaminum Marie.');
  pruefe('Produktseite ohne Titel: allgemeiner Satz',
    text(await render(gut, { template: 'product', produkt: { title: '' } })),
    'Hallo Tung, ich habe eine Frage zu Tungacea.');
  pruefe('anderes Template mit Produkt im Hintergrund: allgemeiner Satz',
    text(await render(gut, { template: 'collection', produkt: { title: 'Soll nicht erscheinen' } })),
    'Hallo Tung, ich habe eine Frage zu Tungacea.');

  const schwer = [
    ['Anfuehrungszeichen', 'Anthurium Pap RA18 x "Dadbod"'],
    ['Apostroph und Hochkomma', "Anthurium Black Widow '13' x '43' #2"],
    ['typografische Zeichen', 'Anthurium Papillilaminum ´Marie´'],
    ['Umlaut und &', 'Anthurium Tüte & Töpfchen'],
    ['spitze Klammern', 'Anthurium <b>fett</b> & "x"'],
    ['Raute und Prozent', 'Anthurium #4 100% rot'],
  ];
  for (const [name, titel] of schwer) {
    const html = await render(gut, { template: 'product', produkt: { title: titel } });
    const h = href(html);
    pruefe('Produktname mit ' + name + ': Satz kommt unverfaelscht an', text(html), 'Hallo Tung, ich habe eine Frage zu ' + titel + '.');
    pruefe('Produktname mit ' + name + ': kein rohes + im Satz', /\+/.test(h.split('?text=')[1]), false);
    pruefe('Produktname mit ' + name + ': in der Adresse kein Anfuehrungszeichen, <, >, Leerzeichen oder &', /["<>& ]/.test(h), false);
    pruefe('Produktname mit ' + name + ': im Attribut selbst kein rohes " , < oder >', /["<>]/.test(rohHref(html)), false);
    pruefe('Produktname mit ' + name + ': genau ein Fragezeichen und ein text-Parameter', (h.match(/\?/g) || []).length === 1 && (h.match(/text=/g) || []).length === 1, true);
  }
  pruefe('kein Skript im Produktnamen im Seitentext',
    /<script|<b>/.test(await render(gut, { template: 'product', produkt: { title: '<script>x</script><b>' } })), false);

  // ---- Deutsch und Englisch -----------------------------------------------
  {
    const de = await render(gut, { template: 'product', produkt: { title: 'Anthurium X' }, sprache: 'de' });
    const en = await render(gut, { template: 'product', produkt: { title: 'Anthurium X' }, sprache: 'en' });
    pruefe('Deutsch: Text im Knopf', />Schreib mir</.test(de), true);
    pruefe('Deutsch: Beschriftung fuer Screenreader', /aria-label="Schreib mir per WhatsApp"/.test(de), true);
    pruefe('Deutsch: Satz', text(de), 'Hallo Tung, ich habe eine Frage zu Anthurium X.');
    pruefe('Englisch: Text im Knopf', />Message me</.test(en), true);
    pruefe('Englisch: Beschriftung fuer Screenreader', /aria-label="Message me on WhatsApp"/.test(en), true);
    pruefe('Englisch: Satz', text(en), 'Hi Tung, I have a question about Anthurium X.');
    pruefe('Englisch: kein deutsches Wort im Knopf', /Schreib|Hallo|Frage/.test(en), false);
    pruefe('beide Sprachen: dieselbe Nummer', href(de).split('?')[0], href(en).split('?')[0]);
    // WCAG 2.5.3: Der Name fuer Screenreader muss den sichtbaren Text enthalten.
    pruefe('Deutsch: aria-label enthaelt den sichtbaren Text', 'Schreib mir per WhatsApp'.includes('Schreib mir'), true);
    pruefe('Englisch: aria-label enthaelt den sichtbaren Text', 'Message me on WhatsApp'.includes('Message me'), true);
  }

  // ---- Aufbau des Links ---------------------------------------------------
  {
    const html = await render(gut);
    pruefe('oeffnet in neuem Fenster', /target="_blank"/.test(html), true);
    pruefe('mit noopener noreferrer', /rel="noopener noreferrer"/.test(html), true);
    pruefe('Hinweis auf neues Fenster fuer Screenreader', /aria-describedby="a11y-new-window-message"/.test(html), true);
    pruefe('Symbol ist fuer Screenreader versteckt', /<svg[^>]*aria-hidden="true"/.test(html), true);
    pruefe('Stylesheet wird geladen', /component-whatsapp-contact\.css/.test(html), true);
    pruefe('Link ist https', /href="https:\/\/wa\.me\//.test(html), true);
  }

  console.log(fehler + ' Fehler in ' + geprueft + ' Pruefungen');
  process.exit(fehler ? 1 : 0);
})().catch((e) => {
  console.log('ABBRUCH: ' + e.message);
  process.exit(1);
});

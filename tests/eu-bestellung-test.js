// Prueft die Klappzeile "Bestellung aus der EU" auf der Produktseite:
// snippets/eu-bestellung.liquid gegen die ECHTEN Sprachdateien.
//
// Der Knopf kommt aus snippets/whatsapp-option.liquid, es wird also keine
// zweite Nummer getippt. Ohne gueltige Nummer darf die ganze Zeile fehlen,
// sonst stuende dort eine Einladung ohne Knopf.
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
const dec = (h) => { try { return decodeURIComponent(h); } catch (e) { return h; } };
engine.registerFilter('asset_url', (v) => '/assets/' + v);
engine.registerFilter('stylesheet_tag', (v) => '<link rel="stylesheet" href="' + v + '">');
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

async function render(einstellungen = {}, { sprache = 'de', nummer = '+49 179 1627287' } = {}) {
  locale = sprache;
  return engine.renderFile('eu-bestellung', {}, {
    globals: {
      block: { id: 'b2', shopify_attributes: 'data-shopify-editor-block="b2"', settings: einstellungen },
      settings: { whatsapp_nummer: nummer },
      template: { name: 'product' },
      product: { title: 'Anthurium Test' },
    },
  });
}

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
  {
    const html = await render();
    pruefe('Titel Deutsch', />Bestellung aus der EU<\/span>/.test(html), true);
    pruefe('Text Deutsch: bisher nur Deutschland, woanders in der EU, WhatsApp, Weg zur Sammlung', /Bisher versende ich nur innerhalb Deutschlands\. Wohnst du woanders in der EU und interessierst dich für eine Pflanze, schreib mir bei WhatsApp\. Wir finden einen Weg, wie sie bald bei dir in der Sammlung stehen kann\./.test(html), true);
    pruefe('ist ein details mit genau einer summary', /<details class="produkt-klappe produkt-klappe--eu"/.test(html) && (html.match(/<summary/g) || []).length === 1, true);
    pruefe('zugeklappt zu Beginn', /<details[^>]* open/.test(html), false);
    pruefe('Editor-Attribut gesetzt', /data-shopify-editor-block="b2"/.test(html), true);
    const inhalt = (html.match(/<div class="produkt-klappe__inhalt">([\s\S]*?)<\/div>\s*<\/details>/) || [])[1] || '';
    pruefe('WhatsApp-Link steht im aufklappbaren Teil, nach dem Text', inhalt.indexOf('wa.me') > inhalt.indexOf('produkt-klappe__text'), true);
    pruefe('Link fuehrt zur eigenen Nummer, nur Ziffern', /href="https:\/\/wa\.me\/491791627287\?text=/.test(html), true);
    const satz = dec((html.match(/\?text=([^"]*)"/) || [])[1] || '');
    pruefe('Satz: EU, nicht Deutschland, Produkt, Platz fuer das Land', /Hallo Tung, ich wohne in der EU, aber nicht in Deutschland, und möchte gern Anthurium Test bestellen\. Mein Land:$/.test(satz.replace(/&amp;/g, '&')), true);
    pruefe('Link oeffnet in neuem Tab sicher', /target="_blank"\s+rel="noopener noreferrer"/.test(html), true);
    pruefe('kein zweiter Hinweis "schnellere Antwort" im Knopf', /schnellere Antwort/i.test(inhalt.replace(/<p class="produkt-klappe__text">[\s\S]*?<\/p>/, '')), false);
    pruefe('kein Stylesheet-Link im Snippet', /<link/.test(html), false);
  }
  {
    const html = await render({}, { sprache: 'en' });
    pruefe('Apostroph im Text wird nicht doppelt maskiert', !/&amp;#39;/.test(html), true);
    pruefe('neue englische Texte ohne Apostroph (Shopify maskiert sie in t, auch im WhatsApp-Satz)', ['eu_bestellung.titel', 'eu_bestellung.text'].every((k) => !/'/.test(LOC.en.products.product[k.split('.')[0]][k.split('.')[1]])) && !/'/.test(LOC.en.whatsapp_contact.message_eu) && !/'/.test(LOC.en.whatsapp_contact.message_eu_product), true);
    pruefe('Titel Englisch', />Ordering from another EU country<\/span>/.test(html), true);
    pruefe('Text Englisch', /So far I only ship within Germany\. If you live elsewhere in the EU and are interested in a plant, message me on WhatsApp and we will find a way to get it into your collection soon\./.test(html), true);
    const satz = dec((html.match(/\?text=([^"]*)"/) || [])[1] || '').replace(/&amp;/g, '&').replace(/&#39;/g, "'");
    pruefe('Satz Englisch', /^Hi Tung, I live in the EU, but not in Germany, and I would like to order Anthurium Test\. My country:$/.test(satz), true);
  }
  {
    locale = 'de';
    const alt = await engine.renderFile('whatsapp-option', {}, { globals: { settings: { whatsapp_nummer: '+49 179 1627287' }, template: { name: 'product' }, product: { title: 'X' } } });
    pruefe('normaler Knopf bleibt beim Fragesatz', /Frage%20zu%20X/.test(alt), true);
  }
  {
    const html = await render({ titel: '  Aus dem Ausland  ', text: 'Eigener <b>Text</b>' });
    pruefe('eigener Titel aus dem Editor (getrimmt)', />Aus dem Ausland<\/span>/.test(html), true);
    pruefe('eigener Text ist maskiert', /Eigener &lt;b&gt;Text&lt;\/b&gt;/.test(html) && !/<b>/.test(html), true);
  }
  for (const nr of ['', 'x', '123', '+49 (0) abc']) {
    const html = await render({}, { nummer: nr });
    pruefe('ohne gueltige Nummer (' + JSON.stringify(nr) + ') keine Zeile', html.trim(), '');
  }
  {
    const abschnitt = fs.readFileSync(path.join(THEME, 'sections/main-product.liquid'), 'utf8');
    const schema = JSON.parse(abschnitt.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/)[1]);
    const b = schema.blocks.find((x) => x.type === 'eu_bestellung') || { settings: [] };
    pruefe('Block "eu_bestellung" im Schema, limit 1', b.limit, 1);
    pruefe('Stylesheet des Knopfs laedt im Kopf des Abschnitts', /'component-whatsapp-contact\.css' \| asset_url \| stylesheet_tag/.test(abschnitt), true);
    pruefe('Block wird ausgegeben (when)', /\{%-?\s*when 'eu_bestellung'\s*-?%\}\s*\{%\s*render 'eu-bestellung', block: block\s*%\}/.test(abschnitt), true);
    pruefe('Einstellungen titel und text', b.settings.map((s) => s.id).filter(Boolean), ['titel', 'text']);
    const vorlage = JSON.parse(strip(fs.readFileSync(path.join(THEME, 'templates/product.json'), 'utf8')));
    const bl = vorlage.sections.main.blocks.eu_bestellung;
    pruefe('Block steht in der Produktvorlage', bl && bl.type, 'eu_bestellung');
    const ord = vorlage.sections.main.block_order;
    pruefe('Zeile steht unter "Hast du Fragen?" und vor "Teilen"', ord.indexOf('eu_bestellung') === ord.indexOf('fragen') + 1 && ord.indexOf('share') === ord.indexOf('eu_bestellung') + 1, true);
    pruefe('Vorlage ueberschreibt nichts (Texte leer, Sprachdateien gelten)', Object.values((bl || {}).settings || {}).every((v) => v === ''), true);
  }
  console.log(fehler + ' Fehler in ' + geprueft + ' Pruefungen');
  process.exit(fehler ? 1 : 0);
})().catch((e) => { console.log('ABBRUCH: ' + e.message); process.exit(1); });

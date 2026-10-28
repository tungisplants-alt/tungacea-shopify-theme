// Prueft den Block "Versandinfo" auf der Produktseite: snippets/versandinfo.liquid
// gegen die ECHTEN Sprachdateien, dazu die Verkabelung in Abschnitt und Vorlage.
//
// Die drei Zeilen wiederholen Aussagen aus den Versandbedingungen (Liefergebiet,
// Versandtage, Laufzeit, Verschiebung bei Frost). Ein Test kann nicht pruefen, ob
// die Bedingungen in Shopify noch dazu passen, aber er haelt fest, WAS dort
// behauptet wird, damit eine Aenderung der Zeilen bewusst geschieht und nicht
// nebenbei.
//
// Zweiter Teil: Ein Block, der in templates/product.json steht, aber im Schema
// von main-product.liquid fehlt, sperrt im Theme-Editor die ganze Produktseite.
// Und ein Block im Schema ohne "when" im Abschnitt erscheint nie. Beides prueft
// der zweite Teil.
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
engine.registerFilter('t', function (key) {
  const hit = String(key).split('.').reduce((o, k) => (o == null ? undefined : o[k]), LOC[locale]);
  if (hit === undefined) throw new Error('FEHLENDER Schluessel [' + locale + ']: ' + key);
  return hit;
});

async function render(einstellungen = {}, { sprache = 'de', richtlinie = '/policies/shipping-policy' } = {}) {
  locale = sprache;
  return engine.renderFile('versandinfo', {}, {
    globals: {
      block: { id: 'b1', shopify_attributes: 'data-shopify-editor-block="b1"', settings: einstellungen },
      shop: { shipping_policy: richtlinie ? { url: richtlinie } : null },
    },
  });
}
const zeilen = (html) => [...html.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1]);

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
  // ---- Deutsch ------------------------------------------------------------
  {
    const html = await render();
    const z = zeilen(html);
    pruefe('drei Zeilen', z.length, 3);
    pruefe('Zeile 1: Liefergebiet und Dienstleister', z[0], 'Versand innerhalb Deutschlands mit DHL oder UPS.');
    pruefe('Zeile 2: Versandtage und Laufzeit', z[1], 'Ich versende montags und dienstags, die Pakete sind in der Regel 1–3 Werktage unterwegs.');
    pruefe('Zeile 3: Verschiebung bei Frost und Hitze', z[2], 'Bei Frost oder großer Hitze warte ich mit dem Versand, damit deine Pflanze sicher ankommt.');
    pruefe('Link zu den Versandbedingungen aus Shopify', /<a class="produkt-klappe__link link" href="\/policies\/shipping-policy">Alle Versandinfos<\/a>/.test(html), true);
    pruefe('Liste hat eine Rolle fuer Screenreader (Safari entfernt sonst die Listensemantik)', /<ul class="produkt-klappe__liste list-unstyled" role="list">/.test(html), true);
    pruefe('Editor-Attribut des Blocks ist gesetzt', /data-shopify-editor-block="b1"/.test(html), true);
    pruefe('Stylesheet kommt nicht mehr aus dem Snippet (laedt einmal im Abschnitt, sonst steht ein link zwischen den Zeilen)', /<link/.test(html), false);
    pruefe('keine Version, Nummer oder Adresse getippt: nur Shopify-Link', /https?:\/\/|@/.test(html), false);
  }

  // ---- Aufklappbar ----------------------------------------------------------
  {
    const html = await render();
    const kompakt = html.replace(/\s+/g, ' ').replace(/> </g, '><');
    pruefe('Block ist ein details mit summary', /<details class="produkt-klappe"[^>]*><summary class="produkt-klappe__toggle">/.test(kompakt), true);
    pruefe('zugeklappt zu Beginn, die Produktseite wird nicht voller', /<details class="produkt-klappe"[^>]* open/.test(kompakt), false);
    pruefe('zugeklappt steht nur der Titel sichtbar in der summary', (kompakt.match(/<summary[\s\S]*?<\/summary>/) || [''])[0].replace(/<[^>]+>/g, ''), 'Versand & Lieferung');
    pruefe('Plus-Zeichen kommt aus dem CSS und ist fuer Screenreader versteckt', /<span class="produkt-klappe__indikator" aria-hidden="true"><\/span>/.test(kompakt), true);
    const inhalt = (kompakt.match(/<div class="produkt-klappe__inhalt">([\s\S]*?)<\/div><\/details>/) || [])[1] || '';
    pruefe('die drei Zeilen stehen im aufklappbaren Teil', (inhalt.match(/<li>/g) || []).length, 3);
    pruefe('der Link "Alle Versandinfos" steht im aufklappbaren Teil', /<a class="produkt-klappe__link link" href="\/policies\/shipping-policy">Alle Versandinfos<\/a>/.test(inhalt), true);
    pruefe('der Link steht NACH den drei Zeilen', inhalt.indexOf('produkt-klappe__link') > inhalt.lastIndexOf('</li>'), true);
    pruefe('ausserhalb des aufklappbaren Teils steht weder Zeile noch Link', /<li>|<a /.test(kompakt.replace(/<div class="produkt-klappe__inhalt">[\s\S]*?<\/div><\/details>/, '')), false);
    pruefe('Block hat genau eine summary (sonst ist die Bedienung unklar)', (kompakt.match(/<summary/g) || []).length, 1);
    pruefe('Block ist nicht standardmaessig offen, auch mit eigenen Texten', /<details[^>]* open/.test(await render({ zeile_1: 'x' })), false);
    const css = fs.readFileSync(path.join(THEME, 'assets/component-produkt-klappe.css'), 'utf8');
    pruefe('CSS entfernt das Dreieck des Browsers (list-style und webkit-marker)', /list-style:\s*none/.test(css) && /::-webkit-details-marker/.test(css), true);
    pruefe('CSS gibt dem Block Abstand nach oben und unten (unten folgt "Teilen")', /\.produkt-klappe \{\s*margin: 2\.4rem 0 0;/.test(css) && /:not\(:has\(\+ \.produkt-klappe\)\) \{\s*margin-bottom: 2rem;/.test(css), true);
    pruefe('CSS schaltet Plus und Minus um', /\.produkt-klappe\[open\] \.produkt-klappe__indikator::after/.test(css), true);
    pruefe('CSS nimmt den Fokus-Rahmen auf Touch-Geraeten weg (wie bei Archiv-Fotos und Karte)', /hover: none\) and \(pointer: coarse\)[\s\S]*produkt-klappe__toggle:focus-visible/.test(css), true);
    const en = await render({}, { sprache: 'en' });
    pruefe('Englisch: Titel', /<span class="produkt-klappe__titel">Shipping &amp; delivery<\/span>|<span class="produkt-klappe__titel">Shipping & delivery<\/span>/.test(en), true);
  }

  // ---- Die Aussagen festhalten --------------------------------------------
  {
    const de = LOC.de.products.product.versandinfo;
    const alles = de.gebiet + ' ' + de.zeiten + ' ' + de.wetter;
    for (const wort of ['Deutschlands', 'DHL', 'UPS', 'montags', 'dienstags', '1–3 Werktage', 'Frost', 'Hitze']) {
      pruefe('Aussage "' + wort + '" steht in den Zeilen', alles.includes(wort), true);
    }
    pruefe('keine Preise und keine festen Versandkosten in den Zeilen', /€|Euro|kostenlos|gratis/i.test(alles), false);
    pruefe('keine Zusage wie "garantiert"', /garantie/i.test(alles), false);
  }

  // ---- Eigene Texte im Editor ----------------------------------------------
  {
    const html = await render({ zeile_1: 'Eigene Zeile eins', zeile_2: '', zeile_3: '   ' });
    const z = zeilen(html);
    pruefe('eigener Text ersetzt die Uebersetzung', z[0], 'Eigene Zeile eins');
    pruefe('leeres Feld: Uebersetzung bleibt', z[1], 'Ich versende montags und dienstags, die Pakete sind in der Regel 1–3 Werktage unterwegs.');
    pruefe('nur Leerzeichen zaehlen als leer', z[2], 'Bei Frost oder großer Hitze warte ich mit dem Versand, damit deine Pflanze sicher ankommt.');
    const boese = await render({ zeile_1: '<script>x</script><b>fett</b> & "Quote"' });
    pruefe('eigener Text wird maskiert, kein Markup aus dem Editor', /<script>|<b>/.test(boese), false);
    pruefe('eigener Text erscheint als Text', zeilen(boese)[0].includes('&lt;script&gt;'), true);
  }

  // ---- Ohne Versandrichtlinie -----------------------------------------------
  {
    const html = await render({}, { richtlinie: null });
    pruefe('ohne Richtlinie kein Link ins Leere', /<a[\s>]|produkt-klappe__link/.test(html), false);
    pruefe('ohne Richtlinie bleiben die drei Zeilen', zeilen(html).length, 3);
  }

  // ---- Englisch --------------------------------------------------------------
  {
    const html = await render({}, { sprache: 'en' });
    const z = zeilen(html);
    pruefe('Englisch: Zeile 1', z[0], 'Shipping within Germany with DHL or UPS.');
    pruefe('Englisch: Zeile 2', z[1], 'I ship on Mondays and Tuesdays; parcels usually take 1–3 working days.');
    pruefe('Englisch: Zeile 3', z[2], 'In frost or extreme heat I hold the shipment so your plant arrives safely.');
    pruefe('Englisch: Link', />All shipping details</.test(html), true);
    pruefe('Englisch: kein deutsches Wort', /Versand|Ich |montags|Werktage|Frost oder|Hitze/.test(html), false);
    const de = LOC.de.products.product.versandinfo;
    const en = LOC.en.products.product.versandinfo;
    pruefe('beide Sprachen haben dieselben Schluessel', Object.keys(de).sort(), Object.keys(en).sort());
    pruefe('beide Sprachen nennen DHL, UPS und 1–3', [de.gebiet.includes('DHL') && en.gebiet.includes('DHL'), de.gebiet.includes('UPS') && en.gebiet.includes('UPS'), de.zeiten.includes('1–3') && en.zeiten.includes('1–3')], [true, true, true]);
  }

  // ---- Verkabelung ------------------------------------------------------------
  {
    const abschnitt = fs.readFileSync(path.join(THEME, 'sections/main-product.liquid'), 'utf8');
    const schema = JSON.parse(abschnitt.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/)[1]);
    const typen = schema.blocks.map((b) => b.type);
    const blockSchema = schema.blocks.find((b) => b.type === 'versandinfo') || { settings: [] };
    const vorlage = JSON.parse(strip(fs.readFileSync(path.join(THEME, 'templates/product.json'), 'utf8')));
    const haupt = vorlage.sections.main;
    pruefe('Schema von main-product.liquid ist gueltiges JSON mit Bloecken', Array.isArray(schema.blocks) && typen.length > 5, true);
    pruefe('Block "versandinfo" ist im Schema angeboten', typen.includes('versandinfo'), true);
    pruefe('Block "versandinfo" hat limit 1', blockSchema.limit, 1);
    pruefe('Block wird im Abschnitt ausgegeben (when)', /\{%-?\s*when 'versandinfo'\s*-?%\}\s*\{%\s*render 'versandinfo', block: block\s*%\}/.test(abschnitt), true);
    pruefe('Block steht in der Produktvorlage', haupt.blocks.versandinfo && haupt.blocks.versandinfo.type === 'versandinfo', true);
    const o = haupt.block_order;
    pruefe('Reihenfolge: direkt nach der Dokumentation (Exemplar-Archiv)', o.indexOf('specimen') + 1 === o.indexOf('versandinfo'), true);
    pruefe('Reihenfolge: Dokumentation steht direkt unter der Beschreibung', o.indexOf('description') + 1 === o.indexOf('specimen'), true);
    pruefe('Reihenfolge: danach "Hast du Fragen?", direkt vor "Teilen"', o.indexOf('versandinfo') + 1 === o.indexOf('fragen') && o.indexOf('fragen') + 1 === o.indexOf('share'), true);
    pruefe('Stylesheet laedt einmal im Kopf des Abschnitts', /'component-produkt-klappe\.css' \| asset_url \| stylesheet_tag/.test(abschnitt), true);
    pruefe('Reihenfolge: "Teilen" bleibt der letzte Block der Spalte', o[o.length - 1], 'share');
    pruefe('Reihenfolge: nach Kaufknopf und Exemplar-Archiv',
      ['buy_buttons', 'specimen'].every((k) => o.indexOf(k) >= 0 && o.indexOf(k) < o.indexOf('versandinfo')), true);
    pruefe('Einstellungen der Vorlage kennt das Schema', Object.keys((haupt.blocks.versandinfo || { settings: {} }).settings).every((k) => blockSchema.settings.some((s) => s.id === k)), true);
    // Allgemein: Jeder Block der Vorlage ist im Schema angeboten.
    const unbekannt = Object.entries(haupt.blocks).filter(([, b]) => !typen.includes(b.type) && !/^@/.test(b.type)).map(([k, b]) => k + ':' + b.type);
    pruefe('jeder Block der Produktvorlage ist im Schema angeboten', unbekannt, []);
    // Allgemein: Jeder Eintrag in block_order existiert als Block.
    pruefe('jeder Eintrag der Reihenfolge ist ein definierter Block', o.filter((k) => !haupt.blocks[k]), []);
  }

  console.log(fehler + ' Fehler in ' + geprueft + ' Pruefungen');
  process.exit(fehler ? 1 : 0);
})().catch((e) => {
  console.log('ABBRUCH: ' + e.message);
  process.exit(1);
});

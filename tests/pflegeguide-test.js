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
  // Shopify maskiert uebersetzte Texte selbst (& wird &amp;, ' wird &#39;).
  return String(key).endsWith('_html') ? hit : hit.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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
  pruefe('Kaesten in der Reihenfolge der Bloecke', ['steckling', 'etabliert', 'jungpflanze', 'saemling', 'samen', 'mutterpflanze'].map((w) => leer.indexOf('<details class="care-guide__stage" id="stadium-' + w + '"')).every((v, i, a) => v > 0 && (i === 0 || v > a[i - 1])), true);
  pruefe('alle Kaesten zu (kein open)', /<details[^>]*\sopen/.test(leer), false);
  pruefe('leeres Stadium zeigt "Inhalt folgt."', zaehle(leer, /Inhalt folgt\./g), 6);
  pruefe('ohne Bedingungen, Naehrstoffe, Wasser: keine solchen Kapitel', /id="bedingungen"|id="naehrstoffe"|id="wasser"/.test(leer), false);
  pruefe('ohne weitere Kapitel: kein Inhaltsverzeichnis', /care-guide__tafel--kapitel/.test(leer), false);
  // Stadien als Herbar-Tafel: sechs Strichzeichnungen in der Reihenfolge der Pflanze.
  pruefe('Einstieg "Welches Stadium hast du?" mit Tafel und sechs Zeichnungen', /Welches Stadium hast du\?/.test(leer) && /care-guide-tafel/.test(leer) && zaehle(leer, /data-testid="care-guide-knoten"/g) === 6 && zaehle(leer, /class="care-guide__zeichnung"/g) === 6, true);
  pruefe('Steckling steht am Ende, ohne Zusatz', leer.indexOf('href="#stadium-steckling"') > leer.indexOf('href="#stadium-mutterpflanze"') && !/aus der Mutter/.test(leer), true);
  // Oben zuerst die Frage nach dem Stadium: vor Inhaltsverzeichnis, Kapiteln und Disclaimer.
  pruefe('"Welches Stadium hast du?" steht vor allem anderen Inhalt', leer.indexOf('Welches Stadium hast du?') > 0 && leer.indexOf('Welches Stadium hast du?') < leer.indexOf('care-guide__disclaimer') && !/care-guide__chapter-eyebrow/.test(leer), true);
  pruefe('Stufen 01 bis 05 auf der Tafel, der Steckling ohne Nummer', ['01', '02', '03', '04', '05'].every((n) => leer.includes('care-guide__eintrag-stufe">' + n)) && !/care-guide__eintrag-stufe">06/.test(leer), true);
  pruefe('keine Fotos und keine Karten', /<img|care-guide__karte/.test(leer), false);
  pruefe('Felder fuehren zu den Stadien (Anker)', ['steckling', 'etabliert', 'jungpflanze', 'saemling', 'samen', 'mutterpflanze'].every((st) => leer.includes('href="#stadium-' + st + '"') && leer.includes('id="stadium-' + st + '"')), true);
  pruefe('Tafel folgt der Pflanze: Samen, Saemling, Jungpflanze, Etabliert, Mutterpflanze', ['#stadium-samen', '#stadium-saemling', '#stadium-jungpflanze', '#stadium-etabliert', '#stadium-mutterpflanze'].map((w) => leer.indexOf('href="' + w + '"')).every((v, i, a) => v > 0 && (i === 0 || v > a[i - 1])), true);
  const ohneSteckling = await rendere(['etabliert', 'mutterpflanze'].map((st) => block('stadium', { stadium: st })));
  pruefe('nur Karten fuer vorhandene Stadien', !/stadium-steckling"/.test(ohneSteckling) && zaehle(ohneSteckling, /data-testid="care-guide-knoten"/g) === 2, true);
  pruefe('keine Kapitelnummern und keine Stufenzaehlung mehr', /care-guide__number|Stufe \d|Zucht/.test(leer), false);
  pruefe('Disclaimer ist eine leise Notiz, kein Kasten', /<aside class="care-guide__disclaimer" role="note"/.test(leer), true);
  pruefe('Disclaimer steht immer, persoenlich und ohne Studien', /care-guide__disclaimer/.test(leer) && /Das sind meine eigenen Erfahrungswerte/.test(leer) && /bis heute gut gefahren/.test(leer) && !/Studien/.test(leer), true);
  pruefe('Kopf mit Ueberschrift und Foto-Variable', /So pflege ich meine Anthurien\./.test(leer) && /--guide-bild: url\('\/assets\/tungacea-pflegeguide-kopf\.jpg'\)/.test(leer), true);

  // Die Vorlage bringt Zeilen fuer Bedingungen, Naehrstoffe und Wasser mit
  // (zurzeit mit Beispielwerten). Geleert duerfen sie kein Kapitel zeigen.
  const gv = JSON.parse(strip(fs.readFileSync(path.join(THEME, "templates/page.pflegeguide.json"), "utf8"))).sections.main;
  const vorlageBloecke = gv.block_order.map((k) => block(gv.blocks[k].type, gv.blocks[k].settings));
  pruefe('Vorlage bringt Zeilen fuer alle Kapitel mit', ['bedingung', 'naehrstoff', 'wasser'].every((t) => vorlageBloecke.some((b) => b.type === t)), true);
  pruefe('Vorlage: Wasser fuer alle sechs Stadien', vorlageBloecke.filter((b) => b.type === 'wasser').map((b) => b.settings.stadium).join(','), 'samen,saemling,jungpflanze,etabliert,mutterpflanze,steckling');
  const geleert = vorlageBloecke.map((b) => {
    if (b.type === 'bedingung') return block('bedingung', { name: b.settings.name, wert: '' });
    if (b.type === 'naehrstoff') return block('naehrstoff', { name: '', art: b.settings.art, zweck: '', dosierung: '' });
    if (b.type === 'wasser') return block('wasser', { stadium: b.settings.stadium, ph: '', ec: '' });
    return block('stadium', { stadium: b.settings.stadium });
  });
  const ausLeer = await rendere(geleert);
  pruefe('leere Zeilen: keine leeren Kapitel', /id="bedingungen"|id="naehrstoffe"|id="wasser"|care-guide__tafel--kapitel/.test(ausLeer), false);
  const ersteZeile = vorlageBloecke.find((b) => b.type === 'bedingung').settings.name;
  const eineZeile = await rendere(geleert.map((b) => b.type === 'bedingung' && b.settings.name === ersteZeile ? block('bedingung', { name: ersteZeile, wert: 'meine Mischung' }) : b));
  pruefe('ein ausgefuellter Wert zeigt das Kapitel mit genau dieser Zeile', /id="bedingungen"/.test(eineZeile) && zaehle(eineZeile, /class="care-guide__fact"/g) === 1 && /meine Mischung/.test(eineZeile), true);
  const ausVorlage = await rendere(vorlageBloecke, gv.settings);
  pruefe('gefuellte Vorlage zeigt alle Kapitel und die Kacheln', ['id="bedingungen"', 'id="naehrstoffe"', 'id="wasser"', 'care-guide__tile'].every((x) => ausVorlage.includes(x)), true);
  // Sechs Felder auf der Kapitel-Tafel, in der Reihenfolge, in der man liest;
  // die Kapitel stehen auf der Seite in derselben Reihenfolge.
  const reihe6 = ['ankunft', 'bedingungen', 'substrat', 'naehrstoffe', 'wasser', 'probleme'];
  const tafel6 = ausVorlage.slice(ausVorlage.indexOf('care-guide__tafel--kapitel'), ausVorlage.indexOf('</nav>', ausVorlage.indexOf('care-guide__tafel--kapitel')));
  pruefe('Kapitel-Tafel: sechs Felder in der Lesereihenfolge', zaehle(tafel6, /class="care-guide__zeichnung"/g) === 6 && reihe6.map((k) => tafel6.indexOf('href="#' + k + '"')).every((v, i, a) => v > 0 && (i === 0 || v > a[i - 1])), true);
  pruefe('Kapitel auf der Seite in derselben Reihenfolge', reihe6.map((k) => ausVorlage.indexOf('id="' + k + '"')).every((v, i, a) => v > 0 && (i === 0 || v > a[i - 1])), true);
  pruefe('freie Kapitel mit uebersetzter Ueberschrift', /Wenn die Pflanze ankommt/.test(ausVorlage) && /Substrat und Umtopfen/.test(ausVorlage) && /Wenn etwas nicht stimmt/.test(ausVorlage), true);
  const ohneText = await rendere([block('stadium', { stadium: 'steckling' }), block('kapitel', { thema: 'probleme', titel: 'Leer', einleitung: '', text: '' })]);
  pruefe('freies Kapitel ohne Text: kein Kapitel, kein Feld', /id="probleme"|href="#probleme"/.test(ohneText), false);
  const eigenTitel = await rendere([block('stadium', { stadium: 'steckling' }), block('kapitel', { thema: 'ankunft', titel: 'Auspacken', einleitung: '', text: '<p>Text.</p>' })]);
  pruefe('eigene Ueberschrift ersetzt die Vorgabe', /<h2 class="care-guide__title">Auspacken<\/h2>/.test(eigenTitel) && !/Wenn die Pflanze ankommt/.test(eigenTitel), true);

  // Voller Inhalt.
  const voll = await rendere([
    block('bedingung', { name: 'Substrat', wert: 'meine Mischung' }),
    block('bedingung', { name: 'Leer', wert: '' }),
    block('stadium', { stadium: 'steckling', kurz: 'Ein Satz.', vpd: '0,8–1,0', ppfd: '150–250', temperatur: '22–26', ec: '0,6–0,8', text: '<p>Ausfuehrlich.</p>' }),
    block('stadium', { stadium: 'samen', vpd: '0,6' }),
    block('naehrstoff', { name: 'Dünger A', art: 'basis', zweck: 'Wachstum', dosierung: '1 ml/l' }),
    block('naehrstoff', { name: 'Zusatz B', art: 'zusatz', zweck: 'Wurzeln' }),
    block('wasser', { stadium: 'steckling', ph: '5,8', ec: '0,6' }),
    block('wasser', { stadium: 'etabliert', ph: '', ec: '' }),
  ], { ph_ziel: '5,8', ec_ziel: '', disclaimer: '' });
  pruefe('Kapitel in Reihenfolge: Stadien zuerst, dann Bedingungen, Naehrstoffe, Wasser', ['id="stadien"', 'id="bedingungen"', 'id="naehrstoffe"', 'id="wasser"'].map((w) => voll.indexOf(w)).every((v, i, a) => v > 0 && (i === 0 || v > a[i - 1])), true);
  pruefe('Inhaltsverzeichnis nennt Bedingungen, Naehrstoffe, Gießwasser, ohne "Außerdem"', !/Außerdem/.test(voll) && ['#bedingungen', '#naehrstoffe', '#wasser'].every((a) => voll.includes('href="' + a + '"')) && !/href="#stadien"/.test(voll), true);
  pruefe('Kennzahlen stehen schon in der zugeklappten Zeile (peek)', /care-guide__stage-peek">VPD 0,8–1,0 kPa · PPFD 150–250 µmol\/m²\/s · 22–26 °C · EC 0,6–0,8 mS\/cm</.test(voll), true);
  pruefe('Stadium nur mit einem Wert: Peek nur mit diesem Wert', /care-guide__stage-peek">VPD 0,6 kPa</.test(voll), true);
  pruefe('Stadium ohne Kennzahlen: keine Peek-Zeile', zaehle(leer, /care-guide__stage-peek/g), 0);
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
  pruefe('Inhaltsverzeichnis: drei Links', zaehle(voll, /care-guide__nav-link/g), 3);
  {
    const js = fs.readFileSync(path.join(THEME, 'assets/care-guide.js'), 'utf8');
    const css = fs.readFileSync(path.join(THEME, 'assets/component-care-guide.css'), 'utf8');
    pruefe('Kapitel schalten um wie die Stadien (Skript und hidden-Regel)', /kapitelWaehlen\(/.test(js) && /aria-current/.test(js) && /\.care-guide--kapitelwahl \.care-guide__chapter\[hidden\]\s*\{\s*display:\s*none/.test(css), true);
  }
  pruefe('Kapitel als Tafel mit drei Zeichnungen, nicht als Stadien-Auswahl', /care-guide__tafel--kapitel/.test(voll) && zaehle(voll.slice(voll.indexOf('care-guide__tafel--kapitel'), voll.indexOf('id="bedingungen"')), /class="care-guide__zeichnung"/g) === 3 && !/care-guide__tafel--kapitel"[^>]*data-stadien-wahl/.test(voll), true);
  pruefe('Reihenfolge: Stadien, Inhaltsverzeichnis, Kapitel, Disclaimer, Fragen', ['id="stadien"', 'care-guide__tafel--kapitel', 'id="bedingungen"', 'id="wasser"', 'care-guide__disclaimer', 'id="fragen"'].map((w) => voll.indexOf(w)).every((v, i, a) => v > 0 && (i === 0 || v > a[i - 1])), true);
  pruefe('Fragen-Knopf ist der WhatsApp-Link', /care-guide__button/.test(voll) && /wa\.me\/491791627287/.test(voll), true);
  pruefe('ohne gueltige Nummer: kein Fragen-Block', /care-guide__questions/.test(await rendere([block('stadium', { stadium: 'steckling' })], {}, 'de', '')), false);

  // Englisch und eigener Disclaimer.
  const en = await rendere([block('stadium', { stadium: 'samen', vpd: '0,6' }), block('stadium', { stadium: 'saemling' })], {}, 'en');
  pruefe('Englisch: Titel, Disclaimer, Stadien', /How I care for my Anthuriums\./.test(en) && /These are my own values from experience/.test(en) && />Sprouted seed</.test(en) && />Seedling</.test(en), true);
  pruefe('Englisch: Einstieg, Einheit und leeres Stadium', /Which stage do you have\?/.test(en) && /VPD 0,6 kPa/.test(en) && />Content coming soon\.</.test(en), true);
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
  // Der Hinweistext traegt keinen eigenen Link mehr: die Zeile Pflegeanleitung
  // direkt darunter fuehrt zum Guide, zwei Links zum selben Ziel waren doppelt.
  pruefe('Hinweistext im Passport ohne eigenen Link zum Guide', /specimen-passport__hint-link|specimen-hint-guide/.test(passport), false);

  // Vorlage.
  const vorlage = JSON.parse(strip(fs.readFileSync(path.join(THEME, 'templates/page.pflegeguide.json'), 'utf8')));
  pruefe('Seitenvorlage page.pflegeguide hat den Abschnitt und sechs Stadien', vorlage.sections.main.type === 'main-care-guide' && vorlage.sections.main.block_order.filter((k) => vorlage.sections.main.blocks[k].type === 'stadium').length === 6, true);

  {
    // Aufklappbare Punkte und Nährstoffe
    const mitPunkten = await rendere([
      block('stadium', { stadium: 'steckling' }),
      block('naehrstoff', { name: 'Dünger A', art: 'basis', zweck: 'Wachstum', dosierung: '1 ml/l' }),
      block('naehrstoff', { name: 'Nur Name', art: 'zusatz' }),
      block('kapitel', { thema: 'probleme', titel: '', einleitung: '', text: '' }),
      block('punkt', { thema: 'probleme', titel: 'Gelbe Blätter', text: '<p>Meist zu nass.</p>' }),
      block('punkt', { thema: 'probleme', titel: 'Leerer Punkt', text: '' }),
      block('punkt', { thema: 'ankunft', titel: 'Auspacken', text: '<p>Genau ansehen.</p>' }),
    ]);
    const kopfA = (mitPunkten.slice(mitPunkten.indexOf('id="naehrstoffe"')).match(/<summary class="care-guide__klappe-kopf">([\s\S]*?)<\/summary>/) || [])[1] || '';
    pruefe('Nährstoffe: aufklappbar, zu Beginn nur der Name in der Zeile', /Dünger A/.test(kopfA) && !/Wachstum|1 ml/.test(kopfA), true);
    pruefe('Nährstoffe: Zweck und Dosierung stehen im aufklappbaren Teil', /care-guide__klappe-inhalt">\s*<p>Wachstum<\/p>\s*<p class="care-guide__dose">1 ml\/l<\/p>/.test(mitPunkten), true);
    pruefe('Nährstoffe: ein Eintrag nur mit Namen bleibt eine einfache Zeile', /care-guide__klappe--einfach">\s*<span class="care-guide__klappe-titel">Nur Name/.test(mitPunkten), true);
    pruefe('Probleme: Kapitel erscheint nur mit Punkten, ohne eigenen Text', /id="probleme"/.test(mitPunkten) && !/care-guide__text--kapitel/.test(mitPunkten.slice(mitPunkten.indexOf('id="probleme"'), mitPunkten.indexOf('id="probleme"') + 400)), true);
    pruefe('Probleme: Punkt aufklappbar, Überschrift in der Zeile, Text darin', /<span class="care-guide__klappe-titel">Gelbe Blätter<\/span>/.test(mitPunkten) && /care-guide__klappe-inhalt care-guide__text rte"><p>Meist zu nass\.<\/p>/.test(mitPunkten), true);
    pruefe('Punkt ohne Text erscheint nicht', /Leerer Punkt/.test(mitPunkten), false);
    pruefe('Ankunft: auch nur mit einem Punkt ein Kapitel, und es steht in der Kapitel-Leiste', /id="ankunft"/.test(mitPunkten) && /href="#ankunft"/.test(mitPunkten), true);
    pruefe('Punkte sind echte details-Elemente, zugeklappt', zaehle(mitPunkten, /<details class="care-guide__klappe"/g) === 3 && !/<details class="care-guide__klappe"[^>]* open/.test(mitPunkten), true);
    const ohnePunkte = await rendere([block('stadium', { stadium: 'steckling' }), block('punkt', { thema: 'probleme', titel: '', text: '<p>x</p>' })]);
    pruefe('Punkt ohne Überschrift erzeugt kein Kapitel', /id="probleme"/.test(ohnePunkte), false);
    // Maskierung: Shopify maskiert übersetzte Titel selbst, die Vorlage darf es nicht noch einmal tun
    const nm = await rendere([block('stadium', { stadium: 'steckling' }), block('naehrstoff', { name: 'Dünger', art: 'basis', zweck: 'x' })]);
    pruefe('Titel mit & wird nicht doppelt maskiert (Nährstoffe & Zusätze)', /Nährstoffe &amp; Zusätze/.test(nm) && !/&amp;amp;/.test(nm), true);
    const eig = await rendere([block('stadium', { stadium: 'steckling' }), block('naehrstoff', { name: 'Dünger', art: 'basis', zweck: 'x' })], { naehrstoffe_titel: 'A & B <b>' });
    pruefe('eigener Titel aus dem Editor wird maskiert', /A &amp; B &lt;b&gt;/.test(eig), true);
  }
  console.log(fehler + ' Fehler in ' + geprueft + ' Pruefungen');
  process.exit(fehler ? 1 : 0);
})().catch((e) => { console.log('ABBRUCH: ' + e.message); process.exit(1); });

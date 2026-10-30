// Prueft zwei Stellen, an denen die Produktseite verkauft, ohne zu draengen:
// 1. snippets/mutter-notiz.liquid — Tungs Notiz zur Mutterpflanze unter dem Preis.
// 2. snippets/nachzucht-vormerken.liquid — bei vergebenen Exemplaren ein
//    Formular, um die naechste Nachzucht vorzumerken.
//
// Was schiefgehen kann: eine leere Notiz als leeres Zitat, ein Formular bei
// verfuegbaren Pflanzen, Tags, die Tung spaeter nicht zuordnen kann, deutsche
// Woerter im englischen Shop.
const fs = require('fs');
const path = require('path');
const { Liquid } = require('liquidjs');

const THEME = path.join(__dirname, '..');
const strip = s => s.replace(/^\s*\/\*[\s\S]*?\*\//, '');
const LOC = {
  de: JSON.parse(strip(fs.readFileSync(path.join(THEME, 'locales/de.json'), 'utf8'))),
  en: JSON.parse(strip(fs.readFileSync(path.join(THEME, 'locales/en.default.json'), 'utf8'))),
};
let locale = 'de';
let formZustand = {};

const engine = new Liquid({ root: path.join(THEME, 'snippets'), extname: '.liquid' });
// form: rendert den Inhalt in einem <form> und stellt "form" bereit, wie Shopify.
engine.registerTag('form', {
  parse(token, remainTokens) {
    this.args = token.args;
    this.tpls = [];
    const stream = this.liquid.parser.parseStream(remainTokens)
      .on('tag:endform', () => stream.stop())
      .on('template', (tpl) => this.tpls.push(tpl))
      .on('end', () => { throw new Error('endform fehlt'); });
    stream.start();
  },
  * render(ctx, emitter) {
    ctx.push({ form: Object.assign({ email: '', errors: null, 'posted_successfully?': false }, formZustand) });
    emitter.write('<form data-args="' + this.args.replace(/"/g, "'") + '">');
    yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
    emitter.write('</form>');
    ctx.pop();
  },
});
engine.registerFilter('t', function (key) {
  const hit = String(key).split('.').reduce((o, k) => (o == null ? undefined : o[k]), LOC[locale]);
  if (hit === undefined || typeof hit !== 'string') throw new Error('FEHLENDER Schluessel [' + locale + ']: ' + key);
  return hit;
});

const feld = v => ({ value: v === undefined ? null : v });
const mutter = extra => Object.assign({
  notiz: feld('Lieblingsexemplar aus dieser F2-Kreuzung.'), mutter_id: feld('TA-1001'),
  system: { handle: 'rl-fs-f2-4', url: '/pages/archiv/rl-fs-f2-4' },
}, extra || {});
const produkt = (m, extra) => Object.assign({
  available: true,
  metafields: { custom: { mutterpflanze: { value: m === undefined ? null : m }, vaterpflanze: { value: null } } },
}, extra || {});

let fails = 0, checks = 0;
const pruefe = (ok, text) => { checks++; if (!ok) { fails++; console.log('FEHLER ' + text); } };

const lang = 'Diese Black Widow hebt sich durch die minimale Aderung hervor und kommt der echten BW sehr nahe, sagen viele Sammler.';
const notizFaelle = [
  { name: 'Kurze Notiz: ganz, ohne Weiterlesen', p: produkt(mutter()),
    immer: ['mutter-notiz', 'Lieblingsexemplar aus dieser F2-Kreuzung.', 'Tung'],
    verboten: ['mutter-notiz-link', '…', 'href'],
    de: ['Meine Notiz zur Mutterpflanze'], en: ['My note on the mother plant'] },
  { name: 'Lange Notiz: 14 Woerter, dann … und Weiterlesen nach unten', p: produkt(mutter({ notiz: feld(lang) })),
    immer: ['Diese Black Widow hebt sich durch die minimale Aderung hervor und kommt der echten…', 'href="#notiz-mutterpflanze"'],
    verboten: ['BW sehr nahe', 'TA-1001', 'pages/archiv'],
    de: ['Weiterlesen'], en: ['Read more'] },
  { name: 'Genau 14 Woerter: ganz, ohne Weiterlesen',
    p: produkt(mutter({ notiz: feld('eins zwei drei vier fünf sechs sieben acht neun zehn elf zwölf dreizehn vierzehn') })),
    immer: ['vierzehn'], verboten: ['…', 'mutter-notiz-link'] },
  { name: 'Ohne Mutterpflanze: nichts', p: produkt(null), leer: true },
  { name: 'Mutterpflanze ohne Notiz: nichts', p: produkt(mutter({ notiz: feld('   ') })), leer: true },
  { name: 'HTML in der Notiz wird sicher ausgegeben',
    p: produkt(mutter({ notiz: feld('Zeile eins\nZeile <b>zwei</b>') })),
    immer: ['Zeile eins<br />', '&lt;b&gt;'], verboten: ['<b>'] },
];

const nachzuchtFaelle = [
  { name: 'Verfuegbar: kein Formular', p: produkt(mutter()), leer: true },
  { name: 'Vergeben ohne Mutterpflanze: kein Formular', p: produkt(null, { available: false }), leer: true },
  { name: 'Vergeben, Steckling: Formular mit Tags und Muttertext', p: produkt(mutter(), { available: false }),
    immer: ['id="nachzucht"', 'name="contact[email]"', 'value="nachzucht,nachzucht-ta-1001"', 'type="email"', 'required'],
    de: ['Nächste Nachzucht vormerken', 'von dieser Mutterpflanze', 'Vormerken'], en: ['from this mother plant', 'Notify me'] },
  { name: 'Vergeben, Saemling: Text zur Kreuzung',
    p: (() => { const x = produkt(mutter(), { available: false }); x.metafields.custom.vaterpflanze.value = mutter({ mutter_id: feld('TA-1003') }); return x; })(),
    immer: ['nachzucht-ta-1001'], de: ['aus dieser Kreuzung'], en: ['from this cross'], verboten: ['von dieser Mutterpflanze'] },
  { name: 'Ohne Nummer: Tag aus dem Handle', p: produkt(mutter({ mutter_id: feld(null) }), { available: false }),
    immer: ['value="nachzucht,nachzucht-rl-fs-f2-4"'] },
  { name: 'Nach dem Absenden: Dank statt Feld', p: produkt(mutter(), { available: false }), form: { 'posted_successfully?': true },
    immer: ['nachzucht-erfolg'], de: ['du stehst auf der Liste'], en: ["you're on the list"], verboten: ['name="contact[email]"'] },
];

(async () => {
  for (const [datei, faelle] of [['mutter-notiz', notizFaelle], ['nachzucht-vormerken', nachzuchtFaelle]]) {
    for (const f of faelle) {
      for (const loc of ['de', 'en']) {
        locale = loc; formZustand = f.form || {};
        let html;
        try { html = (await engine.renderFile(datei, { product: f.p })).trim(); }
        catch (e) { pruefe(false, '[' + loc + '] ' + f.name + ': ' + e.message); continue; }
        if (f.leer) { pruefe(html === '', '[' + loc + '] ' + f.name + ': nicht leer'); continue; }
        for (const e of (f.immer || []).concat(f[loc] || [])) pruefe(html.includes(e), '[' + loc + '] ' + f.name + ': fehlt "' + e + '"');
        for (const v of f.verboten || []) pruefe(!html.includes(v), '[' + loc + '] ' + f.name + ': enthaelt "' + v + '"');
        // Nur der sichtbare Text zaehlt, nicht Klassennamen. Die Notiz selbst ist
        // Inhalt aus dem Archiv und wird von Shopify uebersetzt geliefert.
        const sichtbar = html.replace(/<[^>]*>/g, ' ').replace(/Lieblingsexemplar[^<]*|Zeile[^<]*|Diese Black Widow[^<]*|eins zwei[^<]*/g, '');
        if (loc === 'en') pruefe(!/Notiz|Mutterpflanze|Vormerken|vergeben|Kreuzung|E-Mail/.test(sichtbar), '[en] ' + f.name + ': deutscher Text');
      }
    }
  }

  // Der Pass zeigt die ganze Notiz nur, wenn der Anriss gekuerzt ist, mit
  // derselben Grenze wie mutter-notiz.liquid.
  const pass = fs.readFileSync(path.join(THEME, 'snippets/specimen-passport.liquid'), 'utf8');
  const anriss = fs.readFileSync(path.join(THEME, 'snippets/mutter-notiz.liquid'), 'utf8');
  const grenzePass = (pass.match(/voll_woerter > (\d+)/) || [])[1];
  const grenzeAnriss = (anriss.match(/woerter > (\d+)/) || [])[1];
  pruefe(grenzePass && grenzePass === grenzeAnriss, 'Grenze im Pass (' + grenzePass + ') und am Preis (' + grenzeAnriss + ') verschieden');
  pruefe(/id="notiz-mutterpflanze"/.test(pass), 'Pass: Sprungziel fuer Weiterlesen fehlt');

  // Einbau: Block nach dem Preis, Formular unter dem Kaufknopf, Karte.
  const sektion = fs.readFileSync(path.join(THEME, 'sections/main-product.liquid'), 'utf8');
  pruefe(/when 'notiz' -%}\s*\{% render 'mutter-notiz', product: product, block: block %\}/.test(sektion), 'main-product: Block notiz fehlt');
  pruefe(/render 'buy-buttons'[\s\S]*?-%}\s*\{%- render 'nachzucht-vormerken', product: product -%\}/.test(sektion), 'main-product: Formular unter dem Kaufknopf fehlt');
  const schema = JSON.parse(sektion.split('{% schema %}')[1].split('{% endschema %}')[0]);
  pruefe(schema.blocks.some(b => b.type === 'notiz' && b.limit === 1), 'Schema: Block notiz fehlt');
  const vorlage = JSON.parse(strip(fs.readFileSync(path.join(THEME, 'templates/product.json'), 'utf8')));
  const reihe = vorlage.sections.main.block_order;
  pruefe(reihe.indexOf('notiz') === reihe.indexOf('price') + 1, 'product.json: notiz steht nicht direkt nach dem Preis');
  pruefe(vorlage.sections.main.blocks.notiz && vorlage.sections.main.blocks.notiz.type === 'notiz', 'product.json: Block notiz fehlt');
  const karte = fs.readFileSync(path.join(THEME, 'snippets/card-product.liquid'), 'utf8');
  pruefe(/specimen_status_state == 'sold' and card_product\.metafields\.custom\.mutterpflanze\.value != blank/.test(karte), 'Karte: Hinweis Nachzucht fehlt');
  pruefe(LOC.de.products.product.specimen_status.sold === 'Vergeben', 'Karte: DE heisst nicht Vergeben');
  const css = fs.readFileSync(path.join(THEME, 'assets/tungacea.css'), 'utf8');
  pruefe(/\.nachzucht__eingabe\s*\{[^}]*font-size:\s*1\.6rem/.test(css), 'CSS: Eingabefeld unter 16 px (iPhone zoomt)');

  console.log('\n' + (checks - fails) + '/' + checks + ' Pruefungen bestanden, ' + fails + ' Fehler.');
  process.exit(fails ? 1 : 0);
})();

// Prueft die Seiten "Ueber Tungacea" und "Kontakt": Seitenkopf
// (sections/page-head.liquid), Karten (sections/page-info.liquid), die
// Hilfe-Karte und das Formular in sections/contact-form.liquid, dazu die
// fertig gefuellten Vorlagen. Alles gegen die ECHTEN Sprachdateien.
//
// Was nicht verloren gehen darf:
//   - genau eine Ueberschrift erster Ebene je Seite (der Seitenkopf), auch auf
//     der Ueber-Seite: die Reihen-Sektion setzt keine zweite, versteckte
//   - leere Felder und leere Karten verschwinden
//   - das Formular schickt wie vorher (E-Mail Pflicht), ohne Telefonfeld, dessen
//     Muster "+49 ..." abgelehnt hat; WhatsApp bleibt erreichbar
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
engine.registerFilter('inline_asset_content', () => '<svg></svg>');
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
// form: ein einfaches <form>, damit contact-form gerendert werden kann
engine.registerTag('form', {
  parse(token, remain) {
    this.vorlagen = [];
    const strom = this.liquid.parser.parseStream(remain)
      .on('template', (t) => this.vorlagen.push(t))
      .on('tag:endform', () => strom.stop())
      .on('end', () => { throw new Error('{% form %} nicht geschlossen'); });
    strom.start();
  },
  * render(ctx, emitter) {
    emitter.write('<form method="post" action="/contact#ContactForm" id="ContactForm">');
    ctx.push({ form: { 'posted_successfully?': false, errors: null } });
    yield this.liquid.renderer.renderTemplates(this.vorlagen, ctx, emitter);
    ctx.pop();
    emitter.write('</form>');
  },
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
const zaehle = (h, re) => (h.match(re) || []).length;
const block = (type, settings, id) => ({ type, settings, id: id || type, shopify_attributes: '' });

async function kopf(einst, sprache = 'de', titel = 'Über Tungacea') {
  locale = sprache;
  return engine.renderFile('page-head', {}, { globals: { page: { title: titel }, section: { id: 'k', settings: { color_scheme: 'scheme-1', padding_top: 36, padding_bottom: 8, ...einst } } } });
}
async function karten(bloecke, einst = {}, sprache = 'de') {
  locale = sprache;
  return engine.renderFile('page-info', {}, { globals: { section: { id: 'i', blocks: bloecke, settings: { color_scheme: 'scheme-1', padding_top: 0, padding_bottom: 64, ...einst } } } });
}
async function kontakt(bloecke = [], sprache = 'de', nummer = '+49 179 1627287') {
  locale = sprache;
  return engine.renderFile('contact-form', {}, {
    globals: {
      settings: { whatsapp_nummer: nummer },
      template: { name: 'page' }, product: null, customer: null,
      shop: { email: 'shop@example.com', privacy_policy: { url: '/policies/privacy-policy' } },
      section: { id: 'form', blocks: bloecke, settings: { heading: '', heading_size: 'h1', color_scheme: 'scheme-1', padding_top: 36, padding_bottom: 36, show_whatsapp: true } },
    },
  });
}

(async () => {
  // ---- Seitenkopf -----------------------------------------------------------
  {
    const a = await kopf({ thema: 'about' });
    pruefe('Ueber: genau eine h1', zaehle(a, /<h1/g), 1);
    pruefe('Ueber: Ueberschrift ist der Satz aus den Sprachdateien', /<h1 class="page-head__heading">Was ich selbst gern sammle und wachsen sehe, teile ich bei Tungacea mit dir\.<\/h1>/.test(a), true);
    pruefe('Ueber: kleine Zeile ist der Titel der Seite', /<p class="page-head__eyebrow">Über Tungacea<\/p>/.test(a), true);
    pruefe('Ueber: kein Satz darunter ohne Eintrag', /page-head__lead/.test(a), false);
    const k = await kopf({ thema: 'contact' }, 'de', 'Kontakt');
    pruefe('Kontakt: Ueberschrift "Schreib mir direkt."', /<h1 class="page-head__heading">Schreib mir direkt\.<\/h1>/.test(k) && /page-head__eyebrow">Kontakt</.test(k), true);
    const o = await kopf({ thema: 'other' }, 'de', 'Impressum');
    pruefe('Andere Seite: Titel als Ueberschrift, die kleine Zeile entfaellt', /<h1 class="page-head__heading">Impressum<\/h1>/.test(o) && !/page-head__eyebrow/.test(o), true);
    const e = await kopf({ thema: 'about', heading: 'A & B <b>', lead: 'Satz <i>', eyebrow: 'Zeile & Co' });
    pruefe('Eigene Texte werden maskiert', /A &amp; B &lt;b&gt;/.test(e) && /Satz &lt;i&gt;/.test(e) && /Zeile &amp; Co/.test(e) && !/<b>|<i>/.test(e), true);
    pruefe('Eigener Satz erscheint unter der Ueberschrift', e.indexOf('page-head__lead') > e.indexOf('<h1'), true);
    const en = await kopf({ thema: 'about' }, 'en', 'About Tungacea');
    pruefe('Englisch: Satz und kleine Zeile', /What I like to collect and watch grow, I share with you at Tungacea\./.test(en) && /page-head__eyebrow">About Tungacea</.test(en), true);
    const enK = await kopf({ thema: 'contact' }, 'en', 'Contact');
    pruefe('Englisch Kontakt: Ueberschrift', /Message me directly\./.test(enK), true);
  }

  // ---- Karten ---------------------------------------------------------------
  {
    const voll = await karten([
      block('fakt', { name: 'Seit', wert: '2024' }, 'f1'),
      block('fakt', { name: 'Leer', wert: '' }, 'f2'),
      block('fakt', { name: '', wert: 'ohne Name' }, 'f3'),
      block('link', { titel: 'Pflegeguide', link: '/pages/pflegeguide' }, 'l1'),
      block('link', { titel: 'Ohne Link', link: '' }, 'l2'),
      block('link', { titel: '', link: '/x' }, 'l3'),
    ]);
    pruefe('Karten: Ueberschriften "Auf einen Blick" und "Weiter"', />Auf einen Blick</.test(voll) && />Weiter</.test(voll), true);
    pruefe('Karten: nur die Zeile mit Name und Wert', /<dt>Seit<\/dt>\s*<dd>2024<\/dd>/.test(voll) && zaehle(voll, /page-info__zeile"/g) === 1 && !/Leer|ohne Name/.test(voll), true);
    pruefe('Karten: nur der Link mit Titel und Adresse', /<a class="page-info__zeile page-info__zeile--link" href="\/pages\/pflegeguide">/.test(voll) && zaehle(voll, /<a /g) === 1 && !/Ohne Link/.test(voll), true);
    pruefe('Karten: ohne Eintraege keine Karte und keine Ueberschrift', (await karten([block('fakt', { name: 'a', wert: '' })])).replace(/\s|<link[^>]*>/g, ''), '');
    const nurLinks = await karten([block('link', { titel: 'X', link: '/x' })]);
    pruefe('Karten: nur Links, keine Faktenkarte', !/Auf einen Blick/.test(nurLinks) && />Weiter</.test(nurLinks), true);
    const eig = await karten([block('fakt', { name: 'A & B', wert: '<b>x</b>' })], { fakten_titel: 'Kurz <i>' });
    pruefe('Karten: eigene Texte maskiert', /A &amp; B/.test(eig) && /&lt;b&gt;x&lt;\/b&gt;/.test(eig) && /Kurz &lt;i&gt;/.test(eig), true);
    const en = await karten([block('fakt', { name: 'Since', wert: '2024' }), block('link', { titel: 'Care guide', link: '/g' })], {}, 'en');
    pruefe('Englisch: Ueberschriften', />At a glance</.test(en) && />Next</.test(en), true);
  }

  // ---- Kontakt-Formular ------------------------------------------------------
  {
    const hilfe = [
      block('hilfe', { titel: 'Pflanze ist angekommen', link: '/pages/pflegeguide#ankunft' }, 'h1'),
      block('hilfe', { titel: 'Ohne Link', link: '' }, 'h2'),
    ];
    const mit = await kontakt(hilfe);
    pruefe('Kontakt: Hilfe-Karte mit Ueberschrift und dem einen gueltigen Link', /Vielleicht steht es schon hier/.test(mit) && /<a class="contact__karte-zeile" href="\/pages\/pflegeguide#ankunft">/.test(mit) && !/Ohne Link/.test(mit), true);
    const ohne = await kontakt([]);
    pruefe('Kontakt: ohne Hilfe-Links keine Karte', /contact-help|Vielleicht steht es/.test(ohne), false);
    pruefe('Kontakt: Reihenfolge Einleitung, WhatsApp, E-Mail, Hilfe-Karte, "Oder per Formular", Formular',
      [/Du hast eine Frage/, /data-whatsapp-link/, /Oder direkt per E-Mail:/, /Vielleicht steht es schon hier/, />Oder per Formular</, /<form /].map((r) => mit.search(r)).every((v, i, a) => v >= 0 && (i === 0 || v > a[i - 1])), true);
    pruefe('Kontakt: zwei Spalten (Wege links, Formular rechts)', /class="contact__aside"/.test(mit) && /class="contact__formular"/.test(mit) && mit.indexOf('contact__aside') < mit.indexOf('contact__formular') && mit.indexOf('Vielleicht steht es schon hier') < mit.indexOf('contact__formular'), true);
    pruefe('Kontakt: kein Telefonfeld mehr (sein Muster lehnte +49 ab)', /type="tel"|ContactForm-phone|pattern=/.test(mit), false);
    pruefe('Kontakt: Feld "Pflanze oder Bestellnummer (optional)", nicht Pflicht', /name="contact\[Pflanze oder Bestellnummer \(optional\)\]"/.test(mit) && !/ContactForm-order[\s\S]{0,200}aria-required/.test(mit), true);
    pruefe('Kontakt: Nachrichtenfeld heisst "Deine Nachricht"', /name="contact\[Deine Nachricht\]"/.test(mit) && /placeholder="Deine Nachricht"/.test(mit), true);
    pruefe('Kontakt: E-Mail bleibt Pflicht, Senden bleibt', /name="contact\[email\]"[\s\S]*?aria-required="true"/.test(mit) && />\s*Senden\s*</.test(mit), true);
    pruefe('Kontakt: WhatsApp bleibt erreichbar', /https:\/\/wa\.me\/491791627287/.test(mit.replace(/&amp;/g, '&')), true);
    const kein = await kontakt(hilfe, 'de', '');
    pruefe('Kontakt ohne Nummer: Hilfe-Karte und Formular bleiben, kein Satz "Oder per Formular"', /Vielleicht steht es/.test(kein) && /<form /.test(kein) && !/Oder per Formular/.test(kein), true);
    const en = await kontakt(hilfe, 'en');
    pruefe('Kontakt englisch: Karte, Feld und Nachricht', /Maybe the answer is already here/.test(en) && /Plant or order number \(optional\)/.test(en) && /Your message/.test(en), true);
    const quelle = fs.readFileSync(path.join(THEME, 'sections/contact-form.liquid'), 'utf8');
    pruefe('Kontakt: Block "hilfe" im Schema', /"type": "hilfe"/.test(quelle), true);
  }

  // ---- Reihen-Sektion: keine zweite h1 ---------------------------------------
  {
    const q = fs.readFileSync(path.join(THEME, 'sections/multirow.liquid'), 'utf8');
    pruefe('Multirow setzt keine eigene (versteckte) h1 mehr; die kommt vom Seitenkopf', /<h1/.test(q), false);
  }

  // ---- Fertig gefuellte Vorlagen ---------------------------------------------
  {
    const lade = (n) => JSON.parse(strip(fs.readFileSync(path.join(THEME, 'templates/' + n + '.json'), 'utf8')));
    const ueber = lade('page.about');
    pruefe('Ueber-Vorlage: Kopf, Reihen, Karten in dieser Reihenfolge, kein Standard-Seitentitel', JSON.stringify(ueber.order) === JSON.stringify(['head', 'hobby_timeline', 'info']) && Object.values(ueber.sections).every((s) => s.type !== 'main-page'), true);
    pruefe('Ueber-Vorlage: Seitenkopf fuer "Ueber Tungacea"', ueber.sections.head.type === 'page-head' && ueber.sections.head.settings.thema === 'about', true);
    const text = JSON.stringify(ueber);
    pruefe('Ueber-Vorlage: die beiden gestrichenen Wendungen sind weg', /bestem Wissen und Gewissen|Vom Interesse zur Leidenschaft/.test(text), false);
    pruefe('Ueber-Vorlage: neue Ueberschrift "Aus der Vitrine ins Zelt"', /Aus der Vitrine ins Zelt/.test(text), true);
    pruefe('Ueber-Vorlage: "Jede Bestellung packe ich persoenlich." bleibt', /Jede Bestellung packe ich persönlich\./.test(text), true);
    const info = Object.values(ueber.sections.info.blocks);
    pruefe('Ueber-Vorlage: Fakten nur aus den eigenen Texten (Seit 2024, Growzelte, Versand Mo und Di)', info.some((b) => b.settings.name === 'Seit' && b.settings.wert === '2024') && info.some((b) => /Growzelte/.test(b.settings.wert || '')) && info.some((b) => /Mo und Di/.test(b.settings.wert || '')), true);
    pruefe('Ueber-Vorlage: Links zu Kollektion, Archiv, Pflegeguide, Kontakt', ['shopify://collections/all', 'shopify://pages/archive', 'shopify://pages/pflegeguide', 'shopify://pages/contact'].every((l) => info.some((b) => b.settings.link === l)), true);
    const kont = lade('page.contact');
    pruefe('Kontakt-Vorlage: Kopf vor dem Formular, kein Standard-Seitentitel', JSON.stringify(kont.order) === JSON.stringify(['head', 'form']) && kont.sections.head.settings.thema === 'contact', true);
    const links = Object.values(kont.sections.form.blocks).map((b) => b.settings.link);
    pruefe('Kontakt-Vorlage: Hilfe-Links zu Ankunft, Probleme und Versand', links.includes('/pages/pflegeguide#ankunft') && links.includes('/pages/pflegeguide#probleme') && links.some((l) => /shipping-policy/.test(l)), true);
    // jede in den Vorlagen benutzte Sektion gibt es als Datei
    for (const [n, v] of [['page.about', ueber], ['page.contact', kont]]) {
      for (const s of Object.values(v.sections)) pruefe(n + ': Sektion ' + s.type + ' hat eine Datei', fs.existsSync(path.join(THEME, 'sections', s.type + '.liquid')), true);
    }
    // Einstellungen der Vorlagen kennt das Schema
    const schemaVon = (typ) => JSON.parse(fs.readFileSync(path.join(THEME, 'sections', typ + '.liquid'), 'utf8').match(/\{% schema %\}([\s\S]*?)\{% endschema %\}/)[1]);
    for (const [n, v] of [['page.about', ueber], ['page.contact', kont]]) {
      for (const s of Object.values(v.sections)) {
        if (!['page-head', 'page-info', 'contact-form'].includes(s.type)) continue;
        const sch = schemaVon(s.type);
        const ids = sch.settings.map((x) => x.id).filter(Boolean);
        pruefe(n + ': Einstellungen von ' + s.type + ' kennt das Schema', Object.keys(s.settings || {}).every((k) => ids.includes(k)), true);
        for (const b of Object.values(s.blocks || {})) {
          const bs = sch.blocks.find((x) => x.type === b.type);
          pruefe(n + ': Block ' + b.type + ' in ' + s.type + ' ist im Schema', !!bs && Object.keys(b.settings).every((k) => bs.settings.map((x) => x.id).includes(k)), true);
        }
      }
    }
  }

  console.log(fehler + ' Fehler in ' + geprueft + ' Pruefungen');
  process.exit(fehler ? 1 : 0);
})().catch((e) => { console.log('ABBRUCH: ' + e.message); process.exit(1); });

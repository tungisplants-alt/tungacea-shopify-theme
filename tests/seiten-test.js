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
async function karten(bloecke, einst = {}, sprache = 'de', shop = {}) {
  locale = sprache;
  return engine.renderFile('page-info', {}, { globals: { ...shop, section: { id: 'i', blocks: bloecke, settings: { color_scheme: 'scheme-1', padding_top: 0, padding_bottom: 64, ...einst } } } });
}
async function leiste(blocks, einst, produkte, sprache = 'de', gesamt) {
  locale = sprache;
  return engine.renderFile('announcement-bar', {}, { globals: {
    settings: {}, routes: { all_products_collection_url: '/collections/all' },
    collections: { all: { products: produkte, products_count: gesamt === undefined ? produkte.length : gesamt } },
    section: { id: 'a', blocks, settings: { color_scheme: 'scheme-1', show_social: false, auto_rotate: false, change_slides_speed: 5, show_line_separator: true, enable_country_selector: false, enable_language_selector: false, ...einst } },
  } });
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

  // ---- Karten: Live-Zeilen und Links mit Zeile darunter ---------------------------
  {
    const laden = (n, verfuegbar) => ({
      collections: { all: { products: Array.from({ length: n }, (_, i) => ({ available: i < verfuegbar })) } },
      shop: { metaobjects: { mutterpflanze: { values: Array.from({ length: 14 }, () => ({})) } } },
    });
    const live = [
      block('fakt', { name: 'Jetzt verfügbar', wert: '', live: 'verfuegbar', link: '/collections/all' }, 'v'),
      block('fakt', { name: 'Im Archiv', wert: '', live: 'archiv', link: '/pages/archive' }, 'a'),
      block('fakt', { name: 'Versand', wert: 'Mo und Di', live: 'keine' }, 's'),
    ];
    const h = await karten(live, {}, 'de', laden(5, 2));
    pruefe('Live: gerade zu kaufende Pflanzen werden gezaehlt (2 von 5)', /<dt>Jetzt verfügbar<\/dt>\s*<dd>\s*<a class="page-info__fakt-link" href="\/collections\/all">\s*<span>2 Exemplare<\/span>/.test(h), true);
    pruefe('Live: Archiv zeigt die Zahl der Eintraege (14) und ist ein Weg dorthin', /Im Archiv[\s\S]*?href="\/pages\/archive"[\s\S]*?<span>14 Pflanzen<\/span>/.test(h), true);
    pruefe('Live: Zeile ohne Link bleibt eine gewoehnliche Zeile', /<dt>Versand<\/dt>\s*<dd>Mo und Di<\/dd>/.test(h), true);
    pruefe('Live: Zahl 1 heisst "1 Exemplar", Zahl 0 "Gerade keine"', /<span>1 Exemplar<\/span>/.test(await karten(live, {}, 'de', laden(3, 1))) && /<span>Gerade keine<\/span>/.test(await karten(live, {}, 'de', laden(3, 0))), true);
    pruefe('Live: nur eine Zeile mit "Live" noetig, Zeile ohne Wert und ohne Live fehlt', zaehle(await karten([block('fakt', { name: 'Leer', wert: '', live: 'keine' })], {}, 'de', laden(1, 1)), /page-info__zeile/g), 0);
    pruefe('Ohne Live-Zeile werden weder Produkte noch Archiv angefasst (kein Fehler ohne Shop-Daten)', /Seit/.test(await karten([block('fakt', { name: 'Seit', wert: '2024', live: 'keine' })])), true);
    const en = await karten(live, {}, 'en', laden(5, 2));
    pruefe('Live englisch', /2 specimens/.test(en) && /14 plants/.test(en), true);
    const q = fs.readFileSync(path.join(THEME, 'sections/page-info.liquid'), 'utf8');
    pruefe('Zaehlung der kaufbaren Pflanzen laeuft in der Datei mit paginate (sonst nur 50)', /paginate collections\.all\.products by 250/.test(q), true);
    const links = await karten([block('link', { titel: 'Archiv', link: '/pages/archive', beschreibung: 'Mutterpflanzen und Kreuzungen' }), block('link', { titel: 'Guide', link: '/pages/pflegeguide' })]);
    pruefe('Link: kleine Zeile darunter nur wenn eingetragen', /page-info__beschreibung">Mutterpflanzen und Kreuzungen</.test(links) && zaehle(links, /page-info__beschreibung/g) === 1, true);
  }

  // ---- Ankuendigungsleiste: Live-Zahl statt Slogan ----------------------------------
  {
    const prod = (n, v) => Array.from({ length: n }, (_, i) => ({ available: i < v }));
    const b0 = [block('announcement', { text: 'egal', link: '' }, 'announcement-bar-0')];
    const an = await leiste(b0, { live_verfuegbar: true }, prod(6, 5));
    pruefe('Leiste live: "5 EXEMPLARE VERFÜGBAR" statt des Slogans', /<span>5 EXEMPLARE VERFÜGBAR<\/span>/.test(an) && !/LEBENDE KUNST/.test(an), true);
    pruefe('Leiste live: die Zeile fuehrt zur Kollektion', /href="\/collections\/all"/.test(an), true);
    const aus = await leiste(b0, { live_verfuegbar: false }, prod(6, 5));
    pruefe('Leiste ohne Schalter: der Slogan bleibt, kein Link', /SELTENE ANTHURIEN · LEBENDE KUNST/.test(aus) && !/<a /.test(aus), true);
    pruefe('Leiste live: 1 = "1 EXEMPLAR", 0 = "GERADE KEINE EXEMPLARE VERFÜGBAR"', /<span>1 EXEMPLAR VERFÜGBAR<\/span>/.test(await leiste(b0, { live_verfuegbar: true }, prod(4, 1))) && /<span>GERADE KEINE EXEMPLARE VERFÜGBAR<\/span>/.test(await leiste(b0, { live_verfuegbar: true }, prod(4, 0))), true);
    pruefe('Leiste live: mehr als 50 Produkte, die Zahl steht mit Plus', /<span>12\+ EXEMPLARE VERFÜGBAR<\/span>/.test(await leiste(b0, { live_verfuegbar: true }, prod(50, 12), 'de', 80)), true);
    const slider = await leiste([...b0, block('announcement', { text: 'Zweite Zeile', link: '' }, 'zwei')], { live_verfuegbar: true }, prod(6, 5));
    pruefe('Leiste mit mehreren Zeilen: nur die erste ist live, die zweite bleibt', /5 EXEMPLARE VERFÜGBAR/.test(slider) && /Zweite Zeile/.test(slider), true);
    pruefe('Leiste live englisch', /<span>5 SPECIMENS AVAILABLE<\/span>/.test(await leiste(b0, { live_verfuegbar: true }, prod(6, 5), 'en')), true);
    pruefe('Leiste ohne Blocke: nichts, auch keine Zaehlung noetig', /announcement-bar__message/.test(await leiste([], { live_verfuegbar: true }, prod(6, 5))), false);
    const hg = JSON.parse(strip(fs.readFileSync(path.join(THEME, 'sections/header-group.json'), 'utf8')));
    pruefe('Kopfbereich: Live-Zeile ist eingeschaltet', hg.sections['announcement-bar'].settings.live_verfuegbar, true);
    const schema = JSON.parse(fs.readFileSync(path.join(THEME, 'sections/announcement-bar.liquid'), 'utf8').match(/\{% schema %\}([\s\S]*?)\{% endschema %\}/)[1]);
    pruefe('Schema kennt die Einstellung live_verfuegbar', schema.settings.some((x) => x.id === 'live_verfuegbar'), true);
    const q = fs.readFileSync(path.join(THEME, 'sections/announcement-bar.liquid'), 'utf8');
    pruefe('Leiste zaehlt ohne paginate (sicher in einem Bereich auf jeder Seite)', /\{%-?\s*paginate/.test(q), false);
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

  // ---- Startseite ---------------------------------------------------------------
  {
    const t = JSON.parse(strip(fs.readFileSync(path.join(THEME, 'templates/index.json'), 'utf8')));
    const o = t.order;
    pruefe('Startseite: Karte "Auf einen Blick" direkt unter dem Banner', o.indexOf('hero') >= 0 && o[o.indexOf('hero') + 1] === 'info_glance' && t.sections.info_glance.type === 'page-info', true);
    pruefe('Startseite: Weiter-Karte steht nach dem Ueber-Teaser', o[o.indexOf('about') + 1] === 'info_next', true);
    pruefe('Startseite: Bewertungen (Judge.me) bleiben drin', Object.values(t.sections).some((s) => s.type === 'apps' && Object.values(s.blocks || {}).some((b) => /judge-me/.test(b.type))), true);
    const gl = Object.values(t.sections.info_glance.blocks);
    pruefe('Startseite: zwei Live-Zeilen (verfuegbar, Archiv) mit Link', gl.some((b) => b.settings.live === 'verfuegbar' && b.settings.link) && gl.some((b) => b.settings.live === 'archiv' && b.settings.link), true);
    const hero = t.sections.hero.blocks;
    pruefe('Banner: zwei Knoepfe (Kollektion, Archiv), die Zeile darueber wiederholt nicht die Ankuendigungsleiste', hero.button.settings.button_label_1 === 'Kollektion entdecken' && hero.button.settings.button_label_2 === 'Archiv ansehen' && hero.button.settings.button_link_2 === 'shopify://pages/archive' && hero.caption.settings.text !== 'Seltene Anthurien. Lebende Kunst.', true);
    const bs = t.sections.brand_statement;
    pruefe('Zitat: auf Schwarz (Schema 1), mit deutschen Anfuehrungszeichen', bs.settings.color_scheme === 'scheme-1' && /^„.*“$/.test(bs.blocks.heading.settings.heading), true);
    const schemaVon = (typ) => JSON.parse(fs.readFileSync(path.join(THEME, 'sections', typ + '.liquid'), 'utf8').match(/\{% schema %\}([\s\S]*?)\{% endschema %\}/)[1]);
    for (const id of ['info_glance', 'info_next']) {
      const sec = t.sections[id], sch = schemaVon('page-info');
      pruefe('Startseite ' + id + ': Einstellungen und Bloecke kennt das Schema', Object.keys(sec.settings).every((k) => sch.settings.map((x) => x.id).includes(k)) && Object.values(sec.blocks).every((b) => { const bs2 = sch.blocks.find((x) => x.type === b.type); return bs2 && Object.keys(b.settings).every((k) => bs2.settings.map((x) => x.id).includes(k)); }), true);
    }
    pruefe('Startseite: jeder Block in block_order existiert', ['info_glance', 'info_next'].every((id) => t.sections[id].block_order.every((b) => t.sections[id].blocks[b])), true);
  }

  console.log(fehler + ' Fehler in ' + geprueft + ' Pruefungen');
  process.exit(fehler ? 1 : 0);
})().catch((e) => { console.log('ABBRUCH: ' + e.message); process.exit(1); });

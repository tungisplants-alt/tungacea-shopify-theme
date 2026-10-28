// Prueft den WhatsApp-Weg auf der Kontaktseite: sections/contact-form.liquid gegen
// die ECHTEN Sprachdateien.
//
// Der Weg steht unter dem Einleitungstext, die E-Mail-Zeile und das Formular
// bleiben, was sie waren, und vor dem Formular steht "Oder per Formular:". Die
// Pruefungen halten fest, was nicht verloren gehen darf:
//   - die bestehende E-Mail-Zeile (Adresse aus shop.email) und das ganze Formular
//   - dieselbe Nummer und derselbe Satz wie in der Karte unten rechts, nicht
//     eine zweite getippte Fassung
//   - Reihenfolge: Einleitung, WhatsApp, E-Mail, "Oder per Formular:", Formular
//   - ohne gueltige Nummer oder bei ausgeschaltetem Schalter fehlt beides, der
//     Knopf UND der Satz, denn "Oder per Formular" ohne Knopf davor liest sich falsch
//
// Die Shopify-Tags form, style und schema sind hier nachgebaut.
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
  if (/\{\{/.test(hit)) throw new Error('Platzhalter nicht ersetzt: ' + key);
  return hit;
});
const ignoriere = (name) => engine.registerTag(name, {
  parse(token, remain) {
    const strom = this.liquid.parser.parseStream(remain)
      .on('tag:end' + name, () => strom.stop())
      .on('template', () => {})
      .on('end', () => { throw new Error('{% ' + name + ' %} nicht geschlossen'); });
    strom.start();
  },
  render() {},
});
ignoriere('style');
ignoriere('schema');
engine.registerTag('form', {
  parse(token, remain) {
    this.args = token.args;
    this.vorlagen = [];
    const strom = this.liquid.parser.parseStream(remain)
      .on('template', (t) => this.vorlagen.push(t))
      .on('tag:endform', () => strom.stop())
      .on('end', () => { throw new Error('{% form %} nicht geschlossen'); });
    strom.start();
  },
  * render(ctx, emitter) {
    const id = (this.args.match(/id:\s*'([^']+)'/) || [])[1] || 'contact_form';
    emitter.write('<form method="post" action="/contact#' + id + '" id="' + id + '">');
    ctx.push({ form: { 'posted_successfully?': false, errors: null } });
    yield this.liquid.renderer.renderTemplates(this.vorlagen, ctx, emitter);
    ctx.pop();
    emitter.write('</form>');
  },
});

const SHOP_MAIL = 'shop@example.com';
async function seite(settings, { zeigen = true, sprache = 'de', mail = SHOP_MAIL } = {}) {
  locale = sprache;
  return engine.renderFile('contact-form', {}, {
    globals: {
      settings,
      template: { name: 'page' },
      product: null,
      shop: { email: mail, privacy_policy: { url: '/policies/privacy-policy' } },
      customer: null,
      section: { id: 'form', settings: { heading: '', heading_size: 'h1', color_scheme: 'scheme-1', padding_top: 36, padding_bottom: 36, show_whatsapp: zeigen } },
    },
  });
}
async function karte(settings) {
  locale = 'de';
  return engine.renderFile('whatsapp-contact', {}, { globals: { settings, template: { name: 'page' }, product: null, shop: { privacy_policy: null } } });
}

const unescapeHtml = (s) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&#34;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const href = (html) => { const m = html.match(/href="([^"]*wa\.me[^"]*)"/); return m ? unescapeHtml(m[1]) : undefined; };
const pos = (html, muster) => { const m = html.search(muster); return m; };

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

  // ---- Mit Nummer: Knopf, Satz, Reihenfolge ---------------------------------
  {
    const html = await seite(gut);
    pruefe('WhatsApp-Link zeigt auf die Nummer', (href(html) || '').split('?')[0], 'https://wa.me/491791627287');
    pruefe('Knopf traegt die Klasse fuer die Kontaktseite', /class="whatsapp-contact__option contact__whatsapp"/.test(html), true);
    pruefe('Knopf heisst "Per WhatsApp" mit dem Zusatz', /Per WhatsApp<span class="whatsapp-contact__hint"><span[^>]*>&bull;<\/span>schnellere Antwort/.test(html.replace(/\s+/g, ' ').replace(/> </g, '><')), true);
    pruefe('Satz "Oder per Formular:" steht genau einmal da', (html.match(/Oder per Formular:/g) || []).length, 1);
    pruefe('Der Satz ist ein eigener Absatz mit Klasse', /<p class="contact__form-lead">Oder per Formular:<\/p>/.test(html), true);
    pruefe('Stylesheet der Karte wird geladen, sonst hat der Knopf keinen Rahmen', /component-whatsapp-contact\.css/.test(html), true);
    pruefe('Link oeffnet neu und mit noopener', /target="_blank"/.test(html) && /rel="noopener noreferrer"/.test(html), true);
    pruefe('Satz auf der Kontaktseite ist der offene allgemeine Satz', decodeURIComponent((href(html) || '').split('?text=')[1] || ''), 'Hallo Tung, ich habe eine Frage zu…');

    const einl = pos(html, /Du hast eine Frage zu einem Exemplar/);
    const wa = pos(html, /data-whatsapp-link/);
    const mail = pos(html, /Oder direkt per E-Mail:/);
    const lead = pos(html, /Oder per Formular:/);
    const form = pos(html, /<form /);
    pruefe('Reihenfolge: Einleitung, WhatsApp, E-Mail-Zeile, "Oder per Formular", Formular',
      einl >= 0 && einl < wa && wa < mail && mail < lead && lead < form, true);
  }

  // ---- Das Bestehende bleibt ------------------------------------------------
  for (const [name, html] of [
    ['mit WhatsApp', await seite(gut)],
    ['ohne WhatsApp (Schalter aus)', await seite(gut, { zeigen: false })],
    ['ohne gueltige Nummer', await seite({ whatsapp_nummer: '' })],
  ]) {
    pruefe(name + ': Einleitungstext bleibt', /Du hast eine Frage zu einem Exemplar, zum Versand oder zur Eingewöhnung deiner Pflanze\?/.test(html), true);
    pruefe(name + ': E-Mail-Zeile bleibt, Adresse aus shop.email', /Oder direkt per E-Mail:\s*<a class="link" href="mailto:shop@example\.com">shop@example\.com<\/a>/.test(html), true);
    pruefe(name + ': Formular bleibt', /<form[^>]*action="\/contact#ContactForm"/.test(html), true);
    pruefe(name + ': E-Mail-Feld bleibt Pflichtfeld', /name="contact\[email\]"[\s\S]*?aria-required="true"/.test(html), true);
    pruefe(name + ': Senden-Knopf bleibt', />\s*Senden\s*</.test(html), true);
    pruefe(name + ': Kommentarfeld bleibt', /name="contact\[Kommentar\]"/.test(html), true);
  }

  // ---- Ohne Knopf auch ohne den Satz ---------------------------------------
  {
    const aus = await seite(gut, { zeigen: false });
    pruefe('Schalter aus: kein WhatsApp-Link', /wa\.me/.test(aus), false);
    pruefe('Schalter aus: auch kein Satz "Oder per Formular"', /Oder per Formular/.test(aus), false);
    pruefe('Schalter aus: kein leerer Absatz uebrig', /contact__form-lead/.test(aus), false);
    for (const [name, nr] of Object.entries({ leer: '', zu_kurz: '12345', Buchstaben: '+49 179 abc4567', zu_lang: '+49 179 16272871234567' })) {
      const h = await seite({ whatsapp_nummer: nr });
      pruefe('Nummer ' + name + ': kein Link ins Leere', /wa\.me/.test(h), false);
      pruefe('Nummer ' + name + ': kein Satz "Oder per Formular" ohne Knopf davor', /Oder per Formular/.test(h), false);
    }
    pruefe('Nummer fehlt ganz: nichts Neues auf der Seite', /wa\.me|Oder per Formular/.test(await seite({})), false);
  }

  // ---- Dieselbe Nummer wie die Karte ----------------------------------------
  {
    for (const nr of ['+49 179 1627287', '0179 1627287', '0049 179 1627287', '+49-179-1627287']) {
      const s = { whatsapp_nummer: nr };
      const a = href(await seite(s));
      const b = href(await karte(s));
      pruefe('Nummer "' + nr + '": Kontaktseite und Karte nutzen denselben Link', a, b);
    }
    const quelle = fs.readFileSync(path.join(THEME, 'sections/contact-form.liquid'), 'utf8');
    pruefe('In der Sektion steht keine zweite getippte Nummer und kein wa.me', /wa\.me|1627287|\b49179/.test(quelle), false);
  }

  // ---- Englisch --------------------------------------------------------------
  {
    const en = await seite(gut, { sprache: 'en' });
    pruefe('Englisch: Knopf', /On WhatsApp<span class="whatsapp-contact__hint"><span[^>]*>&bull;<\/span>quicker reply/.test(en.replace(/\s+/g, ' ').replace(/> </g, '><')), true);
    pruefe('Englisch: Satz vor dem Formular', /<p class="contact__form-lead">Or use the form:<\/p>/.test(en), true);
    pruefe('Englisch: vorausgefuellter Satz', decodeURIComponent((href(en) || '').split('?text=')[1] || ''), 'Hi Tung, I have a question about…');
    pruefe('Englisch: bestehende Zeile bleibt', /Or email me directly:/.test(en), true);
    pruefe('Englisch: kein deutsches Wort im neuen Teil', /Per WhatsApp|schnellere|Oder per Formular/.test(en), false);
  }

  console.log(fehler + ' Fehler in ' + geprueft + ' Pruefungen');
  process.exit(fehler ? 1 : 0);
})().catch((e) => {
  console.log('ABBRUCH: ' + e.message);
  process.exit(1);
});

// Prueft den Schreib-mir-Knopf: snippets/whatsapp-contact.liquid gegen die ECHTEN
// Sprachdateien.
//
// Der Knopf klappt eine Karte auf, mit zwei Wegen: WhatsApp (ein Link auf wa.me)
// und E-Mail (Shopifys Kontaktformular). Ein falscher Link faellt nicht auf, er
// fuehrt einfach zu einer Seite "Nummer ungueltig", und der Kunde schreibt nicht.
// Darum wird hier die fertige Adresse geprueft, Zeichen fuer Zeichen:
//   - die Nummer steht nur mit Ziffern und Laendervorwahl im Pfad
//   - eine Nummer, die keine ist, laesst den WhatsApp-Weg weg
//   - der Satz ist kodiert, auch bei Anfuehrungszeichen, & und Sonderzeichen im
//     Produktnamen, und enthaelt kein rohes + fuer ein Leerzeichen
//   - das Formular schickt an Shopify (contact[email] Pflicht, contact[body]),
//     steht nach dem Absenden offen, zeigt Erfolg und Fehler, und die Adresse des
//     Shops steht nirgends auf der Seite
//   - Deutsch und Englisch kommen aus den Sprachdateien, nicht aus dem Snippet
//
// Das form-Tag gibt es nur in Shopify. Es ist hier nachgebaut, mit derselben
// Ausgabe wie in der Shopify-Dokumentation (liquid/tags/form).
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
let formZustand = { ok: false, fehler: false };

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
    const klasse = (this.args.match(/class:\s*'([^']+)'/) || [])[1] || 'contact-form';
    emitter.write('<form method="post" action="/contact#' + id + '" id="' + id + '" accept-charset="UTF-8" class="' + klasse +
      '"><input type="hidden" name="form_type" value="contact" /><input type="hidden" name="utf8" value="✓" />');
    ctx.push({ form: { 'posted_successfully?': formZustand.ok, errors: formZustand.fehler ? { email: ['x'] } : null } });
    yield this.liquid.renderer.renderTemplates(this.vorlagen, ctx, emitter);
    ctx.pop();
    emitter.write('</form>');
  },
});

async function render(settings, { template = 'index', produkt = null, sprache = 'de', form = {}, datenschutz = true } = {}) {
  locale = sprache;
  formZustand = { ok: !!form.ok, fehler: !!form.fehler };
  return engine.renderFile('whatsapp-contact', {}, {
    globals: {
      settings,
      template: { name: template },
      product: produkt,
      shop: { privacy_policy: datenschutz ? { url: '/policies/privacy-policy' } : null },
    },
  });
}

// Was der Browser aus dem Attribut macht: erst HTML zuruecknehmen, dann ist es die URL.
const unescapeHtml = (s) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&#34;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const rohHref = (html) => (html.match(/href="([^"]*wa\.me[^"]*)"/) || [])[1];
const href = (html) => { const r = rohHref(html); return r === undefined ? undefined : unescapeHtml(r); };
const text = (html) => decodeURIComponent((href(html) || '').split('?text=')[1] || '');
const aussenTag = (html) => (html.match(/<details class="whatsapp-contact"[^>]*>/) || [''])[0];
const hatWa = (html) => /href="[^"]*wa\.me/.test(html);
const hatKnopf = (html) => /class="whatsapp-contact"/.test(html);
const hatFormular = (html) => /<form[^>]*action="\/contact#WhatsappContactForm"/.test(html);

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
  const nurMail = { whatsapp_nummer: '' };
  const nurWa = { ...gut, kontakt_mail_aktiv: false };

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
    'mit Klammern': '+49 (179) 16 27 287',
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
    pruefe('ungueltige Nummer "' + name + '": kein WhatsApp-Link', hatWa(html), false);
    pruefe('ungueltige Nummer "' + name + '": der E-Mail-Weg bleibt, der Knopf erscheint', hatKnopf(html) && hatFormular(html), true);
  }
  pruefe('Nummer fehlt ganz: kein WhatsApp-Link', hatWa(await render({})), false);

  // ---- Ein und Aus --------------------------------------------------------
  pruefe('ganz abgeschaltet: nichts', hatKnopf(await render({ ...gut, whatsapp_aktiv: false })), false);
  pruefe('eingeschaltet: Knopf', hatKnopf(await render({ ...gut, whatsapp_aktiv: true })), true);
  pruefe('Schalter nicht gesetzt: Knopf (Vorgabe ist an)', hatKnopf(await render(gut)), true);
  pruefe('E-Mail aus: kein Formular', /<form/.test(await render(nurWa)), false);
  pruefe('E-Mail aus: WhatsApp-Link bleibt', hatWa(await render(nurWa)), true);
  pruefe('E-Mail aus und Nummer ungueltig: gar kein Knopf', hatKnopf(await render({ whatsapp_nummer: 'x', kontakt_mail_aktiv: false })), false);
  pruefe('E-Mail aus und Knopf aus: nichts', hatKnopf(await render({ ...nurWa, whatsapp_aktiv: false })), false);
  pruefe('E-Mail an, Knopf aus: nichts', hatKnopf(await render({ ...nurMail, whatsapp_aktiv: false })), false);
  pruefe('E-Mail ausdruecklich an: Formular', hatFormular(await render({ ...nurMail, kontakt_mail_aktiv: true })), true);

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
    // Im Textfeld des Formulars steht derselbe Name, aber als Text und nicht als Markup.
    const feld = (html.match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/) || [])[1];
    pruefe('Produktname mit ' + name + ': im Nachrichtenfeld als Text', unescapeHtml(feld || ''), 'Hallo Tung, ich habe eine Frage zu ' + titel + '.');
    pruefe('Produktname mit ' + name + ': kein Markup aus dem Namen im Nachrichtenfeld', /<b>|<script/.test(feld || ''), false);
  }
  pruefe('kein Skript aus dem Produktnamen im Seitentext',
    /<script>x|<b>/.test(await render(gut, { template: 'product', produkt: { title: '<script>x</script><b>' } })), false);

  // ---- Die Karte ----------------------------------------------------------
  {
    const html = await render(gut);
    pruefe('Knopf ist ein details mit summary', /<details class="whatsapp-contact"[^>]*>\s*<summary class="whatsapp-contact__toggle"/.test(html), true);
    pruefe('zugeklappt, solange nichts gesendet wurde', / open/.test(aussenTag(html)), false);
    pruefe('Knopf hat einen Namen fuer Screenreader, auch wenn der Text am Telefon fehlt',
      /<summary[^>]*aria-label="Schreib mir"/.test(html), true);
    pruefe('Einleitung steht in der Karte', /Du schreibst direkt an mich\./.test(html), true);
    pruefe('Link zu WhatsApp heisst "Per WhatsApp"', />Per WhatsApp</.test(html), true);
    pruefe('WhatsApp-Link: neues Fenster, noopener noreferrer, Hinweis fuer Screenreader',
      /target="_blank"/.test(html) && /rel="noopener noreferrer"/.test(html) && /aria-describedby="a11y-new-window-message"/.test(html), true);
    pruefe('Der Weg "Per E-Mail" steht in der Karte', /<summary class="whatsapp-contact__option whatsapp-contact__option--mail">Per E-Mail</.test(html), true);
    pruefe('beide Symbole sind fuer Screenreader versteckt', (html.match(/<svg[^>]*aria-hidden="true"/g) || []).length, 2);
    pruefe('Stylesheet und Skript werden geladen', /component-whatsapp-contact\.css/.test(html) && /<script src="\/assets\/whatsapp-contact\.js"/.test(html), true);
    pruefe('nur WhatsApp (E-Mail aus): trotzdem die Karte, ohne E-Mail-Weg', />Per E-Mail</.test(await render(nurWa)), false);
    pruefe('die Karte steht auch dann nicht offen, wenn nur der E-Mail-Weg da ist', / open/.test(aussenTag(await render(nurMail))), false);
  }

  // ---- Das Formular -------------------------------------------------------
  {
    const html = await render(gut, { template: 'product', produkt: { title: 'Anthurium X' } });
    pruefe('Formular schickt an Shopifys Kontaktformular', hatFormular(html), true);
    pruefe('Methode ist post', /<form method="post"/.test(html), true);
    pruefe('E-Mail-Feld: type email, Name contact[email], Pflicht',
      /<input[^>]*type="email"[^>]*name="contact\[email\]"[^>]*required|<input[^>]*name="contact\[email\]"[^>]*type="email"[^>]*required/.test(html.replace(/\s+/g, ' ')), true);
    pruefe('E-Mail-Feld: Autovervollstaendigen email', /autocomplete="email"/.test(html), true);
    pruefe('Nachricht: textarea contact[body], Pflicht',
      /<textarea[^>]*name="contact\[body\]"[^>]*required/.test(html.replace(/\s+/g, ' ')), true);
    pruefe('Name: contact[name], nicht Pflicht', (() => {
      const m = html.replace(/\s+/g, ' ').match(/<input[^>]*name="contact\[name\]"[^>]*>/);
      return !!m && !/required/.test(m[0]);
    })(), true);
    pruefe('Nachricht ist vorausgefuellt', /<textarea[^>]*>Hallo Tung, ich habe eine Frage zu Anthurium X\.<\/textarea>/.test(html), true);
    pruefe('Senden-Knopf ist type submit', /<button[^>]*type="submit"[^>]*>Senden</.test(html.replace(/\s+/g, ' ')), true);
    // Jedes Etikett gehoert zu einem Feld.
    const fuer = [...html.matchAll(/<label[^>]*for="([^"]+)"/g)].map((m) => m[1]);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    pruefe('jedes Etikett zeigt auf ein vorhandenes Feld', fuer.length === 3 && fuer.every((f) => ids.includes(f)), true);
    pruefe('Feld-IDs sind eindeutig', new Set(ids).size === ids.length, true);
    pruefe('Schriftgroesse in den Feldern verhindert den Zoom auf dem iPhone', /font-size:\s*1\.6rem/.test(fs.readFileSync(path.join(THEME, 'assets/component-whatsapp-contact.css'), 'utf8')), true);
    pruefe('keine E-Mail-Adresse und kein mailto auf der Seite', /mailto:|@[a-z0-9-]+\.[a-z]{2,}/i.test(html), false);
    pruefe('Datenschutzerklaerung ist verlinkt', /Mehr dazu in der\s*<a href="\/policies\/privacy-policy">Datenschutzerklärung<\/a>\./.test(html), true);
    pruefe('ohne Datenschutzerklaerung im Shop: kein Absatz, kein Link ins Leere',
      /whatsapp-contact__privacy|Datenschutzerkl/.test(await render(gut, { datenschutz: false })), false);
  }

  // ---- Nach dem Absenden --------------------------------------------------
  {
    const ok = await render(gut, { form: { ok: true } });
    pruefe('gesendet: die Karte steht offen', / open/.test(aussenTag(ok)), true);
    pruefe('gesendet: der E-Mail-Weg steht offen', /<details class="whatsapp-contact__mail" open>/.test(ok), true);
    pruefe('gesendet: Bestaetigung steht da', /Danke, deine Nachricht ist bei mir angekommen\./.test(ok), true);
    pruefe('gesendet: Bestaetigung wird Screenreadern gemeldet', /role="status"/.test(ok), true);
    pruefe('gesendet: keine Felder mehr, nichts wird doppelt abgeschickt', /<input[^>]*name="contact\[email\]"|<textarea/.test(ok), false);
    pruefe('gesendet: der WhatsApp-Weg bleibt', hatWa(ok), true);
    pruefe('gesendet: kein Fehlertext', /Das hat nicht geklappt/.test(ok), false);

    const err = await render(gut, { form: { fehler: true } });
    pruefe('Fehler: die Karte steht offen', / open/.test(aussenTag(err)), true);
    pruefe('Fehler: Hinweis steht da', /Das hat nicht geklappt\./.test(err), true);
    pruefe('Fehler: Hinweis wird Screenreadern gemeldet', /role="alert"/.test(err), true);
    pruefe('Fehler: die Felder sind noch da, man kann es noch einmal versuchen', /name="contact\[email\]"/.test(err) && /<textarea/.test(err), true);
    pruefe('Fehler: keine Bestaetigung', /bei mir angekommen/.test(err), false);

    const still = await render(gut);
    pruefe('ohne Absenden: weder Erfolg noch Fehler', /data-kontakt-zustand/.test(still), false);
  }

  // ---- Deutsch und Englisch -----------------------------------------------
  {
    const de = await render(gut, { template: 'product', produkt: { title: 'Anthurium X' }, sprache: 'de' });
    const en = await render(gut, { template: 'product', produkt: { title: 'Anthurium X' }, sprache: 'en' });
    pruefe('Deutsch: Text im Knopf', />Schreib mir</.test(de), true);
    pruefe('Deutsch: Satz', text(de), 'Hallo Tung, ich habe eine Frage zu Anthurium X.');
    pruefe('Englisch: Text im Knopf', />Message me</.test(en), true);
    pruefe('Englisch: Name fuer Screenreader enthaelt den sichtbaren Text', /<summary[^>]*aria-label="Message me"/.test(en), true);
    pruefe('Englisch: Satz', text(en), 'Hi Tung, I have a question about Anthurium X.');
    pruefe('Englisch: Wege heissen On WhatsApp und By email', />On WhatsApp</.test(en) && />By email</.test(en), true);
    pruefe('Englisch: Formularbeschriftung', /Your name \(optional\)/.test(en) && /Your email address/.test(en) && /Your message/.test(en) && />Send</.test(en), true);
    pruefe('Englisch: Datenschutz', /privacy policy<\/a>/.test(en), true);
    pruefe('Englisch: Erfolg', /Thank you, your message has reached me\./.test(await render(gut, { sprache: 'en', form: { ok: true } })), true);
    pruefe('Englisch: Fehler', /That didn't work\./.test((await render(gut, { sprache: 'en', form: { fehler: true } })).replace(/&#39;/g, "'")), true);
    // Sichtbarer Text darf kein Deutsch enthalten, auch nicht im Formular.
    const sichtbar = en.replace(/<[^>]*>/g, ' ').replace(/Hallo|Frage/g, '');
    pruefe('Englisch: kein deutsches Wort im sichtbaren Text', /Schreib|Per |Deine|Dein |Senden|Danke|Datenschutz|Du schreibst/.test(sichtbar), false);
    pruefe('beide Sprachen: dieselbe Nummer', href(de).split('?')[0], href(en).split('?')[0]);
  }

  console.log(fehler + ' Fehler in ' + geprueft + ' Pruefungen');
  process.exit(fehler ? 1 : 0);
})().catch((e) => {
  console.log('ABBRUCH: ' + e.message);
  process.exit(1);
});

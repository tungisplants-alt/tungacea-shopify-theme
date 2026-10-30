// Prueft den Block "Im Fokus" oben im Archiv (snippets/plant-archive-focus.liquid)
// und wie die Archiv-Vorlage die Pflanze dafuer waehlt.
//
// Was schiefgehen kann:
// 1. Leere Felder erzeugen leere Zeilen oder ein leeres Zitat.
// 2. "Nicht bekannt" erscheint als Abstammung.
// 3. Ein fremdes Foto ohne Freigabe steht gross oben.
// 4. Die Vorlage verliert die Auswahl im Editor oder den Rueckfall.
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

const engine = new Liquid({ root: [path.join(THEME, 'snippets'), path.join(THEME, 'sections')], extname: '.liquid' });
require('./shopify-tags')(engine);
engine.registerFilter('asset_url', v => '/assets/' + v);
engine.registerFilter('stylesheet_tag', v => '<link rel="stylesheet" href="' + v + '">');
engine.registerFilter('placeholder_svg_tag', (v, cls) => '<svg class="' + (cls || '') + '"></svg>');
engine.registerFilter('image_url', function (v, ...rest) {
  const w = (rest.find(r => Array.isArray(r) && r[0] === 'width') || [])[1] || 100;
  return String(v) + '?width=' + w;
});
engine.registerFilter('image_tag', function (src, ...rest) {
  const o = {};
  for (const r of rest) if (Array.isArray(r)) o[r[0]] = r[1];
  return '<img src="' + src + '" alt="' + String(o.alt || '') + '" class="' + (o.class || '') + '" loading="' + (o.loading || '') + '">';
});
engine.registerFilter('t', function (key, ...rest) {
  const opts = {};
  for (const r of rest) if (Array.isArray(r)) opts[r[0]] = r[1];
  let hit = String(key).split('.').reduce((o, k) => (o == null ? undefined : o[k]), LOC[locale]);
  if (hit === undefined) throw new Error('FEHLENDER Schluessel [' + locale + ']: ' + key);
  if (hit && typeof hit === 'object') hit = Number(opts.count) === 1 ? hit.one : hit.other;
  for (const [k, v] of Object.entries(opts)) hit = hit.split('{{ ' + k + ' }}').join(String(v));
  return hit;
});

const feld = v => ({ value: v === undefined ? null : v });
const fremd = { name: { value: 'Yolanda' } };
const bild = (datei, fotograf, freigabe) => ({
  bild: feld('cdn://' + datei), fotograf: feld(fotograf || null), bildfreigabe: feld(freigabe === undefined ? null : freigabe),
});
const pflanze = extra => Object.assign({
  bezeichnung: feld('Anthurium Fokuspflanze'), mutter_id: feld('TA-1001'),
  kreuzung: feld(null), notiz: feld(null), merkmal: feld(null),
  fotos: { value: [] }, fotograf: feld(null), bildfreigabe: feld(null), bilder: { value: [] },
  generation: feld(null), stadium: feld(null), reinheit: feld(null), linie: { value: [] }, merkmale: { value: [] },
  zuechter: feld(null), besitzer: feld(null), angebote: { value: [] },
  system: { handle: 'fokus', url: '/pflanzen/fokus' },
}, extra || {});

const faelle = [
  {
    name: 'Volle Pflanze: Kopf, Nummer, Name, Abstammung, Notiz, Link',
    eintrag: pflanze({
      kreuzung: feld('(Ralph Lynam x Fort Sherman) x (Ralph Lynam x Fort Sherman)'),
      notiz: feld('Lieblingsexemplar aus dieser F2-Kreuzung.'),
      merkmal: feld('Längliche Form'),
      bilder: { value: [bild('eins.jpg'), bild('zwei.jpg')] },
    }),
    erwartet: { de: ['Im Fokus', 'Zum Exemplar'], en: ['In focus', 'View specimen'] },
    immer: ['TA-1001', 'Anthurium Fokuspflanze', 'plant-focus-note', 'Lieblingsexemplar', 'Tung',
      'cdn://eins.jpg', 'plant-focus__image--zweites', 'href="/pflanzen/fokus"'],
    // Keine Abstammungszeile: der Name nennt die Kreuzung meist schon.
    verboten: ['plant-focus-trait', 'Längliche Form', 'plant-focus-cross', '(Ralph Lynam x Fort Sherman)'],
    reihenfolge: ['plant-focus__eyebrow', 'plant-focus__id', 'plant-focus__name', 'plant-focus-note', 'plant-focus-link'],
  },
  {
    name: 'Ohne Notiz steht das Hauptmerkmal',
    eintrag: pflanze({ merkmal: feld('Fast schwarze, breite Blattfläche'), fotos: { value: ['cdn://a.jpg'] } }),
    immer: ['plant-focus-trait', 'Fast schwarze'],
    verboten: ['plant-focus-note', '<blockquote>'],
  },
  {
    name: 'Ohne Notiz, Merkmal und Abstammung: nur das Schild',
    eintrag: pflanze({ kreuzung: feld('Nicht bekannt'), mutter_id: feld(null) }),
    immer: ['Anthurium Fokuspflanze', 'plant-focus__image--placeholder'],
    verboten: ['plant-focus-note', 'plant-focus-trait', 'plant-focus-cross', 'Nicht bekannt', 'plant-focus__id'],
  },
  {
    name: 'Fremdes Foto ohne Freigabe wird nicht gross gezeigt',
    eintrag: pflanze({ bilder: { value: [bild('fremd.jpg', fremd, false), bild('eigen.jpg')] } }),
    immer: ['cdn://eigen.jpg'],
    verboten: ['cdn://fremd.jpg'],
  },
  {
    name: 'Ohne eigene Seite kein Link',
    eintrag: pflanze({ system: { handle: 'x', url: null } }),
    immer: ['Anthurium Fokuspflanze'],
    verboten: ['plant-focus-link', 'href=""'],
  },
];

(async () => {
  let fails = 0, checks = 0;
  const pruefe = (ok, text) => { checks++; if (!ok) { fails++; console.log('FEHLER ' + text); } };

  for (const f of faelle) {
    for (const loc of ['de', 'en']) {
      locale = loc;
      let html;
      try {
        html = await engine.renderFile('plant-archive-focus', { eintrag: f.eintrag });
      } catch (e) {
        pruefe(false, '[' + loc + '] ' + f.name + ': ' + e.message);
        continue;
      }
      for (const e of (f.immer || []).concat((f.erwartet || {})[loc] || [])) pruefe(html.includes(e), '[' + loc + '] ' + f.name + ': fehlt "' + e + '"');
      for (const v of f.verboten || []) pruefe(!html.includes(v), '[' + loc + '] ' + f.name + ': enthaelt "' + v + '"');
      if (f.reihenfolge) {
        const pos = f.reihenfolge.map(r => html.indexOf(r));
        pruefe(!pos.some((p, i) => p < 0 || (i > 0 && p < pos[i - 1])), '[' + loc + '] ' + f.name + ': Reihenfolge');
      }
      if (loc === 'en') pruefe(!/Im Fokus|Zum Exemplar/.test(html), '[en] ' + f.name + ': deutscher Text');
      // Das grosse Foto oben laedt nicht verzoegert erst beim Scrollen? Es steht
      // unter dem Seitenkopf, also ist lazy hier richtig. Nur pruefen, dass kein
      // leeres src entsteht.
      pruefe(!html.includes('src=""'), '[' + loc + '] ' + f.name + ': leeres src');
    }
  }

  // --- Wechselnder Fokus ---
  locale = 'de';
  {
    const html = await engine.renderFile('plant-archive-focus', { eintrag: pflanze(), wechsel: true, versteckt: true });
    pruefe(/data-fokus-wahl="fokus"/.test(html), 'Wechsel: Handle fehlt als data-fokus-wahl');
    pruefe(/<article[^>]*\shidden[\s>]/.test(html), 'Wechsel: versteckter Block ohne hidden');
    pruefe(!/"data-fokus-wahl|"hidden/.test(html), 'Wechsel: Merkmale kleben am vorigen');
    const fest = await engine.renderFile('plant-archive-focus', { eintrag: pflanze() });
    pruefe(!/data-fokus-wahl|\shidden[\s>]/.test(fest), 'Fest: darf weder wechseln noch versteckt sein');
  }
  // Ganze Archiv-Vorlage: drei passende Pflanzen, eine ohne Notiz, eine
  // mit gesperrtem Foto, eine fremde. Nur die drei wechseln, die erste ist sichtbar.
  const mit = (h, extra) => pflanze(Object.assign({ system: { handle: h, url: '/pflanzen/' + h }, bezeichnung: feld('Pflanze ' + h) }, extra));
  const werte = [
    mit('a', { notiz: feld('Notiz a'), fotos: { value: ['cdn://a.jpg'] } }),
    mit('b', { fotos: { value: ['cdn://b.jpg'] } }),
    mit('c', { notiz: feld('Notiz c'), bilder: { value: [bild('c.jpg')] } }),
    mit('d', { notiz: feld('Notiz d'), fotos: { value: ['cdn://d.jpg'] }, fotograf: feld(fremd), bildfreigabe: feld(false) }),
    mit('e', { notiz: feld('Notiz e'), fotos: { value: ['cdn://e.jpg'] }, besitzer: feld(fremd) }),
    mit('f', { notiz: feld('Notiz f'), fotos: { value: ['cdn://f.jpg'] } }),
  ];
  const sektion_rendern = settings => engine.renderFile('main-plant-archive', {}, { globals: {
    shop: { metaobjects: { mutterpflanze: { values: werte } } }, collections: { all: { products: [] } },
    section: { id: 's1', settings: Object.assign({ eyebrow: '', heading: '', intro: '', fokus_zeigen: true, fokus: null }, settings) },
    request: { design_mode: false } } });
  {
    const html = await sektion_rendern({});
    const wahl = (html.match(/data-fokus-wahl="([^"]+)"/g) || []).map(x => x.split('"')[1]);
    pruefe(JSON.stringify(wahl) === '["a","c","f"]', 'Vorlage: Kandidaten falsch ' + JSON.stringify(wahl));
    const sichtbar = (html.match(/<article\s+class="plant-focus"[^>]*>/g) || []).filter(t => !/\shidden/.test(t));
    pruefe(sichtbar.length === 1 && /data-fokus-wahl="a"/.test(sichtbar[0]), 'Vorlage: genau die erste muss ohne Skript sichtbar sein');
    pruefe(/plant-focus-wechsel/.test(html) && /localStorage/.test(html), 'Vorlage: Wechsel-Skript fehlt');
  }
  {
    const html = await sektion_rendern({ fokus: werte[5] });
    pruefe(!/data-fokus-wahl|plant-focus-wechsel/.test(html), 'Feste Auswahl: darf nicht wechseln');
    pruefe((html.match(/class="plant-focus"/g) || []).length === 1 && /Notiz f/.test(html), 'Feste Auswahl: genau die gewaehlte Pflanze');
  }
  {
    const html = await sektion_rendern({ fokus_zeigen: false });
    pruefe(!/plant-focus/.test(html.replace(/plant-focus__|plant-focus-/g, 'x')), 'Schalter aus: kein Fokus');
  }
  {
    const galerie = fs.readFileSync(path.join(THEME, 'snippets/plant-archive-gallery.liquid'), 'utf8');
    const skript = galerie.split('<script>')[1] || '';
    pruefe((skript.match(/try \{/g) || []).length === 2, 'Skript: localStorage nicht in try/catch');
    const css = fs.readFileSync(path.join(THEME, 'assets/component-plant-archive.css'), 'utf8');
    pruefe(/\.plant-focus\[hidden\]\s*\{\s*display:\s*none/.test(css), 'CSS: hidden wird von display:grid ausgehebelt');
  }

  // Die Vorlage: Auswahl im Editor, Schalter, Rueckfall.
  const sektion = fs.readFileSync(path.join(THEME, 'sections/main-plant-archive.liquid'), 'utf8');
  const schema = JSON.parse(sektion.split('{% schema %}')[1].split('{% endschema %}')[0]);
  const auswahl = schema.settings.find(s => s.id === 'fokus');
  pruefe(auswahl && auswahl.type === 'metaobject' && auswahl.metaobject_type === 'mutterpflanze', 'Schema: Auswahl "fokus" fehlt oder falscher Typ');
  const schalter = schema.settings.find(s => s.id === 'fokus_zeigen');
  pruefe(schalter && schalter.type === 'checkbox' && schalter.default === true, 'Schema: Schalter "fokus_zeigen" fehlt');
  pruefe(/section\.settings\.fokus != blank/.test(sektion) && /fokus_wechsel/.test(sektion), 'Vorlage: Auswahl oder Rueckfall fehlt');
  pruefe(/render 'plant-archive-gallery',\s*fokus: fokus,\s*fokus_wechsel: fokus_wechsel/.test(sektion), 'Vorlage: Fokus wird nicht an die Galerie gereicht');
  const galerie = fs.readFileSync(path.join(THEME, 'snippets/plant-archive-gallery.liquid'), 'utf8');
  pruefe(/if fokus != blank/.test(galerie) && /render 'plant-archive-focus'/.test(galerie), 'Galerie: Fokus wird nicht gezeigt');
  pruefe(/plant-archive-reveal\.js/.test(galerie), 'Galerie: Einblend-Skript fehlt');

  // Einblenden: ohne Skript sichtbar, reduzierte Bewegung respektiert.
  const css = fs.readFileSync(path.join(THEME, 'assets/component-plant-archive.css'), 'utf8');
  pruefe(!/^\.plant-card\s*\{[^}]*opacity:\s*0/m.test(css), 'CSS: Kacheln ohne Skript unsichtbar');
  pruefe(/\.plant-archive--einblenden \.plant-card,/.test(css), 'CSS: Einblenden haengt nicht an der Skript-Klasse');
  const js = fs.readFileSync(path.join(THEME, 'assets/plant-archive-reveal.js'), 'utf8');
  pruefe(/prefers-reduced-motion: reduce/.test(js) && /IntersectionObserver/.test(js), 'Skript: reduzierte Bewegung oder Rueckfall fehlt');

  console.log('\n' + (checks - fails) + '/' + checks + ' Pruefungen bestanden, ' + fails + ' Fehler.');
  process.exit(fails ? 1 : 0);
})();

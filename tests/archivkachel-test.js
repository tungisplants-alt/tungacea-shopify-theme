// Prueft das ausgelieferte snippets/plant-card.liquid gegen die echten
// Sprachdateien.
//
// Warum es diesen Lauf gibt: plant-card hatte keinen. Der Vorschau-Bauer
// rendert die Galerie und zaehlt Kacheln, aber keine Pruefung sah je in eine
// Kachel hinein. Als die Bildauswahl von "erstes Foto" auf "erstes Foto, das
// gezeigt werden darf" umgestellt wurde, haette das niemand gemessen.
//
// Die Kachel hat zwei Entscheidungen, die schiefgehen koennen:
// 1. Welches Bild wird genommen, wenn eines davon nicht gezeigt werden darf?
// 2. Gibt es eine eigene Seite, oder ist die Kachel reine Anzeige?
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

const engine = new Liquid({ root: path.join(THEME, 'snippets'), extname: '.liquid' });
engine.registerFilter('asset_url', v => '/assets/' + v);
engine.registerFilter('stylesheet_tag', v => '<link rel="stylesheet" href="' + v + '">');
engine.registerFilter('money', v => (Number(v) / 100).toFixed(2).replace('.', ',') + ' €');
engine.registerFilter('placeholder_svg_tag', (v, cls) => '<svg class="' + (cls || '') + '"></svg>');
engine.registerFilter('image_url', function (v, ...rest) {
  const w = (rest.find(r => Array.isArray(r) && r[0] === 'width') || [])[1] || 100;
  return String(v) + '?width=' + w;
});
engine.registerFilter('image_tag', function (src, ...rest) {
  const o = {};
  for (const r of rest) if (Array.isArray(r)) o[r[0]] = r[1];
  return '<img src="' + src + '" alt="' + String(o.alt || '') + '" class="' + (o.class || '') + '">';
});
engine.registerFilter('t', function (key, ...rest) {
  const opts = {};
  for (const r of rest) {
    if (Array.isArray(r) && typeof r[0] === 'string') opts[r[0]] = r[1];
    else if (r && typeof r === 'object') Object.assign(opts, r);
  }
  let hit = String(key).split('.').reduce((o, k) => (o == null ? undefined : o[k]), LOC[locale]);
  if (hit === undefined) throw new Error('FEHLENDER Schluessel [' + locale + ']: ' + key);
  if (hit && typeof hit === 'object') hit = Number(opts.count) === 1 ? hit.one : hit.other;
  for (const [k, v] of Object.entries(opts)) hit = hit.split('{{ ' + k + ' }}').join(String(v));
  if (/\{\{/.test(hit)) throw new Error('Platzhalter nicht ersetzt: ' + key);
  return hit;
});

const feld = v => ({ value: v === undefined ? null : v });
const person = (name, ig) => ({ name: { value: name }, instagram: { value: ig || null }, land: { value: null } });

const bild = (datei, fotograf, freigabe) => ({
  titel: feld(datei),
  bild: feld('cdn://' + datei),
  fotograf: feld(fotograf || null),
  bildfreigabe: feld(freigabe === undefined ? null : freigabe),
});

const pflanze = (handle, extra) => Object.assign({
  bezeichnung: feld('Anthurium Testpflanze'),
  kreuzung: feld(null), generation: feld(null), stadium: feld(null),
  merkmal: feld(null), notiz: feld(null), mutter_id: feld(null),
  reinheit: feld(null), linie: { value: [] }, merkmale: { value: [] },
  zuechter: feld(null), besitzer: feld(null),
  fotos: { value: [] }, fotograf: feld(null), bildfreigabe: feld(null),
  bilder: { value: [] },
  angebote: { value: [] },
  system: { handle: handle, url: '/pflanzen/' + handle },
}, extra || {});

const fremd = person('Yolanda Picklesauce', '@yolanda_picklesauce');

const faelle = [
  // --- Bildauswahl mit Bildnachweisen ---
  // Der eigentliche Grund fuer diesen Lauf. Steht ein fremdes Bild ohne
  // Freigabe an Position eins, darf es die Kachel nicht leeren: dahinter
  // stehen eigene Bilder, die gezeigt werden duerfen.
  {
    name: 'Fremdes Bild ohne Freigabe vorn — eigenes Bild dahinter wird genommen',
    eintrag: pflanze('k-eins', {
      bilder: { value: [bild('fremdes.jpg', fremd, false), bild('eigenes.jpg', null, null)] },
    }),
    erwartet: ['cdn://eigenes.jpg'],
    verboten: ['cdn://fremdes.jpg', 'plant-card__image--placeholder'],
  },
  {
    name: 'Fremdes Bild MIT Freigabe vorn wird genommen',
    eintrag: pflanze('k-zwei', {
      bilder: { value: [bild('fremdes.jpg', fremd, true), bild('eigenes.jpg', null, null)] },
    }),
    erwartet: ['cdn://fremdes.jpg'],
    verboten: ['cdn://eigenes.jpg', 'plant-card__image--placeholder'],
  },
  {
    name: 'Alle Bilder ungeklaert — Platzhalter statt Bild',
    eintrag: pflanze('k-drei', {
      bilder: { value: [bild('fremdes.jpg', fremd, false)] },
    }),
    erwartet: ['plant-card__image--placeholder'],
    verboten: ['cdn://fremdes.jpg'],
  },
  // Die Kachel ist zu klein fuer eine Nennung. Sie darf keine erfinden, und sie
  // darf auch keine weglassen, die hingehoert — deshalb steht sie auf der Seite
  // am Bild und hier gar nicht.
  {
    name: 'Die Kachel nennt keinen Fotografen',
    eintrag: pflanze('k-vier', {
      bilder: { value: [bild('fremdes.jpg', fremd, true)] },
    }),
    erwartet: ['cdn://fremdes.jpg'],
    verboten: ['Foto:', '@yolanda_picklesauce'],
  },

  // --- Der alte Weg bleibt unveraendert ---
  {
    name: 'Alter Weg: eigenes Foto wird gezeigt',
    eintrag: pflanze('k-fuenf', { fotos: { value: ['cdn://alt.jpg'] } }),
    erwartet: ['cdn://alt.jpg'],
    verboten: ['plant-card__image--placeholder'],
  },
  {
    name: 'Alter Weg: fremdes Foto ohne Freigabe bleibt gesperrt',
    eintrag: pflanze('k-sechs', {
      fotos: { value: ['cdn://alt.jpg'] },
      fotograf: feld(fremd),
      bildfreigabe: feld(false),
    }),
    erwartet: ['plant-card__image--placeholder'],
    verboten: ['cdn://alt.jpg'],
  },
  {
    name: 'Alter Weg: fremdes Foto mit Freigabe wird gezeigt',
    eintrag: pflanze('k-sieben', {
      fotos: { value: ['cdn://alt.jpg'] },
      fotograf: feld(fremd),
      bildfreigabe: feld(true),
    }),
    erwartet: ['cdn://alt.jpg'],
    verboten: ['plant-card__image--placeholder'],
  },
  {
    name: 'Ganz ohne Bilder — Platzhalter',
    eintrag: pflanze('k-acht'),
    erwartet: ['plant-card__image--placeholder'],
    verboten: ['<img'],
  },

  // --- Der Link, weil ein Link ins Leere schlimmer ist als keiner ---
  {
    name: 'Ohne eigene Seite keine Verlinkung',
    eintrag: pflanze('k-neun', { system: { handle: 'k-neun', url: null } }),
    erwartet: ['Anthurium Testpflanze'],
    verboten: ['plant-card-link', 'href=""'],
  },
  {
    name: 'Mit eigener Seite ist der Name der Link',
    eintrag: pflanze('k-zehn'),
    erwartet: ['plant-card-link', '/pflanzen/k-zehn'],
    verboten: ['href=""'],
  },
  // --- Merkmale an der Kachel, fuer Filter und Suche ---
  {
    name: 'Merkmale stehen getrennt in data-merkmale und im Suchtext, leere fallen heraus',
    eintrag: pflanze('k-elf', { merkmale: { value: [{ name: { value: 'Sehr dunkel' } }, { name: { value: '  ' } }, { name: { value: 'Samtig' } }] } }),
    erwartet: ['data-merkmale="Sehr dunkel|Samtig"', 'sehr dunkel samtig'],
    verboten: ['data-merkmale="Sehr dunkel|Samtig|"', '||'],
  },
  {
    name: 'Ohne Merkmale ist data-merkmale leer',
    eintrag: pflanze('k-zwoelf'),
    erwartet: ['data-merkmale=""'],
    verboten: [],
  },
  // --- Angebot: aus der von der Vorlage gebauten Liste ---
  {
    name: 'Pflanze in der Angebotsliste: Hinweis und data-angebot=ja',
    eintrag: pflanze('k-dreizehn'),
    angebote: '|k-dreizehn|k-andere|',
    erwartet: ['data-angebot="ja"', 'plant-card__offer'],
    verboten: ['data-angebot="nein"'],
  },
  {
    name: 'Pflanze nicht in der Liste: kein Hinweis',
    eintrag: pflanze('k-vierzehn'),
    angebote: '|k-dreizehn|k-andere|',
    erwartet: ['data-angebot="nein"'],
    verboten: ['plant-card__offer', 'data-angebot="ja"'],
  },
  {
    // Ein Handle, der nur Teil eines anderen ist, darf nicht treffen.
    name: 'Handle ist nur Teil eines anderen: kein Treffer',
    eintrag: pflanze('k-drei'),
    angebote: '|k-dreizehn|',
    erwartet: ['data-angebot="nein"'],
    verboten: ['data-angebot="ja"'],
  },
  {
    name: 'Ohne Liste kein Angebot, kein Fehler',
    eintrag: pflanze('k-fuenfzehn'),
    erwartet: ['data-angebot="nein"'],
    verboten: ['data-angebot="ja"'],
  },
];

(async () => {
  let fails = 0, checks = 0;
  for (const f of faelle) {
    for (const loc of ['de', 'en']) {
      locale = loc;
      let html;
      try {
        html = await engine.renderFile('plant-card', { eintrag: f.eintrag, angebote: f.angebote || '' });
      } catch (e) {
        fails++; checks++;
        console.log('FEHLER [' + loc + '] ' + f.name + ': ' + e.message);
        continue;
      }

      if (loc === 'de') {
        for (const e of f.erwartet) {
          checks++;
          if (!html.includes(e)) { fails++; console.log('FEHLER ' + f.name + ': fehlt "' + e + '"'); }
        }
        for (const v of f.verboten) {
          checks++;
          if (html.includes(v)) { fails++; console.log('FEHLER ' + f.name + ': enthaelt "' + v + '"'); }
        }
      } else {
        checks++;
        // Dieselbe Waechterliste wie in den anderen Laeufen: kein deutscher
        // Datenwert darf im englischen Lauf durchkommen.
        const deutsch = /Mutterpflanze|Jungpflanze|Etabliert|Sämling|Steckling|Komplexhybrid|Reine Art|Foto:|Verfügbar/;
        if (deutsch.test(html)) {
          fails++; console.log('FEHLER [en] ' + f.name + ': deutscher Text im englischen Lauf');
        }
      }
    }
  }
  console.log('\n' + (checks - fails) + '/' + checks + ' Pruefungen bestanden, ' + fails + ' Fehler.');
  process.exit(fails ? 1 : 0);
})();

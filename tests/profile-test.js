// Prüft das ausgelieferte snippets/plant-profile.liquid gegen die echten
// Sprachdateien — vor allem den Rückweg in den Laden.
//
// Der Rückweg hat zwei Quellen: von Hand gewählte Angebote und die selbst
// gefundenen Produkte, deren Feld `mutterpflanze` auf diesen Eintrag zeigt.
// Beide Wege müssen dieselbe Zeile erzeugen, und die selbst gefundene Menge
// darf nichts einsammeln, was woandershin gehört.
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
  return hit;
});

const feld = v => ({ value: v === undefined ? null : v });

// Ein Eintrag mit Adresse, damit die Handles vergleichbar sind.
const pflanze = (handle, extra) => Object.assign({
  bezeichnung: feld('Anthurium Testpflanze'),
  kreuzung: feld(null), generation: feld(null), stadium: feld(null),
  merkmal: feld(null), notiz: feld(null), mutter_id: feld(null),
  zuechter: feld(null), besitzer: feld(null),
  fotos: { value: [] }, fotograf: feld(null), bildfreigabe: feld(null),
  angebote: { value: [] },
  system: { handle: handle, url: '/pflanzen/' + handle },
}, extra || {});

// Ein Produkt, das auf einen Eintrag zeigt.
const produkt = (titel, handle, verfuegbar, preis) => ({
  title: titel,
  url: '/products/' + titel.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  available: verfuegbar,
  price: preis,
  metafields: { custom: { mutterpflanze: { value: handle ? { system: { handle: handle } } : null } } },
});

const LADEN = [
  produkt('Cutting A', 'mutter-eins', true, 29900),
  produkt('Cutting B', 'mutter-eins', false, 19900),
  produkt('Fremdes Cutting', 'mutter-zwei', true, 9900),
  produkt('Produkt ohne Mutter', null, true, 4900),
];

const faelle = [
  {
    name: 'Findet die eigenen Produkte selbst',
    eintrag: pflanze('mutter-eins'),
    erwartet: ['plant-profile-offers', 'Cutting A', '299,00 €', 'Cutting B', 'Verkauft'],
    verboten: ['Fremdes Cutting', 'Produkt ohne Mutter'],
  },
  {
    name: 'Eine Pflanze ohne Produkte zeigt keinen leeren Block',
    eintrag: pflanze('mutter-drei'),
    erwartet: [],
    verboten: ['plant-profile-offers', 'Angebote von dieser Pflanze'],
  },
  {
    name: 'Fremde Mutter sammelt nur ihre eigenen ein',
    eintrag: pflanze('mutter-zwei'),
    erwartet: ['Fremdes Cutting'],
    verboten: ['Cutting A', 'Cutting B'],
  },
  {
    name: 'Von Hand gewaehlte Angebote haben Vorrang',
    eintrag: pflanze('mutter-eins', {
      angebote: { value: [produkt('Handverlesen', 'mutter-neun', true, 5000)] },
    }),
    erwartet: ['Handverlesen', '50,00 €'],
    verboten: ['Cutting A', 'Cutting B'],
  },
  {
    name: 'Lightbox ist vollstaendig, nicht nur vorhanden',
    eintrag: pflanze('mutter-fuenf', {
      fotos: { value: ['cdn://a.jpg', 'cdn://b.jpg'] },
    }),
    erwartet: ['<specimen-lightbox', 'specimen-lightbox.js', '<dialog',
               'data-lightbox-image', 'data-lightbox-close', 'data-lightbox-full'],
    verboten: [],
  },
  {
    name: 'Besitzer gesetzt — Seite nennt ihn',
    eintrag: pflanze('mutter-vier', {
      besitzer: feld({ name: { value: 'Ree Gardens' }, instagram: { value: null } }),
    }),
    erwartet: ['plant-profile-owner', 'Ree Gardens'],
    verboten: [],
  },
  // Reinheit stand bis zum 3. Oktober als roher Datenwert in der Seite und
  // blieb damit auch im englischen Laden deutsch. Der Waechter unten kannte
  // die Woerter nicht, und keine Testpflanze trug ueberhaupt eine Reinheit —
  // deshalb war der Fehler fuer 322 gruene Pruefungen unsichtbar.
  {
    name: 'Reinheit Komplexhybrid erscheint',
    eintrag: pflanze('mutter-sechs', { reinheit: feld('Komplexhybrid') }),
    erwartet: ['Komplexhybrid'],
    verboten: [],
  },
  {
    name: 'Reinheit Reine Art erscheint',
    eintrag: pflanze('mutter-sieben', { reinheit: feld('Reine Art') }),
    erwartet: ['Reine Art'],
    verboten: [],
  },
  // Gegenprobe zum Rueckfall: ein Wert, den der case nicht kennt, muss
  // sichtbar bleiben. Verschwindet er, ist die Abbildung eine stille Falle.
  {
    name: 'Unbekannte Reinheit verschwindet nicht',
    eintrag: pflanze('mutter-acht', { reinheit: feld('Naturhybrid') }),
    erwartet: ['Naturhybrid'],
    verboten: [],
  },
  // Das Land des Zuechters steht als deutscher Freitext am Personen-Eintrag.
  // Ohne einen Fall, der ueberhaupt ein Land setzt, laeuft der Waechter unten
  // ins Leere — genau wie zuvor bei der Reinheit.
  {
    name: 'Land des Zuechters wird uebersetzt',
    eintrag: pflanze('mutter-neun', {
      zuechter: feld({ name: { value: 'secretfoliage' }, instagram: { value: null }, land: { value: 'Niederlande' } }),
    }),
    erwartet: ['secretfoliage', '(Niederlande)'],
    verboten: [],
  },
];

(async () => {
  let fails = 0, checks = 0;
  for (const f of faelle) {
    for (const loc of ['de', 'en']) {
      locale = loc;
      let html;
      try {
        html = await engine.renderFile('plant-profile', {
          eintrag: f.eintrag,
          produkte: LADEN,
        });
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
        if (process.env.ZEIGE) {
          console.log('\n--- ' + f.name + ' ---');
          console.log(html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300));
        }
      } else {
        checks++;
        // Diese Liste ist der eigentliche Waechter gegen deutschen Text auf der
        // englischen Seite. Sie kannte "Komplexhybrid" und "Reine Art" nicht,
        // und genau dort stand der Fehler. Wer hier ein Feld ergaenzt, dessen
        // Werte Tung auf Deutsch eintraegt, traegt das Wort hier mit ein.
        const deutsch = /Verkauft|Angebote von dieser Pflanze|Diese Pflanze steht bei|Komplexhybrid|Reine Art|\(Niederlande\)|\(Deutschland\)|\(Schweiz\)/;
        if (deutsch.test(html)) {
          fails++; console.log('FEHLER [en] ' + f.name + ': deutscher Text im englischen Lauf');
        }
      }
    }
  }
  console.log('\n' + (checks - fails) + '/' + checks + ' Pruefungen bestanden, ' + fails + ' Fehler.');
  process.exit(fails ? 1 : 0);
})();

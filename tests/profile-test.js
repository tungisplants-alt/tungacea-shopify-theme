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

const engine = new Liquid({ root: [path.join(THEME, 'snippets'), path.join(THEME, 'sections')], extname: '.liquid' });
require('./shopify-tags')(engine);
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
  merkmal: feld(null), merkmale: { value: [] }, notiz: feld(null), mutter_id: feld(null),
  zuechter: feld(null), besitzer: feld(null),
  fotos: { value: [] }, fotograf: feld(null), bildfreigabe: feld(null),
  bilder: { value: [] },
  angebote: { value: [] },
  system: { handle: handle, url: '/pflanzen/' + handle },
}, extra || {});

// Ein Bildnachweis: ein Foto mit eigenem Fotografen und eigener Freigabe.
// fotograf == null heisst "von Tung", wie im Theme.
const bild = (datei, fotograf, freigabe) => ({
  titel: feld(datei),
  bild: feld('cdn://' + datei),
  fotograf: feld(fotograf || null),
  bildfreigabe: feld(freigabe === undefined ? null : freigabe),
});

const fremdePerson = (name, ig) => ({ name: { value: name }, instagram: { value: ig || null } });

// Ein Produkt, das auf einen Eintrag zeigt.
// vater: der zweite Elternteil eines Saemlings. Eine Pflanze muss ihre
// Angebote auch dann finden, wenn sie dort nicht die Mutter ist.
const produkt = (titel, handle, verfuegbar, preis, vater) => ({
  title: titel,
  featured_image: 'cdn://' + titel.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.jpg',
  url: '/products/' + titel.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  available: verfuegbar,
  price: preis,
  metafields: { custom: {
    mutterpflanze: { value: handle ? { system: { handle: handle } } : null },
    vaterpflanze: { value: vater ? { system: { handle: vater } } : null },
  } },
});

const LADEN = [
  produkt('Cutting A', 'mutter-eins', true, 29900),
  produkt('Cutting B', 'mutter-eins', false, 19900),
  produkt('Fremdes Cutting', 'mutter-zwei', true, 9900),
  produkt('Produkt ohne Mutter', null, true, 4900),
  // Mutter ist mutter-zwei, Vater ist mutter-eins: beide muessen ihn finden.
  produkt('Saemling aus Kreuzung', 'mutter-zwei', true, 15900, 'mutter-eins'),
];

const faelle = [
  {
    name: 'Findet die eigenen Produkte selbst',
    eintrag: pflanze('mutter-eins'),
    erwartet: ['plant-profile-offers', 'Cutting A', '299,00 €', 'Cutting B', 'Verkauft'],
    verboten: ['Fremdes Cutting', 'Produkt ohne Mutter'],
    // 'Saemling aus Kreuzung' steht hier bewusst in keiner der beiden Listen —
    // der eigene Fall unten prueft ihn, und zwar auf Anwesenheit.
  },
  {
    name: 'Merkmale als Auswahlliste, leere Namen fallen heraus, kein Freitext daneben',
    eintrag: pflanze('mutter-tags', {
      merkmal: feld('Alter Freitext'),
      merkmale: { value: [
        { name: { value: 'Sehr dunkel' } }, { name: { value: 'Samtig' } },
        { name: { value: '  ' } }, { name: { value: 'Rote Aderung' } },
      ] },
    }),
    erwartet: ['plant-profile-tags', 'Sehr dunkel', 'Samtig', 'Rote Aderung'],
    verboten: ['Alter Freitext', 'plant-profile-trait'],
    genau: [['class="plant-profile__tag"', 3]],
  },
  {
    name: 'Ohne gewaehlte Merkmale gilt der alte Freitext weiter',
    eintrag: pflanze('mutter-alt', { merkmal: feld('Fast schwarze Blattflaeche') }),
    erwartet: ['plant-profile-trait', 'Fast schwarze Blattflaeche'],
    verboten: ['plant-profile-tags'],
  },
  {
    name: 'Ohne beides kein leerer Block',
    eintrag: pflanze('mutter-leer'),
    erwartet: [],
    verboten: ['plant-profile-tags', 'plant-profile-trait', 'plant-profile__tags'],
  },
  {
    name: 'Rueckweg ins Archiv steht oben',
    eintrag: pflanze('mutter-back'),
    erwartet: ['plant-profile-back', 'href="/pages/archive"'],
    verboten: [],
  },
  {
    name: 'Angebot mit Foto und Stand',
    eintrag: pflanze('mutter-eins'),
    erwartet: ['plant-profile__offer-thumb', 'cdn://cutting-a.jpg', 'Verfügbar'],
    verboten: [],
  },
  {
    // Blaettern nach Exemplar-ID, nur unter eigenen Pflanzen. TA-1002 hat einen
    // Besitzer und steht nicht in der Galerie, TA-1004 ohne ID gar nicht.
    name: 'Vorherige und Naechste: ueberspringt fremde, sortiert nach ID',
    eintrag: pflanze('ta-1003', { mutter_id: feld('TA-1003') }),
    alle: [
      pflanze('ta-1004', { mutter_id: feld('TA-1004') }),
      pflanze('ta-1002', { mutter_id: feld('TA-1002'), besitzer: feld(fremdePerson('Jemand')) }),
      pflanze('ta-1001', { mutter_id: feld('TA-1001') }),
      pflanze('ta-1003', { mutter_id: feld('TA-1003') }),
      pflanze('ohne-id'),
    ],
    erwartet: ['plant-profile-nav', 'href="/pflanzen/ta-1001"', 'href="/pflanzen/ta-1004"', 'rel="prev"', 'rel="next"'],
    verboten: ['/pflanzen/ta-1002', '/pflanzen/ohne-id'],
  },
  {
    name: 'Erste Pflanze: nur Naechste, keine Vorherige',
    eintrag: pflanze('ta-1001', { mutter_id: feld('TA-1001') }),
    alle: [pflanze('ta-1001', { mutter_id: feld('TA-1001') }), pflanze('ta-1003', { mutter_id: feld('TA-1003') })],
    erwartet: ['rel="next"', 'href="/pflanzen/ta-1003"'],
    verboten: ['rel="prev"'],
  },
  {
    name: 'Einzige Pflanze: kein Blaettern',
    eintrag: pflanze('ta-1001', { mutter_id: feld('TA-1001') }),
    alle: [pflanze('ta-1001', { mutter_id: feld('TA-1001') })],
    erwartet: [],
    verboten: ['plant-profile-nav'],
  },
  {
    name: 'Fremde Pflanze blaettert nicht',
    eintrag: pflanze('ta-1002', { mutter_id: feld('TA-1002'), besitzer: feld(fremdePerson('Jemand')) }),
    alle: [pflanze('ta-1001', { mutter_id: feld('TA-1001') }), pflanze('ta-1003', { mutter_id: feld('TA-1003') })],
    erwartet: [],
    verboten: ['plant-profile-nav'],
  },
  {
    name: 'Ohne uebergebene Liste kein Blaettern, kein Fehler',
    eintrag: pflanze('ta-1001', { mutter_id: feld('TA-1001') }),
    erwartet: [],
    verboten: ['plant-profile-nav'],
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
    erwartet: ['Fremdes Cutting', 'Saemling aus Kreuzung'],
    verboten: ['Cutting A', 'Cutting B'],
  },
  {
    // Punkt 3 des Auftrags: der Rueckweg muss beide Rollen finden. Sonst zeigt
    // eine Pflanze ihre Cuttings und ihre Saemlinge an zwei Stellen.
    name: 'Findet auch den Saemling, an dem sie Vater ist',
    eintrag: pflanze('mutter-eins'),
    erwartet: ['Saemling aus Kreuzung', '159,00 €', 'Cutting A'],
    verboten: ['Fremdes Cutting'],
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
  // Bildnachweis pro Foto. Das Feld fotograf galt fuer den ganzen Eintrag, und
  // bei TA-1005 standen ein eigenes und ein fremdes Bild zusammen: die eine
  // Sammelzeile schrieb beide Bilder Yolanda zu. Nur eine Zaehlung faellt hier
  // auf — eine Suche nach "ist der Nachweis da" war in beiden Faellen gruen.
  {
    name: 'Eigenes und fremdes Bild: nur das fremde wird genannt',
    eintrag: pflanze('mutter-zehn', {
      bilder: { value: [
        bild('eigenes.jpg', null, null),
        bild('fremdes.jpg', fremdePerson('Yolanda Picklesauce', '@yolanda_picklesauce'), true),
      ] },
    }),
    erwartet: ['plant-profile-photo-credit', '@yolanda_picklesauce'],
    verboten: ['class="plant-profile__credit"'],
    // Die Bahn umschliesst die Bilder. Dass der Dialog der Lightbox NICHT
    // darin liegt, prueft die Reihenfolge-Pruefung unten am Ende der Datei.
    genau: [['plant-profile__figure"', 2], ['plant-profile-photo-credit', 1],
             ['plant-profile__track', 1]],
  },
  // Gegenprobe: dasselbe ohne Freigabe. Das fremde Bild faellt heraus, das
  // eigene bleibt. Vorher nahm ein ungeklaertes Bild die ganze Galerie mit.
  {
    name: 'Fremdes Bild ohne Freigabe faellt heraus, eigenes bleibt',
    eintrag: pflanze('mutter-elf', {
      bilder: { value: [
        bild('eigenes.jpg', null, null),
        bild('fremdes.jpg', fremdePerson('Yolanda Picklesauce', '@yolanda_picklesauce'), false),
      ] },
    }),
    erwartet: ['<specimen-lightbox', 'cdn://eigenes.jpg'],
    verboten: ['cdn://fremdes.jpg', '@yolanda_picklesauce'],
    genau: [['plant-profile__figure"', 1], ['plant-profile-photo-credit', 0]],
  },
  // Und die Sperre bleibt vollstaendig: sind ALLE Bilder ungeklaert, erscheint
  // keine Galerie. Sonst stuende ein leeres Lightbox-Geruest auf der Seite.
  {
    name: 'Alle Bilder ungeklaert — keine Galerie',
    eintrag: pflanze('mutter-zwoelf', {
      bilder: { value: [
        bild('fremdes.jpg', fremdePerson('Yolanda Picklesauce', '@yolanda_picklesauce'), false),
      ] },
    }),
    erwartet: [],
    verboten: ['<specimen-lightbox', 'cdn://fremdes.jpg'],
  },
  // Der alte Weg muss unveraendert bleiben, solange kein Eintrag umgehaengt ist.
  // Neun der zehn Archiveintraege stehen noch darauf.
  {
    name: 'Alter Weg ohne bilder: Sammelzeile wie zuvor',
    eintrag: pflanze('mutter-dreizehn', {
      fotos: { value: ['cdn://alt.jpg'] },
      fotograf: feld(fremdePerson('Yolanda Picklesauce', '@yolanda_picklesauce')),
      bildfreigabe: feld(true),
    }),
    erwartet: ['class="plant-profile__credit"', '@yolanda_picklesauce'],
    verboten: ['plant-profile__figure"', 'plant-profile-photo-credit'],
  },
];

(async () => {
  let fails = 0, checks = 0;
  for (const f of faelle) {
    for (const loc of ['de', 'en']) {
      locale = loc;
      let html;
      try {
        // Wie im Shop: die Vorlage durchlaeuft Produkte und Pflanzen und
        // reicht dem Snippet fertige Texte. Darum wird die Vorlage gerendert.
        html = await engine.renderFile('main-plant-profile', {
          metaobject: f.eintrag,
          collections: { all: { products: LADEN } },
          shop: { metaobjects: { mutterpflanze: { values: f.alle || [] } } },
          section: { id: 's1', settings: { color_scheme: 'scheme-1', padding_top: 0, padding_bottom: 0 } },
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
        // Zaehlende Pruefung. "Ist der Nachweis da" war bei einem und bei zwei
        // Nachweisen gleich gruen; der Fehler lag in der Anzahl.
        for (const [muster, soll] of f.genau || []) {
          checks++;
          const ist = html.split(muster).length - 1;
          if (ist !== soll) {
            fails++;
            console.log('FEHLER ' + f.name + ': "' + muster + '" ' + ist + 'x statt ' + soll + 'x');
          }
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

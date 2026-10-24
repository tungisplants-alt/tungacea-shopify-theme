// Prueft das ausgelieferte Snippet im Theme gegen die echten Sprachdateien.
// Keine eigene Kopie, keine eigene Stringtabelle — ein falscher Schluessel
// faellt hier auf und nicht erst im Laden.
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
engine.registerFilter('image_url', function (v, ...rest) {
  const w = (rest.find(r => Array.isArray(r) && r[0] === 'width') || [])[1] || 100;
  return String(v) + '?width=' + w;
});
engine.registerFilter('t', function (key, ...rest) {
  const opts = {};
  for (const r of rest) {
    if (Array.isArray(r) && typeof r[0] === 'string') opts[r[0]] = r[1];
    else if (r && typeof r === 'object') Object.assign(opts, r);
  }
  let hit = String(key).split('.').reduce((o, k) => (o == null ? undefined : o[k]), LOC[locale]);
  if (hit === undefined) throw new Error('FEHLENDER Schluessel [' + locale + ']: ' + key);
  if (hit && typeof hit === 'object') {
    if (!('count' in opts)) throw new Error('Pluralschluessel ohne count: ' + key);
    hit = Number(opts.count) === 1 ? hit.one : hit.other;
  }
  for (const [k, v] of Object.entries(opts)) hit = hit.split('{{ ' + k + ' }}').join(String(v));
  if (/\{\{/.test(hit)) throw new Error('Platzhalter nicht ersetzt in ' + key + ': ' + hit);
  return hit;
});

const person = (name, ig, land) => ({ name: { value: name }, instagram: { value: ig || null }, land: { value: land || null } });
const FOTOS = ['cdn://a.jpg', 'cdn://b.jpg', 'cdn://c.jpg'];
const mutter = (bez, besitzer, fotograf, fotos, freigabe, url, extra) => ({
  bezeichnung: { value: bez }, besitzer: { value: besitzer || null }, fotograf: { value: fotograf || null },
  fotos: { value: fotos || [] }, bildfreigabe: { value: freigabe === undefined ? null : freigabe },
  system: { url: url || null },
  generation: { value: (extra && extra.generation) || null },
  mutter_id: { value: (extra && extra.mutter_id) || null },
  zuechter: { value: (extra && extra.zuechter) || null },
  bilder: { value: (extra && extra.bilder) || [] },
});

// Ein Bildnachweis: ein Foto mit eigenem Fotografen und eigener Freigabe.
// fotograf == null heisst "von Tung", wie im Theme.
const bild = (datei, fotograf, freigabe) => ({
  titel: { value: datei },
  bild: { value: 'cdn://' + datei },
  fotograf: { value: fotograf || null },
  bildfreigabe: { value: freigabe === undefined ? null : freigabe },
});
const mf = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { value: v }]));

const grower = person('Tropical Grower', '@tropicalgrower');
const ree = person('Ree Gardens', null);

const faelle = [
  // --- Saemlinge haben zwei Eltern -------------------------------------
  // Beide Eltern tragen Generation und Zuechter, das Produkt selbst nicht.
  // Nichts davon darf erscheinen: aus F2 x F1 folgt keine Generation, und
  // zwei Zuechter lassen sich nicht zu einem verrechnen.
  { name: 'Saemling mit zwei Eltern — Ableitung muss schweigen',
    mf: mf({ lieferumfang: 'Sämling aus dieser Kreuzung', stadium: 'Sämling',
             bewurzelung: 'Frisch bewurzelt', specimen_id: 'TA-1011',
             mutterpflanze: mutter('Anthurium papillilaminum', grower, null, FOTOS, undefined, null,
                                   { generation: 'F2', zuechter: ree }),
             vaterpflanze: mutter('Anthurium dressleri', null, null, FOTOS, undefined, null,
                                  { generation: 'F1', zuechter: grower }) }),
    erwartet: ['Mutterpflanze', 'Vaterpflanze', 'Anthurium papillilaminum', 'Anthurium dressleri',
               'Sämling aus der unten gezeigten Kreuzung'],
    verboten: ['Generation F2', 'Generation F1', 'Ree Gardens', 'Tropical Grower'] },

  // Gegenstueck: ein Elternteil, der bisherige Weg. Hier MUSS geerbt werden.
  { name: 'Saemling mit einem Elternteil — Ableitung greift weiter',
    mf: mf({ lieferumfang: 'Sämling aus dieser Kreuzung', stadium: 'Sämling',
             bewurzelung: 'Frisch bewurzelt', specimen_id: 'TA-1012',
             mutterpflanze: mutter('Anthurium luxurians × dressleri', null, null, FOTOS, undefined, null,
                                   { generation: 'F2', zuechter: ree }) }),
    erwartet: ['Mutterpflanze', 'Generation F2', 'Ree Gardens', 'TA-1012'],
    verboten: ['Vaterpflanze'] },

  // Randfall: nur der Vater ist bekannt. Er traegt dann sein eigenes Etikett,
  // und abgeleitet wird trotzdem nichts — die Ableitung haengt an der Mutter.
  { name: 'Nur Vaterpflanze eingetragen',
    mf: mf({ lieferumfang: 'Sämling aus dieser Kreuzung', stadium: 'Sämling',
             specimen_id: 'TA-1013',
             vaterpflanze: mutter('Anthurium dressleri', null, null, FOTOS, undefined, null,
                                  { generation: 'F1', zuechter: grower }) }),
    erwartet: ['Vaterpflanze', 'Anthurium dressleri'],
    verboten: ['Mutterpflanze', 'Generation F1', 'Tropical Grower'] },

  { name: 'Cutting, fremde Mutter, fremdes Foto',
    mf: mf({ lieferumfang: 'Cutting der Mutterpflanze', bewurzelung: 'Frisch bewurzelt',
             generation: 'F2', blattlaenge_cm: 12, specimen_id: 'TNG-0147',
             mutterpflanze: mutter('Anthurium papillilaminum × forgetii', grower, grower),
             zuechter: ree, bezogen_von: grower }),
    erwartet: ['Cutting der unten gezeigten Mutterpflanze', 'Frisch bewurzelt', 'Generation F2', '12 cm',
               'Braucht noch Aufmerksamkeit', 'stammt von dieser Pflanze bei @tropicalgrower', 'Foto: @tropicalgrower',
               'Ree Gardens', 'TNG-0147'],
    verboten: ['Für erfahrene Hände', 'aus meiner Sammlung'] },

  { name: 'Eigenes Exemplar, eigene Mutter, mit Datum',
    mf: mf({ lieferumfang: 'Dieses Exemplar', bewurzelung: 'Gut bewurzelt',
             generation: 'F1', blattlaenge_cm: 28, specimen_id: 'TNG-0151',
             aufnahmedatum: new Date('2026-09-26T00:00:00Z'),
             mutterpflanze: mutter('Anthurium luxurians × dressleri', null, null) }),
    erwartet: ['genau dieses Exemplar', 'Fotografiert am 26.9.2026', 'Gut bewurzelt',
               'Generation F1', '28 cm', 'aus meiner Sammlung'],
    verboten: ['Aufmerksamkeit', 'erfahrene Hände', 'Foto:'] },

  { name: 'Cutting OHNE Mutterpflanze — darf nicht nach unten zeigen',
    mf: mf({ lieferumfang: 'Cutting der Mutterpflanze', bewurzelung: 'Unbewurzelt', blaetter: 1 }),
    erwartet: ['Du erhältst ein Cutting.', 'Für erfahrene Hände', 'Dieses Exemplar ist noch nicht bewurzelt'],
    verboten: ['unten gezeigten', 'Braucht noch Aufmerksamkeit', 'Dieses Cutting ist noch nicht'] },

  { name: 'Cutting MIT Mutterpflanze — zeigt nach unten und nennt die Beziehung',
    mf: mf({ lieferumfang: 'Cutting der Mutterpflanze', bewurzelung: 'Frisch bewurzelt', 
             mutterpflanze: mutter('Anthurium regale', grower, null, FOTOS) }),
    erwartet: ['Du erhältst ein Cutting der unten gezeigten Mutterpflanze.',
               'Dein Cutting stammt von dieser Pflanze bei @tropicalgrower. Sie selbst ist nicht im Angebot.'],
    verboten: ['Du erhältst ein Cutting.'] },

  { name: 'Sämling MIT Mutterpflanze, eigene Sammlung',
    mf: mf({ lieferumfang: 'Sämling aus dieser Kreuzung', 
             mutterpflanze: mutter('Anthurium regale', null, null, FOTOS) }),
    erwartet: ['Sämling aus der unten gezeigten Kreuzung.',
               'Dein Sämling stammt von dieser Pflanze aus meiner Sammlung.'],
    verboten: ['bei @'] },

  { name: 'Nur Stadium, keine Bewurzelung',
    mf: mf({ lieferumfang: 'Sämling aus dieser Kreuzung', stadium: 'Sämling', blaetter: 2 }),
    erwartet: ['Sämling aus dieser Kreuzung', 'Sämling', 'Sämling'],
    verboten: ['Aufmerksamkeit', 'erfahrene Hände'] },

  { name: 'Null Blätter darf nicht wegfallen',
    mf: mf({ lieferumfang: 'Dieses Exemplar', blattlaenge_cm: 0 }),
    erwartet: ['0 cm'], verboten: [] },

  { name: 'Nur Züchter gesetzt',
    mf: mf({ zuechter: ree }),
    erwartet: ['Züchter', 'Ree Gardens'], verboten: ['Du erhältst', 'Mutterpflanze'] },

  { name: 'Alles leer — keine Ausgabe', mf: mf({}), erwartet: [], verboten: [], leer: true },

  { name: 'Spanne statt einer Zahl bei mehreren Exemplaren',
    mf: mf({ lieferumfang: 'Dieses Exemplar', blattlaenge_cm: 10, blattlaenge_bis_cm: 14 }),
    erwartet: ['Blattlänge ca. 10–14 cm'],
    verboten: ['ca. 10 cm'] },

  { name: 'Oberer Wert gleich dem unteren — keine Scheinspanne',
    mf: mf({ lieferumfang: 'Dieses Exemplar', blattlaenge_cm: 12, blattlaenge_bis_cm: 12 }),
    erwartet: ['Blattlänge ca. 12 cm'],
    verboten: ['12–12'] },

  { name: 'Oberer Wert kleiner — wird nicht geglaubt',
    mf: mf({ lieferumfang: 'Dieses Exemplar', blattlaenge_cm: 20, blattlaenge_bis_cm: 8 }),
    erwartet: ['Blattlänge ca. 20 cm'],
    verboten: ['20–8', '8–20'] },

  { name: 'Nur oberer Wert, unterer fehlt — gar keine Angabe',
    mf: mf({ lieferumfang: 'Dieses Exemplar', blattlaenge_bis_cm: 14 }),
    erwartet: ['genau dieses Exemplar'],
    verboten: ['Blattlänge'] },

  { name: 'Nummer der Mutterpflanze steht neben ihrem Namen',
    mf: mf({ lieferumfang: 'Cutting der Mutterpflanze',
             mutterpflanze: mutter('Anthurium regale #4', null, null, [], null, null,
                                   { mutter_id: 'TA-1042' }) }),
    erwartet: ['Anthurium regale #4', 'specimen-passport__mother-id', 'TA-1042'],
    verboten: [] },

  { name: 'Mutterpflanze ohne Nummer — keine leere Marke',
    mf: mf({ lieferumfang: 'Cutting der Mutterpflanze',
             mutterpflanze: mutter('Anthurium regale #4', null, null, [], null, null, {}) }),
    erwartet: ['Anthurium regale #4'],
    verboten: ['specimen-passport__mother-id'] },

  { name: 'Herkunft des Zuechters steht neben dem Namen',
    mf: mf({ zuechter: person('Tofusprinkles', null, 'USA'),
             bezogen_von: person('Ree Gardens', '@ree', 'Niederlande') }),
    erwartet: ['Tofusprinkles', '(USA)', '@ree', '(Niederlande)'],
    verboten: [] },

  { name: 'Zuechter ohne Land — keine leere Klammer',
    mf: mf({ zuechter: person('Hoyahole', null, null) }),
    erwartet: ['Hoyahole'],
    verboten: ['()', 'specimen-passport__country'] },

  { name: 'Geerbter Zuechter bringt sein Land mit',
    mf: mf({ lieferumfang: 'Cutting der Mutterpflanze',
             mutterpflanze: mutter('Anthurium regale #4', null, null, [], null, null,
                                   { zuechter: person('Tofusprinkles', null, 'USA') }) }),
    erwartet: ['Tofusprinkles', '(USA)'],
    verboten: [] },

  { name: 'Cutting erbt Generation und Zuechter von der Mutter',
    mf: mf({ lieferumfang: 'Cutting der Mutterpflanze', bewurzelung: 'Gut bewurzelt',
             mutterpflanze: mutter('Anthurium regale #4', null, null, [], null, null,
                                   { generation: 'F2', zuechter: ree }) }),
    erwartet: ['Generation F2', 'Ree Gardens'],
    verboten: [] },

  { name: 'Eigener Wert am Produkt schlaegt den geerbten',
    mf: mf({ lieferumfang: 'Cutting der Mutterpflanze', generation: 'S1', zuechter: grower,
             mutterpflanze: mutter('Anthurium regale #4', null, null, [], null, null,
                                   { generation: 'F2', zuechter: ree }) }),
    erwartet: ['Generation S1', 'Tropical Grower'],
    verboten: ['Generation F2', 'Ree Gardens'] },

  { name: 'Mutter ohne Generation — nichts wird erfunden',
    mf: mf({ lieferumfang: 'Cutting der Mutterpflanze',
             mutterpflanze: mutter('Anthurium regale #4', null, null, [], null, null, {}) }),
    erwartet: ['Anthurium regale #4'],
    verboten: ['Generation', 'Züchter'] },

  { name: 'Mutterpflanze MIT eigener Seite — Knopf erscheint',
    mf: mf({ lieferumfang: 'Dieses Exemplar',
             mutterpflanze: mutter('Anthurium regale', null, null, FOTOS, null, '/pflanzen/anthurium-regale') }),
    erwartet: ['specimen-mother-link', '/pflanzen/anthurium-regale', 'Mehr über die Mutterpflanze'],
    verboten: [] },

  { name: 'Mutterpflanze OHNE eigene Seite — kein Knopf ins Leere',
    mf: mf({ lieferumfang: 'Dieses Exemplar',
             mutterpflanze: mutter('Anthurium regale', null, null, FOTOS) }),
    erwartet: ['Anthurium regale'],
    verboten: ['specimen-mother-link', 'Mehr über die Mutterpflanze', 'href=""'] },

  // --- Bildfreigabe: die Sperre muss in beide Richtungen greifen ---
  { name: 'Eigenes Foto — wird gezeigt, ohne Freigabe zu brauchen',
    mf: mf({ lieferumfang: 'Dieses Exemplar',
             mutterpflanze: mutter('Anthurium regale', null, null, FOTOS) }),
    erwartet: ['specimen-mother-photos', 'cdn://a.jpg', 'cdn://c.jpg', 'specimen-lightbox', 'data-lightbox-full', 'dialog'], verboten: ['Foto:'] },

  { name: 'Fremdes Foto MIT Freigabe — wird gezeigt',
    mf: mf({ lieferumfang: 'Dieses Exemplar',
             mutterpflanze: mutter('Anthurium regale', grower, grower, FOTOS, true) }),
    erwartet: ['specimen-mother-photos', 'cdn://a.jpg', 'Foto: @tropicalgrower'],
    verboten: ['freundlicher Genehmigung', 'kind permission'] },

  { name: 'Fremdes Foto OHNE Freigabe — darf NICHT erscheinen',
    mf: mf({ lieferumfang: 'Dieses Exemplar',
             mutterpflanze: mutter('Anthurium regale', grower, grower, FOTOS) }),
    erwartet: ['Anthurium regale', 'stammt von dieser Pflanze bei @tropicalgrower'],
    verboten: ['specimen-mother-photos', 'cdn://a.jpg', 'cdn://b.jpg', 'cdn://c.jpg', 'specimen-lightbox', '<dialog'] },

  { name: 'Fremdes Foto, Freigabe ausdruecklich false — darf NICHT erscheinen',
    mf: mf({ lieferumfang: 'Dieses Exemplar',
             mutterpflanze: mutter('Anthurium regale', grower, grower, FOTOS, false) }),
    erwartet: ['Anthurium regale'], verboten: ['specimen-mother-photos', 'cdn://a.jpg'] },

  { name: 'Mutterpflanze ohne Fotos — kein leerer Streifen',
    mf: mf({ lieferumfang: 'Dieses Exemplar',
             mutterpflanze: mutter('Anthurium regale', null, null, []) }),
    erwartet: ['Anthurium regale'], verboten: ['specimen-mother-photos'] },

  // --- Bildnachweis pro Foto ---
  // Das Feld fotograf galt fuer die ganze Mutterpflanze. Bei TA-1005 standen ein
  // eigenes und ein fremdes Bild zusammen, und die eine Sammelzeile schrieb
  // beide Bilder derselben Person zu. Gezaehlt wird, nicht nur gesucht: "ist
  // der Nachweis da" war bei einem und bei zwei Nachweisen gleich gruen.
  { name: 'Zwei Quellen — nur das fremde Bild wird genannt',
    mf: mf({ lieferumfang: 'Dieses Exemplar',
             mutterpflanze: mutter('Anthurium regale', null, null, [], null, null,
                                   { bilder: [bild('eigenes.jpg', null, null),
                                              bild('fremdes.jpg', grower, true)] }) }),
    erwartet: ['specimen-mother-photos', 'cdn://eigenes.jpg', 'cdn://fremdes.jpg', 'Foto: @tropicalgrower'],
    verboten: ['specimen-passport__credit'],
    genau: [['specimen-passport__mother-figure', 2], ['specimen-mother-photo-credit', 1]] },

  { name: 'Zwei Quellen, fremdes Bild ohne Freigabe — eigenes bleibt',
    mf: mf({ lieferumfang: 'Dieses Exemplar',
             mutterpflanze: mutter('Anthurium regale', null, null, [], null, null,
                                   { bilder: [bild('eigenes.jpg', null, null),
                                              bild('fremdes.jpg', grower, false)] }) }),
    erwartet: ['cdn://eigenes.jpg'],
    verboten: ['cdn://fremdes.jpg', '@tropicalgrower'],
    genau: [['specimen-passport__mother-figure', 1], ['specimen-mother-photo-credit', 0]] },

  { name: 'Alle Bilder ungeklaert — kein Streifen, kein leeres Geruest',
    mf: mf({ lieferumfang: 'Dieses Exemplar',
             mutterpflanze: mutter('Anthurium regale', null, null, [], null, null,
                                   { bilder: [bild('fremdes.jpg', grower, false)] }) }),
    erwartet: ['Anthurium regale'],
    verboten: ['specimen-mother-photos', 'cdn://fremdes.jpg', '<dialog'] },

  // Der alte Weg bleibt unveraendert, solange keine Mutter umgehaengt ist.
  { name: 'Alter Weg ohne bilder: Sammelzeile wie zuvor',
    mf: mf({ lieferumfang: 'Dieses Exemplar',
             mutterpflanze: mutter('Anthurium regale', grower, grower, FOTOS, true) }),
    erwartet: ['specimen-passport__credit', 'Foto: @tropicalgrower'],
    verboten: ['specimen-passport__mother-figure', 'specimen-mother-photo-credit'] },
];

(async () => {
  let fails = 0, checks = 0;
  for (const f of faelle) {
    for (const loc of ['de', 'en']) {
      locale = loc;
      let html;
      try {
        html = (await engine.renderFile('specimen-passport', {
          product: { metafields: { custom: f.mf } },
          block: { id: 'b1', shopify_attributes: '' },
        })).trim();
      } catch (e) { fails++; checks++; console.log('FEHLER [' + loc + '] ' + f.name + ': ' + e.message); continue; }

      if (f.leer) {
        checks++;
        if (html !== '') { fails++; console.log('FEHLER [' + loc + '] ' + f.name + ': nicht leer'); }
        continue;
      }
      if (loc === 'de') {
        // Reihenfolge: Einstiegssatz, Mutterpflanze, Herkunft, Hinweis zuletzt.
        const pos = s => html.indexOf(s);
        const pLead = pos('specimen-lead'), pMutter = pos('specimen-mother"'), pHint = pos('specimen-hint'), pGrid = pos('specimen-passport__grid');
        if (pMutter !== -1 && pHint !== -1) {
          checks++;
          if (pMutter > pHint) { fails++; console.log('FEHLER ' + f.name + ': Hinweis steht vor der Mutterpflanze'); }
        }
        if (pGrid !== -1 && pHint !== -1) {
          checks++;
          if (pGrid > pHint) { fails++; console.log('FEHLER ' + f.name + ': Hinweis steht vor Zuechter/Bezogen von'); }
        }
        if (pLead !== -1 && pMutter !== -1) {
          checks++;
          if (pLead > pMutter) { fails++; console.log('FEHLER ' + f.name + ': Mutterpflanze steht vor dem Einstiegssatz'); }
        }
        for (const e of f.erwartet) { checks++; if (!html.includes(e)) { fails++; console.log('FEHLER ' + f.name + ': fehlt "' + e + '"'); } }
        for (const v of f.verboten) { checks++; if (html.includes(v)) { fails++; console.log('FEHLER ' + f.name + ': enthaelt "' + v + '"'); } }
        // Zaehlende Pruefung. Bei zwei Bildern aus zwei Quellen liegt der Fehler
        // in der Anzahl der Nennungen, nicht in ihrem Vorhandensein.
        for (const [muster, soll] of f.genau || []) {
          checks++;
          const ist = html.split(muster).length - 1;
          if (ist !== soll) { fails++; console.log('FEHLER ' + f.name + ': "' + muster + '" ' + ist + 'x statt ' + soll + 'x'); }
        }
      } else {
        checks++;
        // Die Laendernamen stehen hier, weil der Pass sie zweimal zeigt — beim
        // Zuechter und bei der Bezugsquelle — und sie als deutscher Freitext am
        // Personen-Eintrag liegen. Die erwartet-Listen oben laufen nur im
        // deutschen Durchgang, also war diese Stelle vorher unbewacht.
        const deutsch = /Du erhältst|Blätter|Bei @|Aus meiner Sammlung|\(Niederlande\)|\(Deutschland\)|\(Schweiz\)/;
        if (deutsch.test(html)) {
          fails++; console.log('FEHLER [en] ' + f.name + ': deutscher Text im englischen Lauf');
        }
      }
      if (loc === 'de' && process.env.ZEIGE) {
        console.log('\n--- ' + f.name + ' ---');
        console.log(html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
      }
    }
  }
  console.log('\n' + (checks - fails) + '/' + checks + ' Pruefungen bestanden, ' + fails + ' Fehler.');
  process.exit(fails ? 1 : 0);
})();

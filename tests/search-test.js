// Prüft das ausgelieferte snippets/plant-archive-search.liquid gegen die
// echten Sprachdateien.
//
// Warum es diese Datei gibt: Die Filterleiste wurde von keinem Test gerendert.
// Nur der Vorschau-Bauer build-archive.js fasste sie an, und der ist kein Test —
// er meldet nichts, er zeigt nur. Genau dort stand ein Fehler: die Aufschrift
// der Reinheit-Schalter war der rohe deutsche Datenwert und blieb damit auch
// im englischen Laden deutsch, während die Stadium-Schalter übersetzt wurden.
//
// Die wichtigste Prüfung hier ist nicht die Übersetzung, sondern das Gegenteil:
// `data-wert` MUSS in beiden Sprachen der deutsche Rohwert bleiben. Das Skript
// vergleicht ihn gegen `data-reinheit` an der Kachel. Wer ihn mitübersetzt,
// bekommt eine Leiste, die auf Englisch nichts mehr findet — und zwar
// lautlos, weil ein Filter ohne Treffer wie ein leeres Ergebnis aussieht.
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

const pflanze = extra => Object.assign({
  bezeichnung: feld('Anthurium Testpflanze'),
  stadium: feld(null), generation: feld(null), reinheit: feld(null),
  linie: { value: [] }, merkmale: { value: [] }, zuechter: feld(null), besitzer: feld(null),
  angebote: { value: [] },
}, extra || {});

const zuechter = (name, land) => feld({
  name: { value: name }, instagram: { value: null }, land: { value: land },
});

// Eine Gruppe erscheint erst ab zwei verschiedenen Werten — ein Filter mit
// einem Wert trennt nichts. Deshalb braucht jede geprüfte Gruppe hier
// mindestens zwei Einträge mit verschiedenen Werten.
const EINTRAEGE = [
  // line_other-Fall: "Sonstige" ist der einzige deutsche Wert in einer Liste
  // aus botanischen Eigennamen. Ohne diesen Fall laeuft der Waechter ins Leere.
  pflanze({ reinheit: feld('Komplexhybrid'), stadium: feld('Mutterpflanze'),
            linie: { value: ['Sonstige'] },
            merkmale: { value: [{ name: { value: 'Samtig' } }, { name: { value: 'Sehr dunkel' } }] },
            zuechter: zuechter('Tungacea', 'Deutschland') }),
  pflanze({ reinheit: feld('Reine Art'), stadium: feld('Jungpflanze'),
            linie: { value: ['Papillilaminum'] },
            merkmale: { value: [{ name: { value: 'Samtig' } }, { name: { value: '  ' } }] },
            zuechter: zuechter('secretfoliage', 'Niederlande') }),
  pflanze({ reinheit: feld('Hybrid'), stadium: feld('Steckling'),
            zuechter: zuechter('Variegated_Stingray', 'Schweiz') }),
  // Ein Land, das die Zuordnung nicht kennt: es muss sichtbar bleiben.
  pflanze({ zuechter: zuechter('Jemand', 'Belgien') }),
  // Eine fremde Pflanze: sie darf keine Werte in die Leiste einspeisen.
  pflanze({ reinheit: feld('Naturhybrid'), besitzer: feld({ name: { value: 'Ree Gardens' } }) }),
];

const faelle = [
  {
    name: 'Reinheit-Schalter tragen die uebersetzte Aufschrift',
    de: ['>Komplexhybrid<', '>Reine Art<'],
    en: ['>Complex hybrid<', '>Pure species<'],
  },
  {
    name: 'Stadium-Schalter tragen die uebersetzte Aufschrift',
    de: ['>Mutterpflanze<', '>Jungpflanze<'],
    en: ['>Mother plant<', '>Young plant<'],
  },
  {
    name: 'Linie: Sonstige wird uebersetzt, botanische Namen nicht',
    de: ['>Sonstige<', '>Papillilaminum<'],
    en: ['>Other<', '>Papillilaminum<'],
  },
  {
    name: 'Herkunft-Schalter tragen den uebersetzten Laendernamen',
    de: ['>Deutschland<', '>Niederlande<', '>Schweiz<'],
    en: ['>Germany<', '>Netherlands<', '>Switzerland<'],
  },
  {
    // Rueckfall: ein Land ohne Zuordnung bleibt stehen, statt zu verschwinden.
    name: 'Unbekanntes Land verschwindet nicht',
    de: ['>Belgien<'],
    en: ['>Belgien<'],
  },
];

(async () => {
  let fails = 0, checks = 0;
  const html = {};

  for (const loc of ['de', 'en']) {
    locale = loc;
    try {
      html[loc] = await engine.renderFile('plant-archive-search', { eintraege: EINTRAEGE, angebote: '' });
    } catch (e) {
      console.log('FEHLER [' + loc + '] Rendern: ' + e.message);
      console.log('\n0/1 Pruefungen bestanden, 1 Fehler.');
      process.exit(1);
    }
  }

  for (const f of faelle) {
    for (const loc of ['de', 'en']) {
      for (const erwartet of f[loc]) {
        checks++;
        if (!html[loc].includes(erwartet)) {
          fails++;
          console.log('FEHLER [' + loc + '] ' + f.name + ': fehlt ' + erwartet);
        }
      }
    }
  }

  // Der Kern: data-wert bleibt in BEIDEN Sprachen der deutsche Rohwert.
  for (const loc of ['de', 'en']) {
    for (const roh of ['Komplexhybrid', 'Reine Art', 'Mutterpflanze', 'Jungpflanze',
                       'Deutschland', 'Niederlande', 'Schweiz', 'Sonstige']) {
      checks++;
      if (!html[loc].includes('data-wert="' + roh + '"')) {
        fails++;
        console.log('FEHLER [' + loc + '] data-wert ist nicht mehr der Rohwert: ' + roh +
                    ' — die Leiste findet dann nichts mehr.');
      }
    }
  }

  // Kein deutscher Auswahlwert als Aufschrift im englischen Lauf. Die Prüfung
  // zielt auf >Wort<, damit sie nicht am data-wert hängenbleibt, der dort
  // richtigerweise deutsch ist.
  for (const deutsch of ['>Komplexhybrid<', '>Reine Art<', '>Mutterpflanze<', '>Jungpflanze<',
                         '>Deutschland<', '>Niederlande<', '>Schweiz<', '>Sonstige<']) {
    checks++;
    if (html.en.includes(deutsch)) {
      fails++;
      console.log('FEHLER [en] deutsche Aufschrift im englischen Lauf: ' + deutsch);
    }
  }


  // ---- Filterblatt und Schnellwahl -----------------------------------------
  const bloecke = [
    ['Filterknopf statt Ausklapper', (h) => /<button[^>]*class="plant-search__filter-button"[^>]*aria-expanded="false"[^>]*aria-controls="PlantSearchSheet"/.test(h), true],
    ['kein details-Ausklapper mehr in der Leiste', (h) => /<details/.test(h), false],
    ['Blatt ist ein Dialog und zu Beginn verborgen', (h) => /<div\s+class="plant-search__sheet"[^>]*role="dialog"[^>]*hidden/.test(h), true],
    ['Blatt hat Schliessen-Knopf und Anwenden-Knopf', (h) => /plant-search__sheet-close/.test(h) && /plant-search__sheet-apply/.test(h), true],
    ['Anwenden-Knopf traegt alle drei Saetze', (h) => /data-text-eins="[^"]+"[\s\S]*data-text-viele="[^"]*%anzahl%[^"]*"[\s\S]*data-text-keine="[^"]+"/.test(h), true],
    ['Schnellwahl vorhanden', (h) => /data-testid="plant-search-tabs"/.test(h), true],
    ['Schnellwahl: Alle ist zu Beginn gewaehlt', (h) => /data-einstieg="alle" aria-pressed="true"/.test(h), true],
    ['Schnellwahl: Stadium mit Rohwert in data-wert', (h) => /data-einstieg="stadium" data-wert="Jungpflanze"/.test(h) && /data-einstieg="stadium" data-wert="Mutterpflanze"/.test(h), true],
    ['Merkmale-Gruppe mit Rohwert (leere Namen fallen heraus)', (h) => /data-facet="merkmale"\s+data-mehrfach="true"\s+data-wert="Samtig"/.test(h) && /data-wert="Sehr dunkel"/.test(h) && !/data-wert="\s*"/.test(h), true],
    ['Merkmal nur einmal als Schalter, obwohl zweimal vergeben', (h) => (h.match(/data-facet="merkmale"/g) || []).length, 2],
    ['aktive Filter als eigene Zeile mit Liste und Zuruecksetzen, zu Beginn verborgen', (h) => /<div class="plant-search__active-row" hidden[^>]*>\s*<ul class="plant-search__active"[\s\S]*?<\/ul>\s*<button[^>]*plant-search__clear/.test(h), true],
    ['Seitengroesse am Element', (h) => /data-seite="12"/.test(h), true],
  ];
  for (const loc of ['de', 'en']) {
    for (const [name, fn, soll] of bloecke) {
      checks++;
      const ist = fn(html[loc]);
      if (JSON.stringify(ist) !== JSON.stringify(soll)) {
        fails++;
        console.log('FEHLER [' + loc + '] ' + name + ' (ist ' + JSON.stringify(ist) + ')');
      }
    }
  }
  for (const [loc, tab, merk, apply] of [['de', '>Alle ', 'Merkmale', 'Pflanzen anzeigen'], ['en', '>All ', 'Traits', 'Show %anzahl% plants']]) {
    for (const t of [tab, '>' + merk + '<', apply]) {
      checks++;
      if (!html[loc].includes(t)) { fails++; console.log('FEHLER [' + loc + '] fehlt ' + t); }
    }
  }
  // Ohne Stadium-Unterschied und ohne Angebot gibt es keine Schnellwahl.
  locale = 'de';
  const einheitlich = await engine.renderFile('plant-archive-search', {
    eintraege: [pflanze({ stadium: feld('Jungpflanze'), reinheit: feld('Hybrid') }), pflanze({ stadium: feld('Jungpflanze'), reinheit: feld('Reine Art') })],
    angebote: '',
  });
  checks++;
  if (/plant-search__tabs/.test(einheitlich)) { fails++; console.log('FEHLER: Schnellwahl ohne trennende Werte'); }

  // Die fremde Pflanze darf keinen eigenen Schalter bekommen.
  checks++;
  if (html.de.includes('data-wert="Naturhybrid"')) {
    fails++;
    console.log('FEHLER: fremde Pflanze speist einen Wert in die Filterleiste ein.');
  }

  console.log('\n' + (checks - fails) + '/' + checks + ' Pruefungen bestanden, ' + fails + ' Fehler.');
  process.exit(fails ? 1 : 0);
})();

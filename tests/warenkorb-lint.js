// Waechter: Wer den Warenkorb per JavaScript fuellt, muss auch seinen INHALT
// auffrischen — nicht nur die Zahl im Kopf.
//
// Anlass: Der Knopf der Winterverpackung holte nur den Abschnitt
// `cart-icon-bubble` nach. Die Zahl sprang auf 1, die Schublade blieb leer,
// und erst ein Neuladen zeigte die Ware. Gefunden hat das Tung, nicht der
// Pruefstand — der rendert Liquid und fuehrt kein JavaScript aus. Dieser
// Waechter beweist deshalb nicht, dass es wirkt; er faengt den Rueckfall in
// genau dieses Muster.
//
// Die erste Fassung suchte nach "sections" und "getSectionsToRender". Beides
// steht auch in `antwort.sections` und in einer typeof-Abfrage, also blieb sie
// gruen, nachdem der entscheidende Teil entfernt war. Ein Merkmal taugt nur,
// wenn es NUR beim richtigen Weg vorkommt.
const fs = require('fs');
const path = require('path');

const ASSETS = path.join(__dirname, '..', 'assets');

// Namentlich, nicht gesucht: Dawns eigene Dateien bringen den Weg schon mit,
// und ein Muster ueber alle Dateien hat hier schon einmal zufaellig gepasst.
// Fehlt eine genannte Datei, ist der Waechter leer und sagt das.
const UNSERE = ['winter-pack.js'];

const PFLICHT = [
  {
    name: 'sections_url',
    pruef: (c) => /sections_url/.test(c),
    warum: 'bestellt keine gerenderten Abschnitte mit. `sections_url` gibt es '
      + 'nur auf diesem Weg — ohne ihn bleibt der Warenkorbinhalt stehen, bis '
      + 'jemand neu laedt.',
  },
  {
    name: 'getSectionInnerHTML des Warenkorb-Elements',
    pruef: (c) => /\.getSectionInnerHTML\s*\(/.test(c),
    warum: 'setzt die Abschnitte nicht mit der Methode des Warenkorb-Elements '
      + 'ein; ein eigener Parser trifft den falschen Selektor.',
  },
  {
    name: 'Warenkorb-Element gesucht',
    pruef: (c) => /querySelector\(\s*['"]cart-(notification|drawer)['"]/.test(c),
    warum: 'sucht kein Warenkorb-Element (cart-drawer / cart-notification).',
  },
];

let geprueft = 0;
let fehler = 0;

for (const datei of UNSERE) {
  const p = path.join(ASSETS, datei);
  if (!fs.existsSync(p)) {
    console.log('FEHLER: ' + datei + ' fehlt — umbenannt oder geloescht? '
      + 'Dieser Waechter darf nicht stillschweigend ueber nichts laufen.');
    fehler++;
    continue;
  }

  const roh = fs.readFileSync(p, 'utf8');
  if (!/cart\/add\.js/.test(roh)) {
    console.log('FEHLER ' + datei + ': ruft cart/add.js nicht mehr — dann '
      + 'prueft dieser Waechter die falsche Datei.');
    fehler++;
    continue;
  }

  // Kommentare raus: Ein Waechter, der Prosa liest, meldet den Aufruf aus dem
  // Kommentar, der ihn erklaert. Das ist in diesem Projekt schon passiert.
  const code = roh
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((z) => z.replace(/(^|[^:])\/\/.*$/, '$1'))
    .join('\n');

  geprueft++;
  for (const p2 of PFLICHT) {
    if (!p2.pruef(code)) {
      console.log('FEHLER ' + datei + ' [' + p2.name + ']: ' + p2.warum);
      fehler++;
    }
  }
}

console.log('\n' + geprueft + ' Skript(e) auf Warenkorb-Auffrischung geprueft, '
  + fehler + ' Fehler.');
process.exit(fehler ? 1 : 0);

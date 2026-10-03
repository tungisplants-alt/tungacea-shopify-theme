// Wächter gegen deutsche Datenwerte auf der englischen Seite.
//
// Am 3. Oktober standen `reinheit` und das Land des Züchters als rohe deutsche
// Datenwerte in der Seite — monatelang, unter 322 grünen Prüfungen. Stadium und
// Generation waren längst auf Sprachschlüssel abgebildet; die Reinheit war ein
// vergessener Fall desselben Musters, und das Land gleich an vier Stellen.
//
// Shopify übersetzt Theme-Texte, aber **niemals** Metaobjekt- und
// Metafeld-Werte. Ein Feld, dessen Werte Tung auf Deutsch einträgt, muss also
// im Theme auf einen Sprachschlüssel abgebildet werden. Dieser Lint erzwingt
// das.
//
// Er prüft zwei Wege, auf denen ein Rohwert in die Seite gelangt:
//   1. direkt:   {{ eintrag.reinheit.value | escape }}
//   2. über eine Variable:
//                assign zuechter_land = zuechter.land.value
//                ... später ...  {{ zuechter_land | escape }}
//
// Weg 2 war der echte Fehler. Ein Lint, der nur Weg 1 kennt, hätte ihn
// durchgelassen.
//
// Und er meldet **unbekannte** Felder. Ein Feld, das in keiner der drei Listen
// steht, ist keine stille Annahme wert: Es muss jemand entscheiden, ob seine
// Werte deutsch sind. Ein Lint, der Unbekanntes für harmlos hält, wächst mit
// dem Projekt nicht mit.
const fs = require('fs');
const path = require('path');

const THEME = path.join(__dirname, '..');
const ORDNER = ['snippets', 'sections', 'blocks'];

// Werte trägt Tung auf Deutsch ein → müssen übersetzt werden.
const UEBERSETZT = new Set([
  'stadium', 'reinheit', 'generation', 'bewurzelung', 'lieferumfang', 'land',
]);

// Sprachneutral: botanische Namen, Kennungen, Zahlen, Verweise.
const NEUTRAL = new Set([
  'bezeichnung', 'kreuzung', 'linie', 'mutter_id', 'specimen_id',
  'name', 'instagram', 'website',
  'blattlaenge_cm', 'blattlaenge_bis_cm', 'aufnahmedatum',
  'fotos', 'fotograf', 'bildfreigabe', 'besitzer', 'zuechter', 'bezogen_von',
  'angebote', 'mutterpflanze',
  // Dawn-eigene Felder, keine Tungacea-Daten:
  'min_value', 'max_value', 'rating', 'scale_min', 'scale_max',
]);

// Freier Text. Kein `case` kann das lösen — das läuft über Shopifys
// Übersetzung am Metaobjekt (`translatable`, seit 3. Oktober eingeschaltet).
const FREITEXT = new Set(['merkmal', 'notiz']);

let dateien = 0;
let ausgaben = 0;
let fehler = 0;

for (const ordner of ORDNER) {
  const dir = path.join(THEME, ordner);
  if (!fs.existsSync(dir)) continue;

  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.liquid')) continue;
    dateien++;
    const text = fs.readFileSync(path.join(dir, name), 'utf8');
    const zeilen = text.split(/\r?\n/);
    const wo = ordner + '/' + name;

    // Variablen, die einen Rohwert aus einem übersetzungspflichtigen Feld
    // tragen. Schlägt später eine Zeile `assign VAR = '...' | t` zu, gilt die
    // Variable als abgebildet — genau so arbeiten stage_label und
    // reinheit_label.
    const rohVariablen = new Map();
    for (const z of zeilen) {
      const m = z.match(/assign\s+([a-z_]+)\s*=\s*[a-z_.]*\.([a-z_]+)\.value/);
      if (m && UEBERSETZT.has(m[2])) rohVariablen.set(m[1], m[2]);
    }
    const abgebildet = new Set();
    for (const z of zeilen) {
      const m = z.match(/assign\s+([a-z_]+)\s*=\s*'[^']*'\s*\|\s*t\b/);
      if (m) abgebildet.add(m[1]);
    }

    zeilen.forEach((zeile, i) => {
      const nr = wo + ':' + (i + 1);
      // Ein data-Attribut trägt bewusst den Rohwert: das Skript vergleicht ihn
      // gegen die Kachel. Ein übersetztes data-Attribut fände nichts mehr.
      const istDatenAttribut = /data-[a-z-]+="\{\{/.test(zeile);

      // Weg 1: direkte Ausgabe eines Feldes.
      for (const m of zeile.matchAll(/\{\{-?\s*[a-z_.]*\.([a-z_]+)\.value/g)) {
        const feld = m[1];
        ausgaben++;
        if (NEUTRAL.has(feld) || FREITEXT.has(feld)) continue;
        if (UEBERSETZT.has(feld)) {
          if (istDatenAttribut) continue;
          fehler++;
          console.log(
            'FEHLER ' + nr + ' — `' + feld + '` wird roh ausgegeben. Seine Werte ' +
            'traegt Tung auf Deutsch ein, also steht auf der englischen Seite ' +
            'deutscher Text. Ueber einen case auf einen Sprachschluessel abbilden.'
          );
          continue;
        }
        fehler++;
        console.log(
          'FEHLER ' + nr + ' — `' + feld + '` ist diesem Waechter unbekannt. ' +
          'Trage es in sprachwert-lint.js ein: UEBERSETZT (deutsche Werte), ' +
          'NEUTRAL (botanisch, Kennung, Zahl) oder FREITEXT.'
        );
      }

      // Weg 2: Ausgabe einer Variablen, die einen Rohwert traegt.
      for (const m of zeile.matchAll(/\{\{-?\s*([a-z_]+)\s*[|}]/g)) {
        const v = m[1];
        if (!rohVariablen.has(v)) continue;
        if (abgebildet.has(v)) continue;
        if (istDatenAttribut) continue;
        fehler++;
        console.log(
          'FEHLER ' + nr + ' — `' + v + '` traegt den Rohwert aus `' +
          rohVariablen.get(v) + '` und wird direkt ausgegeben. Genau so stand ' +
          'das Land des Zuechters monatelang deutsch in der englischen Seite.'
        );
      }
    });
  }
}

console.log(
  '\n' + dateien + ' Dateien, ' + ausgaben + ' Metafeld-Ausgaben auf deutsche ' +
  'Datenwerte geprueft, ' + fehler + ' Fehler.'
);
process.exit(fehler ? 1 : 0);

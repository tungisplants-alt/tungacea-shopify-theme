// Gegenprobe gegen den Fehler, der am 30. September 2026 live stand:
// "Liquid error (snippets/plant-card line 85): invalid url input".
//
// Die Ursache war `fotos[0]`, wobei `fotos` aus `eintrag.fotos.value` kam.
// liquidjs indiziert so eine Liste klaglos, Shopify gibt dort nichts zurück —
// und alle 216 Prüfungen waren grün, weil der Prüfstand nicht Shopify ist.
//
// Indexzugriff ist nicht generell falsch. `card_product.media[1]` ist in Dawn
// üblich, und das Ergebnis eines `split` darf indiziert werden. Verboten ist
// nur der Index auf eine Variable, die aus einem `.value` stammt. Dort wird
// iteriert:
//
//   assign erstes = nil
//   for f in liste limit: 1
//     assign erstes = f
//   endfor
const fs = require('fs');
const path = require('path');

const THEME = path.join(__dirname, '..');
const ORDNER = ['snippets', 'sections', 'layout', 'blocks', 'templates'];

let dateien = 0;
let variablen = 0;
let fehler = 0;

for (const ordner of ORDNER) {
  const dir = path.join(THEME, ordner);
  if (!fs.existsSync(dir)) continue;

  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.liquid')) continue;
    dateien++;
    const rows = fs.readFileSync(path.join(dir, name), 'utf8').split(/\r?\n/);

    // Variablen sammeln, die aus einem .value zugewiesen werden.
    const ausValue = new Set();
    for (const row of rows) {
      const m = /^\s*assign\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*[^|]*\.value\b/.exec(row);
      if (m) ausValue.add(m[1]);
    }
    if (ausValue.size === 0) continue;
    variablen += ausValue.size;

    // Kommentarblöcke ausklammern: dort darf das Muster benannt werden.
    let imComment = false;
    rows.forEach((row, i) => {
      const t = row.trim();
      if (/^comment\b/.test(t)) { imComment = true; return; }
      if (/^endcomment\b/.test(t)) { imComment = false; return; }
      if (imComment) return;
      if (/^\s*\{%-?\s*comment/.test(row) || /^\s*\{#/.test(row)) return;

      for (const v of ausValue) {
        if (!new RegExp('\\b' + v + '\\s*\\[').test(row)) continue;
        fehler++;
        console.log(
          'FEHLER ' + ordner + '/' + name + ':' + (i + 1) +
          ' — Indexzugriff auf "' + v + '", das aus einem .value stammt.' +
          ' Shopify gibt dort nichts zurück; stattdessen iterieren.'
        );
      }
    });
  }
}

console.log('\n' + dateien + ' Dateien, ' + variablen +
  ' Variablen aus .value auf Indexzugriff geprüft, ' + fehler + ' Fehler.');
process.exit(fehler ? 1 : 0);

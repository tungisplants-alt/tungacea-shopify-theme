// Gegenprobe gegen eine Falle, die in dieser Codebasis zweimal zugeschlagen hat:
// Innerhalb eines {% liquid %}-Blocks ist jede Zeile ein Tag. Eine Prosazeile
// zwischen comment und endcomment, die mit einem Anfuehrungszeichen, einer
// Klammer oder einem Sonderzeichen beginnt, liest der Parser als Tagnamen und
// das ganze Snippet zerlegt sich. Der Fehler zeigt auf eine andere Zeile.
//
// Laeuft ueber alle .liquid-Dateien des Themes, ohne Abhaengigkeiten.
const fs = require('fs');
const path = require('path');

const THEME = path.join(__dirname, '..');
const ORDNER = ['snippets', 'sections', 'layout', 'blocks', 'templates'];

// Was am Zeilenanfang unbedenklich ist: Buchstabe, Ziffer oder Leerzeile.
const HARMLOS = /^[A-Za-z0-9ÄÖÜäöüß]/;

let dateien = 0;
let zeilen = 0;
let fehler = 0;

for (const ordner of ORDNER) {
  const dir = path.join(THEME, ordner);
  if (!fs.existsSync(dir)) continue;
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.liquid')) continue;
    dateien++;
    const text = fs.readFileSync(path.join(dir, name), 'utf8');
    const rows = text.split(/\r?\n/);

    let imLiquid = false;
    let imComment = false;
    rows.forEach((row, i) => {
      const t = row.trim();

      if (!imLiquid) {
        if (/^\{%-?\s*liquid\b/.test(t)) imLiquid = true;
        return;
      }
      // Blockende: eine Zeile, die den Tag schliesst.
      if (/-?%\}\s*$/.test(t)) {
        if (/^\S*-?%\}\s*$/.test(t)) { imLiquid = false; imComment = false; return; }
      }
      if (!imComment) {
        if (/^comment\b/.test(t)) imComment = true;
        return;
      }
      if (/^endcomment\b/.test(t)) { imComment = false; return; }

      // Hier stehen wir in einer Prosazeile innerhalb von {% liquid %}.
      zeilen++;
      if (t !== '' && !HARMLOS.test(t)) {
        fehler++;
        console.log('FEHLER ' + ordner + '/' + name + ':' + (i + 1) +
          ' — Kommentarzeile beginnt mit "' + t[0] + '": ' + t.slice(0, 60));
      }
    });
  }
}

console.log('\n' + dateien + ' Dateien, ' + zeilen + ' Kommentarzeilen in {% liquid %}-Bloecken geprueft, ' + fehler + ' Fehler.');
process.exit(fehler ? 1 : 0);

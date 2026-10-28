// Prueft die Kopfzeile des Archivs: Foto als Hintergrund mit dunkler Schicht,
// Bild gehoert dem Theme (vorhanden, nicht zu gross).
const fs = require('fs');
const path = require('path');
const THEME = path.join(__dirname, '..');
const snippet = fs.readFileSync(path.join(THEME, 'snippets/plant-archive-gallery.liquid'), 'utf8');
const css = fs.readFileSync(path.join(THEME, 'assets/component-plant-archive.css'), 'utf8');
const bild = path.join(THEME, 'assets/tungacea-archiv-kopf.jpg');

let geprueft = 0;
let fehler = 0;
function pruefe(name, ist, soll) {
  geprueft++;
  if (JSON.stringify(ist) !== JSON.stringify(soll)) {
    fehler++;
    console.log('FEHLER  ' + name + '\n   ist:  ' + JSON.stringify(ist) + '\n   soll: ' + JSON.stringify(soll));
  }
}

pruefe('Foto liegt im Theme', fs.existsSync(bild), true);
pruefe('Foto ist unter 500 kB', fs.existsSync(bild) && fs.statSync(bild).size < 500 * 1024, true);
pruefe('Kopf setzt die Bildvariable aus der Asset-Datei', /--archiv-bild: url\('\{\{ 'tungacea-archiv-kopf\.jpg' \| asset_url \}\}'\)/.test(snippet), true);
pruefe('CSS legt das Foto als Hintergrund unter den Kopf', /var\(--archiv-bild\) [^;]*cover no-repeat/.test(css), true);
pruefe('dunkle Schichten ueber dem Foto (Handy und Laptop)', (css.match(/linear-gradient\(/g) || []).length >= 4, true);
pruefe('Eyebrow hat im Kopf eine hellere Farbe', /plant-archive__hero \.plant-archive__eyebrow\s*\{[^}]*color/.test(css), true);

console.log(fehler + ' Fehler in ' + geprueft + ' Pruefungen');
process.exit(fehler ? 1 : 0);

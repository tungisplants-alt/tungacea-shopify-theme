// Prueft die Kopfzeile der Kollektion: das Foto liegt als Hintergrund hinter
// dem Text, mit dunkler Schicht fuer die Lesbarkeit, und das Bild gehoert dem
// Theme (Datei vorhanden, nicht zu gross).
const fs = require('fs');
const path = require('path');
const THEME = path.join(__dirname, '..');
const abschnitt = fs.readFileSync(path.join(THEME, 'sections/main-collection-banner.liquid'), 'utf8');
const css = fs.readFileSync(path.join(THEME, 'assets/component-collection-hero.css'), 'utf8');
const bild = path.join(THEME, 'assets/tungacea-kollektion.jpg');

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
pruefe('Foto ist unter 500 kB (Ladezeit am Handy)', fs.existsSync(bild) && fs.statSync(bild).size < 500 * 1024, true);
pruefe('Kopfzeile setzt die Bildvariable aus der Asset-Datei', /--kollektion-bild: url\('\{\{ 'tungacea-kollektion\.jpg' \| asset_url \}\}'\)/.test(abschnitt), true);
pruefe('CSS legt das Foto als Hintergrund unter die Kopfzeile', /var\(--kollektion-bild\) center [0-9]+% \/ cover no-repeat/.test(css), true);
const schichten = (css.match(/linear-gradient\(/g) || []).length;
pruefe('dunkle Schichten liegen ueber dem Foto (Handy und Laptop)', schichten >= 4, true);
pruefe('kein roter Schein mehr (radial-gradient mit Akzentfarbe)', /radial-gradient/.test(css), false);
pruefe('Ueberschrift hat einen weichen Schatten fuer die Lesbarkeit', /collection-hero__title[\s\S]{0,300}text-shadow/.test(css), true);
pruefe('Beschreibungssatz fuer die Gesamtkollektion ist eingebaut', /all_description/.test(abschnitt), true);

console.log(fehler + ' Fehler in ' + geprueft + ' Pruefungen');
process.exit(fehler ? 1 : 0);

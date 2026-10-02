// Gegenprobe gegen einen Fehler, der vier Tage live stand: auf der
// Pflanzenseite waren die Fotos anklickbare Knöpfe, die nichts taten.
//
// `specimen-lightbox` braucht drei Dinge im selben Snippet:
//   1. das Skript  specimen-lightbox.js
//   2. ein <dialog> innerhalb des Elements
//   3. darin ein Bild mit data-lightbox-image
//
// Fehlt eines davon, bricht connectedCallback in der ersten Zeile ab — ohne
// Fehlermeldung, ohne Konsolenausgabe. Das Markup sieht vollständig aus, die
// Knöpfe sind fokussierbar, und ein Klick passiert einfach nichts. So eine
// Stille findet keine Prüfung, die nur auf Vorhandensein schaut.
const fs = require('fs');
const path = require('path');

const THEME = path.join(__dirname, '..');
const ORDNER = ['snippets', 'sections', 'layout', 'blocks'];

const PFLICHT = [
  ['specimen-lightbox.js', 'das Skript wird nicht geladen'],
  ['<dialog', 'es gibt kein dialog-Element'],
  ['data-lightbox-image', 'kein Bild mit data-lightbox-image'],
  ['data-lightbox-close', 'kein Schliessen-Knopf'],
];

let dateien = 0;
let mitElement = 0;
let fehler = 0;

for (const ordner of ORDNER) {
  const dir = path.join(THEME, ordner);
  if (!fs.existsSync(dir)) continue;

  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.liquid')) continue;
    dateien++;
    const text = fs.readFileSync(path.join(dir, name), 'utf8');
    if (!text.includes('<specimen-lightbox')) continue;
    mitElement++;

    for (const [teil, grund] of PFLICHT) {
      if (text.includes(teil)) continue;
      fehler++;
      console.log(
        'FEHLER ' + ordner + '/' + name +
        ' — benutzt <specimen-lightbox>, aber ' + grund + '.' +
        ' Das Element bricht dann still ab und die Knoepfe tun nichts.'
      );
    }

    // Auslöser ohne Ziel: ein Knopf, der eine Adresse mitbringt, die niemand liest.
    const ausloeser = (text.match(/data-lightbox-full/g) || []).length;
    if (ausloeser === 0) {
      fehler++;
      console.log(
        'FEHLER ' + ordner + '/' + name +
        ' — benutzt <specimen-lightbox>, aber kein Element mit data-lightbox-full.' +
        ' Dann gibt es nichts zu oeffnen.'
      );
    }
  }
}

console.log(
  '\n' + dateien + ' Dateien, ' + mitElement + ' mit specimen-lightbox geprueft, ' +
  fehler + ' Fehler.'
);
process.exit(fehler ? 1 : 0);

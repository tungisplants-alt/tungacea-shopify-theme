// Wächter gegen fest eingetragene E-Mail-Adressen im Theme.
//
// Am 20. Oktober stand auf der Kontaktseite noch `tungisplants@gmail.com`,
// fest im Quelltext von contact-form.liquid — zweimal sogar, im href und im
// sichtbaren Text. Shopifys Kontakt-Richtlinie führte längst eine andere
// Adresse.
//
// Dasselbe Muster richtet im Impressum echten Schaden an: dort zeigte der
// mailto auf eine Adresse, während daneben eine andere stand. Wer eine Adresse
// zweimal tippt, hat zwei Stellen, die auseinanderlaufen können — und sie
// laufen auseinander.
//
// Eine Adresse gehört deshalb in die Shop-Einstellungen (`shop.email`) und
// wird von dort gelesen. Dieser Lint erzwingt das für den Theme-Code. Was in
// den Rechtstexten steht, liegt ausserhalb des Repositories und muss weiter von
// Hand geprüft werden.
const fs = require('fs');
const path = require('path');

const THEME = path.join(__dirname, '..');
const ORDNER = ['snippets', 'sections', 'layout', 'blocks', 'templates', 'assets'];

// Shopifys eigene Beispieladressen und Platzhalter sind keine echten Adressen.
const ERLAUBT = [
  /example\.com$/i,
  /@shopify\.com$/i,
  /\{\{/,          // Liquid-Ausdruck, also gerade keine feste Adresse
];

let dateien = 0;
let treffer = 0;
let fehler = 0;

for (const ordner of ORDNER) {
  const dir = path.join(THEME, ordner);
  if (!fs.existsSync(dir)) continue;

  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (!fs.statSync(p).isFile()) continue;
    if (!/\.(liquid|json|js|css)$/.test(name)) continue;
    dateien++;

    const zeilen = fs.readFileSync(p, 'utf8').split(/\r?\n/);
    zeilen.forEach((zeile, i) => {
      for (const m of zeile.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)) {
        const adresse = m[0];
        treffer++;
        if (ERLAUBT.some((r) => r.test(adresse))) continue;
        fehler++;
        console.log(
          'FEHLER ' + ordner + '/' + name + ':' + (i + 1) + ' — feste E-Mail-Adresse `' +
          adresse + '`. Sie gehoert in die Shop-Einstellungen und wird mit ' +
          '`shop.email` gelesen. Zweimal getippt laufen Verweis und Aufschrift ' +
          'auseinander, und genau das ist im Impressum passiert.'
        );
      }
    });
  }
}

console.log(
  '\n' + dateien + ' Dateien, ' + treffer + ' Adressen gefunden, ' + fehler + ' Fehler.'
);
process.exit(fehler ? 1 : 0);

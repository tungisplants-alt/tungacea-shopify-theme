// Erzeugt die Entwuerfe als SVG. Ein Skript statt drei Handdateien, damit die
// Farben und Strichbreiten garantiert dieselben sind.
const fs = require('fs');

const GRUND   = '#0a0a0a';   // Theme-Grund
const PAPIER  = '#f2eee8';   // Vordergrund
const OXBLOOD = '#6E1C28';   // nur als FLAECHE, nie als Vordergrund (1,62:1)
const AKZENT  = '#CC6070';   // wo ein Akzent gesehen werden muss (4,75:1)

// Strichbreiten: Das Bild landet im Warenkorb bei rund 150px, also 1/8 der
// Zeichenflaeche. Eine 4px-Haarlinie waere dort 0,5px und verblasst. 12px
// landen bei 1,5px und halten.
const STRICH = 12;

// Herzfoermiges Blatt, Spitze unten — in einem 200er Feld definiert.
const BLATT = 'M100,38 C88,14 60,4 42,16 C18,32 14,62 22,90 '
            + 'C34,130 66,186 100,235 C134,186 166,130 178,90 '
            + 'C186,62 182,32 158,16 C140,4 112,14 100,38 Z';
// Der Stiel verkauft die Form endgueltig als Blatt. Ohne ihn bleibt jede
// herzfoermige Silhouette mehrdeutig.
const STIEL = 'M100,40 V6';

const rahmen = (inhalt, defs) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200" width="1200" height="1200">
<defs>
  <radialGradient id="waerme" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="${OXBLOOD}" stop-opacity="0.95"/>
    <stop offset="1" stop-color="${OXBLOOD}" stop-opacity="0"/>
  </radialGradient>
${defs || ''}
</defs>
<rect width="1200" height="1200" fill="${GRUND}"/>
${inhalt}
</svg>`;

// ---------------------------------------------------------------- A: Paket
// Spricht von Verpackung, nicht von Pflanze. Im Warenkorb steht es neben
// Pflanzenfotos — es darf nicht wie eine weitere Pflanze aussehen.
// Ein Gurt, nicht zwei: Ein Kreuz aus Gurten haette das Kreuzungszeichen der
// Produktseite nachgeahmt.
const A = rahmen(`
  <circle cx="600" cy="600" r="430" fill="url(#waerme)" opacity="0.5"/>
  <rect x="330" y="400" width="540" height="420" rx="14" fill="#141315"
        stroke="${PAPIER}" stroke-opacity="0.78" stroke-width="${STRICH}"/>
  <rect x="567" y="400" width="66" height="420" fill="${OXBLOOD}"/>
  <path d="M330,497 H567 M633,497 H870" stroke="${PAPIER}" stroke-opacity="0.34"
        stroke-width="${STRICH - 4}" fill="none"/>
`);

// ------------------------------------------------- B: Waerme um das Blatt
// Spricht vom Zweck. Die Boegen sind AKZENT, nicht Oxblood: Oxblood auf
// Dunkel ergibt gemessene 1,62:1 und waere praktisch unsichtbar.
const B = rahmen(`
  <circle cx="600" cy="600" r="400" fill="url(#waerme)" opacity="0.42"/>
  <g fill="none" stroke="${AKZENT}" stroke-linecap="round" stroke-width="${STRICH}">
    <path d="M330,760 A330,330 0 1 1 870,760" opacity="0.85"/>
    <path d="M232,800 A430,430 0 1 1 968,800" opacity="0.42" stroke-width="${STRICH - 3}"/>
  </g>
  <g transform="translate(600 610) scale(1.62) translate(-100 -120)">
    <path d="${BLATT}" fill="${PAPIER}"/>
    <path d="${STIEL}" stroke="${PAPIER}" stroke-width="9" stroke-linecap="round"/>
  </g>
`);

// ------------------------------------------------- C: Blatt im Paket
// Beides zugleich: was geschuetzt wird und wodurch.
const C = rahmen(`
  <circle cx="600" cy="600" r="470" fill="url(#waerme)" opacity="0.72"/>
  <rect x="330" y="390" width="540" height="440" rx="14" fill="#141315"
        stroke="${PAPIER}" stroke-opacity="0.68" stroke-width="${STRICH}"/>
  <g transform="translate(600 618) scale(1.12) translate(-100 -120)">
    <path d="${BLATT}" fill="${PAPIER}"/>
    <path d="${STIEL}" stroke="${PAPIER}" stroke-width="9" stroke-linecap="round"/>
  </g>
`);

fs.writeFileSync('winterverpackung-a.svg', A);
fs.writeFileSync('winterverpackung-b.svg', B);
fs.writeFileSync('winterverpackung-c.svg', C);
console.log('drei SVG geschrieben');

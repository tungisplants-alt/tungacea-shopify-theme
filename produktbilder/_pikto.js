// Piktogramme fuer die Winterverpackung: benennen, was drin ist (Heatpack,
// Isolierfolie) oder wogegen es hilft (Frost). Kein Paket, kein Blatt.
const fs = require('fs');

const GRUND   = '#0a0a0a';
const PAPIER  = '#f2eee8';
const OXBLOOD = '#6E1C28';   // nur Flaeche
const AKZENT  = '#CC6070';   // 4,75:1 — wo etwas gesehen werden muss
const STRICH  = 14;          // bei 150px Warenkorbgroesse rund 1,75px

const rahmen = (inhalt) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200" width="1200" height="1200">
<defs><radialGradient id="w" cx="50%" cy="50%" r="50%">
  <stop offset="0" stop-color="${OXBLOOD}" stop-opacity="0.9"/>
  <stop offset="1" stop-color="${OXBLOOD}" stop-opacity="0"/>
</radialGradient></defs>
<rect width="1200" height="1200" fill="${GRUND}"/>
${inhalt}
</svg>`;

// Schneeflocke: sechs Arme, je zwei Zweige. Bei 56px fallen die Zweige weg,
// der Sechsstern bleibt — deshalb traegt der Stern die Erkennbarkeit, nicht
// die Verzierung.
function flocke(cx, cy, r, farbe, breite) {
  let d = '';
  for (let i = 0; i < 6; i++) {
    const a = (i * 60 - 90) * Math.PI / 180;
    const ex = cx + Math.cos(a) * r, ey = cy + Math.sin(a) * r;
    d += `M${cx},${cy} L${ex.toFixed(1)},${ey.toFixed(1)} `;
    for (const [t, len] of [[0.52, 0.3], [0.78, 0.22]]) {
      const bx = cx + Math.cos(a) * r * t, by = cy + Math.sin(a) * r * t;
      for (const s of [-1, 1]) {
        const za = a + s * 38 * Math.PI / 180;
        d += `M${bx.toFixed(1)},${by.toFixed(1)} `
           + `L${(bx + Math.cos(za) * r * len).toFixed(1)},${(by + Math.sin(za) * r * len).toFixed(1)} `;
      }
    }
  }
  return `<path d="${d}" fill="none" stroke="${farbe}" stroke-width="${breite}" stroke-linecap="round"/>`;
}

// Waermewellen: senkrecht aufsteigend, die uebliche Zeichensprache fuer Hitze.
const welle = (x, y, h) =>
  `M${x},${y} c -34,-${h*0.26} 34,-${h*0.46} 0,-${h*0.68} c -28,-${h*0.2} 22,-${h*0.26} 0,-${h*0.32}`;

// Heatpack: ein Beutel mit Siegelnaht oben und unten.
const beutel = (x, y, b, h) => `
  <rect x="${x}" y="${y}" width="${b}" height="${h}" rx="26" fill="${OXBLOOD}"
        stroke="${PAPIER}" stroke-opacity="0.82" stroke-width="${STRICH}"/>
  <path d="M${x+34},${y+54} H${x+b-34} M${x+34},${y+h-54} H${x+b-34}"
        stroke="${PAPIER}" stroke-opacity="0.38" stroke-width="${STRICH-5}" fill="none"/>`;

// ------------------------------------------------------------ A: Heatpack
const A = rahmen(`
  <circle cx="600" cy="640" r="430" fill="url(#w)" opacity="0.5"/>
  ${beutel(378, 560, 444, 330)}
  <g fill="none" stroke="${AKZENT}" stroke-width="${STRICH}" stroke-linecap="round">
    <path d="${welle(480, 500, 300)}"/>
    <path d="${welle(600, 500, 300)}"/>
    <path d="${welle(720, 500, 300)}"/>
  </g>`);

// ---------------------------------------------------------- B: Frostsymbol
const B = rahmen(`
  <circle cx="600" cy="600" r="430" fill="url(#w)" opacity="0.4"/>
  ${flocke(600, 600, 345, PAPIER, STRICH + 2)}`);

// ------------------------------------------- C: Waerme gegen Frost
const C = rahmen(`
  <circle cx="600" cy="560" r="430" fill="url(#w)" opacity="0.46"/>
  ${flocke(600, 470, 268, PAPIER, STRICH + 1)}
  <g fill="none" stroke="${AKZENT}" stroke-width="${STRICH}" stroke-linecap="round">
    <path d="${welle(470, 1010, 250)}"/>
    <path d="${welle(600, 1040, 270)}"/>
    <path d="${welle(730, 1010, 250)}"/>
  </g>`);

// ------------------------------- D: Heatpack in Isolierfolie
const D = rahmen(`
  <circle cx="600" cy="600" r="450" fill="url(#w)" opacity="0.42"/>
  <g fill="none" stroke="${PAPIER}" stroke-opacity="0.34" stroke-width="${STRICH - 5}">
    <circle cx="190" cy="300" r="31"/><circle cx="293" cy="300" r="31"/><circle cx="396" cy="300" r="31"/><circle cx="499" cy="300" r="31"/><circle cx="602" cy="300" r="31"/><circle cx="705" cy="300" r="31"/><circle cx="808" cy="300" r="31"/><circle cx="911" cy="300" r="31"/><circle cx="1014" cy="300" r="31"/><circle cx="242" cy="403" r="31"/><circle cx="345" cy="403" r="31"/><circle cx="448" cy="403" r="31"/><circle cx="551" cy="403" r="31"/><circle cx="654" cy="403" r="31"/><circle cx="757" cy="403" r="31"/><circle cx="860" cy="403" r="31"/><circle cx="963" cy="403" r="31"/><circle cx="190" cy="506" r="31"/><circle cx="293" cy="506" r="31"/><circle cx="396" cy="506" r="31"/><circle cx="499" cy="506" r="31"/><circle cx="602" cy="506" r="31"/><circle cx="705" cy="506" r="31"/><circle cx="808" cy="506" r="31"/><circle cx="911" cy="506" r="31"/><circle cx="1014" cy="506" r="31"/><circle cx="242" cy="609" r="31"/><circle cx="345" cy="609" r="31"/><circle cx="448" cy="609" r="31"/><circle cx="551" cy="609" r="31"/><circle cx="654" cy="609" r="31"/><circle cx="757" cy="609" r="31"/><circle cx="860" cy="609" r="31"/><circle cx="963" cy="609" r="31"/><circle cx="190" cy="712" r="31"/><circle cx="293" cy="712" r="31"/><circle cx="396" cy="712" r="31"/><circle cx="499" cy="712" r="31"/><circle cx="602" cy="712" r="31"/><circle cx="705" cy="712" r="31"/><circle cx="808" cy="712" r="31"/><circle cx="911" cy="712" r="31"/><circle cx="1014" cy="712" r="31"/><circle cx="242" cy="815" r="31"/><circle cx="345" cy="815" r="31"/><circle cx="448" cy="815" r="31"/><circle cx="551" cy="815" r="31"/><circle cx="654" cy="815" r="31"/><circle cx="757" cy="815" r="31"/><circle cx="860" cy="815" r="31"/><circle cx="963" cy="815" r="31"/><circle cx="190" cy="918" r="31"/><circle cx="293" cy="918" r="31"/><circle cx="396" cy="918" r="31"/><circle cx="499" cy="918" r="31"/><circle cx="602" cy="918" r="31"/><circle cx="705" cy="918" r="31"/><circle cx="808" cy="918" r="31"/><circle cx="911" cy="918" r="31"/><circle cx="1014" cy="918" r="31"/>
  </g>
  ${beutel(392, 512, 416, 276)}
  <g fill="none" stroke="${AKZENT}" stroke-width="${STRICH - 1}" stroke-linecap="round">
    <path d="${welle(520, 470, 200)}"/>
    <path d="${welle(680, 470, 200)}"/>
  </g>`);

fs.writeFileSync('pikto-a.svg', A);
fs.writeFileSync('pikto-b.svg', B);
fs.writeFileSync('pikto-c.svg', C);
fs.writeFileSync('pikto-d.svg', D);
console.log('vier Piktogramme geschrieben');

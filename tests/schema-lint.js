// Prueft die Schemata aller Abschnitte auf Fehler, die Shopify beim Speichern oder
// Synchronisieren ablehnt. Ein abgelehnter Abschnitt wird still NICHT
// uebernommen, die Seite sieht dann aus wie vorher (so geschehen am 17. November:
// ein Zahlenfeld mit Standardwert 2,25).
//
//  - Zahlenfelder: Standardwert hoechstens eine Dezimalstelle
//  - Name von Abschnitt und Block: hoechstens 25 Zeichen (t:-Verweise ausgenommen)
//  - Setting-IDs: je Abschnitt und je Block eindeutig
//  - Bloecke: hoechstens 50 je Abschnitt
const fs = require('fs');
const path = require('path');
const THEME = path.join(__dirname, '..');
let checks = 0, fails = 0;
const fail = (m) => { fails++; console.log('FEHLER ' + m); };

for (const f of fs.readdirSync(path.join(THEME, 'sections')).filter((n) => n.endsWith('.liquid'))) {
  const src = fs.readFileSync(path.join(THEME, 'sections', f), 'utf8');
  const m = src.match(/\{%-?\s*schema\s*-?%\}([\s\S]*?)\{%-?\s*endschema\s*-?%\}/);
  if (!m) continue;
  let j;
  try { j = JSON.parse(m[1]); } catch (e) { checks++; fail(f + ': Schema ist kein gueltiges JSON (' + e.message + ')'); continue; }

  const pruefe = (liste, wo) => {
    const ids = new Set();
    for (const s of liste || []) {
      if (!s.id) continue;
      checks++;
      if (ids.has(s.id)) fail(f + ' ' + wo + ': doppelte ID "' + s.id + '"');
      ids.add(s.id);
      if (s.type === 'number' && typeof s.default === 'number') {
        checks++;
        const dez = (String(s.default).split('.')[1] || '').length;
        if (dez > 1) fail(f + ' ' + wo + ': Zahlenfeld "' + s.id + '" hat Standardwert ' + s.default + ' (hoechstens eine Dezimalstelle; Betraege in Cent angeben)');
      }
    }
  };
  pruefe(j.settings, 'Abschnitt');
  checks++;
  if ((j.blocks || []).length > 50) fail(f + ': mehr als 50 Bloecke');
  if (typeof j.name === 'string' && !j.name.startsWith('t:')) { checks++; if (j.name.length > 25) fail(f + ': Abschnittsname laenger als 25 Zeichen: ' + j.name); }
  for (const b of j.blocks || []) {
    if (typeof b.name === 'string' && !b.name.startsWith('t:')) { checks++; if (b.name.length > 25) fail(f + ' Block ' + b.type + ': Name laenger als 25 Zeichen: ' + b.name); }
    pruefe(b.settings, 'Block ' + b.type);
  }
}
console.log('\n' + (checks - fails) + '/' + checks + ' Pruefungen bestanden, ' + fails + ' Fehler.');
process.exit(fails ? 1 : 0);

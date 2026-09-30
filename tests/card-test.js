// Prueft das eingebaute specimen-card-fields.liquid gegen die echten Sprachdateien.
const fs = require('fs');
const path = require('path');
const { Liquid } = require('liquidjs');

const THEME = path.join(__dirname, '..');
const strip = s => s.replace(/^\s*\/\*[\s\S]*?\*\//, '');
const LOC = {
  de: JSON.parse(strip(fs.readFileSync(path.join(THEME, 'locales/de.json'), 'utf8'))),
  en: JSON.parse(strip(fs.readFileSync(path.join(THEME, 'locales/en.default.json'), 'utf8'))),
};
let locale = 'de';
const engine = new Liquid({ root: path.join(THEME, 'snippets'), extname: '.liquid' });
engine.registerFilter('t', function (key, ...rest) {
  const opts = {};
  for (const r of rest) {
    if (Array.isArray(r) && typeof r[0] === 'string') opts[r[0]] = r[1];
    else if (r && typeof r === 'object') Object.assign(opts, r);
  }
  let hit = String(key).split('.').reduce((o, k) => (o == null ? undefined : o[k]), LOC[locale]);
  if (hit === undefined) throw new Error('FEHLENDER Schluessel [' + locale + ']: ' + key);
  if (hit && typeof hit === 'object') hit = Number(opts.count) === 1 ? hit.one : hit.other;
  for (const [k, v] of Object.entries(opts)) hit = hit.split('{{ ' + k + ' }}').join(String(v));
  if (/\{\{/.test(hit)) throw new Error('Platzhalter nicht ersetzt: ' + key);
  return hit;
});

const mf = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { value: v }]));
const mutter = (b, gen) => ({ bezeichnung: { value: b }, generation: { value: gen || null } });

const faelle = [
  { name: 'Die drei Hauptpunkte', available: true,
    titel: 'Anthurium Papillilaminum Marie',
    mf: mf({ specimen_id: 'TNG-0147', mutterpflanze: mutter('Anthurium papillilaminum × forgetii'),
             stadium: 'Steckling', generation: 'F2', blattlaenge_cm: 12 }),
    erwartet: ['TNG-0147', 'Anthurium papillilaminum × forgetii', 'Steckling · Generation F2 · 12 cm', 'available', 'Verfügbar'] },

  // Der Doppelname, den Tung gemeldet hat.
  { name: 'Mutterpflanze heisst wie das Produkt — Zeile muss wegfallen', available: true,
    titel: 'Anthurium Ralph Lynam x Fort Sherman F2 #4',
    mf: mf({ specimen_id: 'TNG-0147', mutterpflanze: mutter('Anthurium Ralph Lynam × Fort Sherman F2'),
             stadium: 'Steckling', generation: 'F2' }),
    erwartet: ['TNG-0147', '', 'Steckling · Generation F2', 'available', 'Verfügbar'] },

  { name: 'Apostrophe und Nummer duerfen die Erkennung nicht stoeren', available: true,
    titel: "Anthurium Black Widow '13' x '43' #2",
    mf: mf({ mutterpflanze: mutter('Anthurium Black Widow 13 x 43'), stadium: 'Etabliert' }),
    erwartet: ['', '', 'Etabliert', 'available', 'Verfügbar'] },

  { name: 'Anderer Name — Kreuzung bleibt stehen', available: true,
    titel: 'Anthurium Schwarze Perle',
    mf: mf({ mutterpflanze: mutter('Anthurium luxurians × dressleri'), stadium: 'Jungpflanze' }),
    erwartet: ['', 'Anthurium luxurians × dressleri', 'Jungpflanze', 'available', 'Verfügbar'] },

  { name: 'Verkauft, nur Groesse', available: false,
    titel: 'Anthurium Regale',
    mf: mf({ specimen_id: 'TNG-0104', blattlaenge_cm: 34 }),
    erwartet: ['TNG-0104', '', '34 cm', 'sold', 'Verkauft'] },

  { name: 'Species — reine Art, keine Hybride', available: true,
    titel: 'Anthurium Ralph Lynam OG Clone',
    mf: mf({ generation: 'Species', stadium: 'Etabliert' }),
    erwartet: ['', '', 'Etabliert · Species', 'available', 'Verfügbar'],
    verboten: ['Generation Species'] },

  { name: 'Selbstungsgeneration', available: true,
    titel: 'Anthurium Testpflanze',
    mf: mf({ generation: 'S2' }),
    erwartet: ['', '', 'Generation S2', 'available', 'Verfügbar'] },

  { name: 'Unbekannt wird uebersetzt', available: true,
    titel: 'Anthurium Testpflanze',
    mf: mf({ generation: 'Unbekannt' }),
    erwartet: ['', '', 'Generation unbekannt', 'available', 'Verfügbar'] },

  { name: 'Karte erbt Generation von der Mutter', available: true,
    titel: 'Anthurium Schwarze Perle',
    mf: mf({ mutterpflanze: mutter('Anthurium luxurians × dressleri', 'F3'), stadium: 'Steckling' }),
    erwartet: ['', 'Anthurium luxurians × dressleri', 'Steckling · Generation F3', 'available', 'Verfügbar'] },

  { name: 'Eigene Generation schlaegt die geerbte', available: true,
    titel: 'Anthurium Schwarze Perle',
    mf: mf({ mutterpflanze: mutter('Anthurium luxurians × dressleri', 'F3'), generation: 'S2' }),
    erwartet: ['', 'Anthurium luxurians × dressleri', 'Generation S2', 'available', 'Verfügbar'],
    verboten: ['Generation F3'] },

  { name: 'Alles leer', available: true,
    titel: 'Anthurium Testpflanze',
    mf: mf({}),
    erwartet: ['', '', '', 'available', 'Verfügbar'] },
];

(async () => {
  let fails = 0, checks = 0;
  for (const f of faelle) {
    for (const loc of ['de', 'en']) {
      locale = loc;
      let payload;
      try {
        payload = (await engine.renderFile('specimen-card-fields', {
          product: { metafields: { custom: f.mf }, available: f.available, title: f.titel },
        })).trim();
      } catch (e) { fails++; checks++; console.log('FEHLER [' + loc + '] ' + f.name + ': ' + e.message); continue; }

      const parts = payload.split('||').map(s => s.trim());
      checks++;
      if (parts.length !== 5) { fails++; console.log('FEHLER ' + f.name + ': ' + parts.length + ' Teile statt 5'); continue; }

      if (loc === 'de') {
        f.erwartet.forEach((e, i) => {
          checks++;
          if (parts[i] !== e) { fails++; console.log('FEHLER ' + f.name + ' Feld ' + i + ': "' + parts[i] + '" statt "' + e + '"'); }
        });
        (f.verboten || []).forEach(v => { checks++; if (payload.includes(v)) { fails++; console.log('FEHLER ' + f.name + ': enthaelt "' + v + '"'); } });
        if (process.env.ZEIGE) console.log(f.name.padEnd(48) + ' -> ' + JSON.stringify(parts));
      } else {
        checks++;
        if (/Verfügbar|Verkauft|Sämling|Steckling|Jungpflanze|Unbekannt/.test(payload)) {
          fails++; console.log('FEHLER [en] ' + f.name + ': deutscher Text -> ' + payload);
        }
      }
    }
  }
  console.log('\n' + (checks - fails) + '/' + checks + ' Pruefungen bestanden, ' + fails + ' Fehler.');
  process.exit(fails ? 1 : 0);
})();

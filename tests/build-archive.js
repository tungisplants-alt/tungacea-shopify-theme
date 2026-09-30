// Rohbau-Vorschau: Archiv-Galerie und Pflanzenseite.
//
// Liest die sechs echten Archivkarten aus templates/page.archive.json, bildet sie
// auf die vorgeschlagene Metaobjekt-Form ab und rendert die AUSGELIEFERTEN
// Snippets damit. Keine nachgebauten Snippets, keine eigene Stringtabelle — die
// Sprachdateien des Themes werden gelesen.
//
// Ergebnis: archiv-vorschau.html
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
engine.registerFilter('asset_url', v => '/assets/' + v);
engine.registerFilter('stylesheet_tag', v => '<link rel="stylesheet" href="' + v + '">');
engine.registerFilter('money', v => (Number(v) / 100).toFixed(2).replace('.', ',') + ' €');
engine.registerFilter('placeholder_svg_tag', (v, cls) =>
  '<svg class="' + (cls || '') + '" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="kein Bild">' +
  '<rect width="100" height="100" fill="rgba(255,255,255,0.05)"/></svg>');
engine.registerFilter('image_url', function (v, ...rest) {
  const w = (rest.find(r => Array.isArray(r) && r[0] === 'width') || [])[1] || 800;
  const url = typeof v === 'string' ? v : (v && v.src) || '';
  return url + (url.includes('?') ? '&' : '?') + 'width=' + w;
});
engine.registerFilter('image_tag', function (src, ...rest) {
  const o = {};
  for (const r of rest) if (Array.isArray(r)) o[r[0]] = r[1];
  return '<img src="' + src + '" alt="' + String(o.alt || '').replace(/"/g, '&quot;') +
    '" class="' + (o.class || '') + '" loading="' + (o.loading || 'lazy') + '">';
});
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

// Die echten Bildadressen aus dem Shop, damit die Vorschau Tungs Pflanzen zeigt.
const CDN = 'https://cdn.shopify.com/s/files/1/1062/9349/4085/files/';
const BILD = {
  'D2061F69-B3D6-438D-AD92-07975F7501BE.jpg': CDN + 'D2061F69-B3D6-438D-AD92-07975F7501BE.jpg?v=1784924791',
  'C372B873-FFE4-4B3E-A5C1-DB36AA2BA68D.jpg': CDN + 'C372B873-FFE4-4B3E-A5C1-DB36AA2BA68D.jpg?v=1784967848',
  '97743E5C-1DB6-4A11-8B17-DC3783D54667.jpg': CDN + '97743E5C-1DB6-4A11-8B17-DC3783D54667.jpg?v=1784415468',
  '23D5CF22-57CF-453D-879D-04A5DCE73C77.jpg': CDN + '23D5CF22-57CF-453D-879D-04A5DCE73C77.jpg?v=1784929550',
  'F03A5BDF-0470-4FD2-B89A-DD98DFB53A71.jpg': CDN + 'F03A5BDF-0470-4FD2-B89A-DD98DFB53A71.jpg?v=1784929550',
  'IMG_5703.jpg': CDN + 'IMG_5703.jpg?v=1784498487',
};

// Freitext-Stadium der alten Karten auf die Auswahlwerte abbilden, die Produkt
// und Archiv gemeinsam benutzen. Was nicht passt, wird gemeldet statt geraten.
const STADIUM = {
  'Etablierte Mutterpflanze': 'Mutterpflanze',
  Elternpflanze: 'Mutterpflanze',
  'Elternpflanze - Aktuell in Reha': 'Mutterpflanze',
  Jungpflanze: 'Jungpflanze',
  Juvenil: 'Jungpflanze',
};

const person = (name, ig, land) => ({
  name: { value: name },
  instagram: { value: ig || null },
  land: { value: land || null },
});

const feld = v => ({ value: v === undefined || v === '' ? null : v });

function leseArchivkarten() {
  // Die sechs handgetippten Karten sind historische Eingangsdaten: sie stammen
  // aus templates/page.archive.json, wie es vor der Umstellung aussah (Commit
  // 46c6838a). Seit die Vorlage die Galerie traegt, gibt es sie dort nicht mehr,
  // und ein Griff in die Git-Historie faellt mit jedem neuen Commit anders aus.
  // Deshalb liegen sie hier als Abzug daneben.
  const roh = strip(fs.readFileSync(path.join(__dirname, 'archiv-karten-2026-09-30.json'), 'utf8'));
  const j = JSON.parse(roh);
  const sec = j.sections[j.order[0]];
  const funde = [];
  const eintraege = (sec.block_order || []).map((id, i) => {
    const s = sec.blocks[id].settings || {};
    const datei = String(s.image || '').split('/').pop();
    const url = BILD[datei];
    if (s.image && !url) funde.push('Karte ' + (i + 1) + ': Bild ' + datei + ' nicht zugeordnet');

    const stadium = STADIUM[s.growth_stage];
    if (s.growth_stage && !stadium) funde.push('Karte ' + (i + 1) + ': Stadium "' + s.growth_stage + '" passt auf keinen Auswahlwert');

    // Die alte Karte 5 trug unter "Seltenheit" tatsaechlich Herkunftsgeschichte.
    // Sie wandert in die Notiz, statt ein Feld wiederzubeleben, das Tung gestrichen hat.
    // Die alten Karten trugen HTML; das Feld ist seit dem Umbau Klartext.
    // Ohne diese Umwandlung zeigt die Vorschau Marken, die es live nicht gibt.
    const alsText = (h) => String(h || '')
      .replace(/<\/p>\s*<p>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();

    let notiz = alsText(s.notes);
    if (s.rarity && !/hybrid mit individuell|individueller sämling|einzigartiger sämling/i.test(s.rarity)) {
      notiz += (notiz ? '\n\n' : '') + s.rarity.trim();
      funde.push('Karte ' + (i + 1) + ': "Seltenheit" enthielt Herkunftsgeschichte, nach Notiz verschoben');
    }
    // Ein Zustandszusatz im Stadium gehoert in Text, nicht in einen Auswahlwert.
    if (/Reha/i.test(s.growth_stage || '')) {
      notiz += (notiz ? '\n\n' : '') + 'Aktuell in Reha.';
      funde.push('Karte ' + (i + 1) + ': "Aktuell in Reha" ist ein Zustand, kein Stadium — nach Notiz verschoben');
    }

    return {
      bezeichnung: feld(s.name),
      kreuzung: feld(s.parentage),
      generation: feld(/F2/.test(s.name || '') ? 'F2' : null),
      stadium: feld(stadium),
      merkmal: feld(s.primary_trait),
      notiz: feld(notiz || null),
      mutter_id: feld(s.plant_id),
      zuechter: feld(s.breeder ? person(s.breeder, null, s.origin) : null),
      besitzer: feld(null),
      fotos: { value: url ? [url] : [] },
      fotograf: feld(null),
      bildfreigabe: feld(null),
      angebote: { value: [] },
      system: { url: '/pages/archiv/' + (i + 1) },
    };
  });
  return { eintraege, funde };
}

(async () => {
  const { eintraege, funde } = leseArchivkarten();

  // Fall B zum Ansehen: dieselbe Pflanze, aber bei Dritten und ohne Bildfreigabe.
  const fremd = JSON.parse(JSON.stringify(eintraege[2]));
  fremd.besitzer = feld(person('secretfoliage', '@secretfoliage', 'Niederlande'));
  fremd.fotograf = feld(person('secretfoliage', '@secretfoliage', 'Niederlande'));
  fremd.bildfreigabe = feld(false);
  // Unverwechselbarer Name, damit die Gegenprobe an der Kachel misst und nicht
  // am Zuechternamen — den gibt es zu Recht auch als Schalter in der Suchleiste.
  fremd.bezeichnung = feld('Beispielpflanze bei Dritten');

  // Fall B mit Freigabe: Fotos erscheinen, mit Nennung.
  const fremdOk = JSON.parse(JSON.stringify(fremd));
  fremdOk.bildfreigabe = feld(true);

  // Eigene Pflanze, deren Produkte die Seite SELBST findet: kein angebote-Feld,
  // sondern Produkte, deren Feld mutterpflanze auf diesen Eintrag zeigt.
  eintraege.forEach((e, i) => { e.system.handle = 'pflanze-' + (i + 1); });
  const mitAngebot = eintraege[0];

  const LADEN = [
    { title: 'Anthurium Ralph Lynam x Fort Sherman F2 #4', url: '/products/rlfs-4', available: true, price: 29900,
      metafields: { custom: { mutterpflanze: { value: { system: { handle: 'pflanze-1' } } } } } },
    { title: 'Anthurium Ralph Lynam x Fort Sherman F2 #1', url: '/products/rlfs-1', available: false, price: 0,
      metafields: { custom: { mutterpflanze: { value: { system: { handle: 'pflanze-1' } } } } } },
    { title: 'Anthurium Luxurians x Dressleri', url: '/products/lux', available: true, price: 18000,
      metafields: { custom: { mutterpflanze: { value: { system: { handle: 'pflanze-3' } } } } } },
  ];
  const mitFremder = eintraege.concat([fremd]);
  const galerie = await engine.renderFile('plant-archive-gallery', { eintraege: mitFremder, produkte: LADEN });

  const mutterMitSeite = {
    bezeichnung: { value: 'Anthurium Ralph Lynam × Fort Sherman F2' },
    besitzer: { value: null }, fotograf: { value: null }, bildfreigabe: { value: null },
    fotos: { value: [BILD['D2061F69-B3D6-438D-AD92-07975F7501BE.jpg']] },
    system: { url: '/pflanzen/anthurium-ralph-lynam-x-fort-sherman-f2' },
  };
  const seiteProdukt = await engine.renderFile('specimen-passport', {
    product: { metafields: { custom: {
      lieferumfang: { value: 'Cutting der Mutterpflanze' },
      bewurzelung: { value: 'Unbewurzelt' },
      stadium: { value: 'Steckling' },
      generation: { value: 'F2' },
      blattlaenge_cm: { value: 10 },
      specimen_id: { value: 'TA-1001' },
      mutterpflanze: { value: mutterMitSeite },
      zuechter: { value: person('Tofusprinkles', null, 'USA') },
    } } },
    block: { id: 'b1', shopify_attributes: '' },
  });
  if (!seiteProdukt.includes('specimen-mother-link')) {
    console.error('FEHLER: der Knopf fehlt in der Produktvorschau.');
    process.exit(1);
  }
  const kacheln = (galerie.match(/class="plant-card"/g) || []).length;
  if (kacheln !== eintraege.length) {
    console.error('FEHLER: ' + kacheln + ' Kacheln bei ' + mitFremder.length + ' Eintraegen — der Filter greift nicht.');
    process.exit(1);
  }
  if (galerie.includes('Beispielpflanze bei Dritten')) {
    console.error('FEHLER: die fremde Pflanze steht in der Galerie.');
    process.exit(1);
  }
  const seiteEigen = await engine.renderFile('plant-profile', { eintrag: mitAngebot, produkte: LADEN });
  const seiteFremdGesperrt = await engine.renderFile('plant-profile', { eintrag: fremd, produkte: LADEN });
  const seiteFremdFrei = await engine.renderFile('plant-profile', { eintrag: fremdOk, produkte: LADEN });

  const css = ['tungacea.css', 'base.css', 'component-plant-archive.css', 'component-specimen-passport.css', 'component-specimen-card.css']
    .map(f => {
      const p = path.join(THEME, 'assets', f);
      return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
    })
    .join('\n');

  const abschnitt = (nr, titel, hinweis, html) => `
  <section class="rohbau-block">
    <div class="rohbau-kopf">
      <span class="rohbau-nr">${nr}</span>
      <h2>${titel}</h2>
      <p>${hinweis}</p>
    </div>
    <div class="rohbau-buehne">${html}</div>
  </section>`;

  const seite = `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rohbau — Archiv und Pflanzenseiten</title>
<style>
${css}
html { font-size: 62.5%; }
body { margin: 0; background: #151517; color: #f2eee8;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; font-size: 1.6rem; }
.page-width { max-width: 120rem; margin: 0 auto; padding: 0 2.4rem; }
.rohbau-block { border-top: 1px solid rgba(242,238,232,0.14); padding: 5.6rem 0; }
.rohbau-kopf { max-width: 120rem; margin: 0 auto 3.2rem; padding: 0 2.4rem; }
.rohbau-nr { display: inline-block; font-size: 1.1rem; letter-spacing: 0.2em;
  color: #cc6070; border: 1px solid rgba(204,96,112,0.4); padding: 0.3rem 0.8rem; margin-bottom: 1.2rem; }
.rohbau-kopf h2 { margin: 0 0 0.6rem; font-size: 2.2rem; font-weight: 500; }
.rohbau-kopf p { margin: 0; color: rgba(205,198,188,0.8); font-size: 1.4rem; max-width: 70rem; }
.rohbau-titel { padding-top: 6.4rem; padding-bottom: 1.6rem; }
.rohbau-titel h1 { margin: 0 0 0.8rem; font-size: 3.2rem; font-weight: 500; }
.rohbau-titel p { margin: 0; color: rgba(205,198,188,0.8); max-width: 70rem; }
.rohbau-funde { margin: 2.4rem 0 0; padding: 1.6rem 2rem; border-left: 2px solid #cc6070;
  background: rgba(204,96,112,0.06); font-size: 1.4rem; }
.rohbau-funde ul { margin: 0.8rem 0 0; padding-left: 1.8rem; color: rgba(205,198,188,0.9); }
.rohbau-funde li { margin-bottom: 0.4rem; }
.rte p { margin: 0 0 1.2rem; }
h1,h2,h3 { font-weight: 500; }
</style></head><body>
<div class="page-width rohbau-titel">
  <h1>Rohbau — Archiv als Galerie, Pflanzen mit eigener Seite</h1>
  <p>Gerendert aus den ausgelieferten Snippets und deinen echten sechs Archivkarten.
  Im Shop ist noch nichts angelegt und nichts geändert.</p>
  ${funde.length ? '<div class="rohbau-funde"><strong>Beim Abbilden aufgefallen:</strong><ul>' +
    funde.map(f => '<li>' + f + '</li>').join('') + '</ul></div>' : ''}
</div>
${abschnitt(0, 'NEU — der Knopf auf der Produktseite', 'Unter dem Mutterblock, leiser als "In den Warenkorb". Er erscheint nur, wenn die Mutterpflanze wirklich eine eigene Seite hat.', seiteProdukt)}
${abschnitt(1, 'Die Galerie', 'Sechs Kacheln, jede anklickbar. Hochformat 4:5 wie die Mutterfotos am Produkt. Der Name ist der Link, die ganze Kachel ist das Klickziel.', galerie)}
${abschnitt(2, 'Eigene Pflanze — die Seite dahinter', 'Fotos, dein Merkmalssatz, die Tatsachen, deine Notiz. Unten der Rückweg: welche Angebote von dieser Pflanze stammen.', seiteEigen)}
${abschnitt(3, 'Fremde Pflanze OHNE Bildfreigabe', 'Erfundenes Beispiel. Die Pflanze wird genannt, die Fotos erscheinen nicht — dieselbe Sperre wie am Produkt. Diese Pflanze fehlt oben in der Galerie, und das ist Absicht.', seiteFremdGesperrt)}
${abschnitt(4, 'Dieselbe Pflanze MIT Bildfreigabe', 'Erfundenes Beispiel. Jetzt erscheinen die Fotos, mit Nennung des Fotografen.', seiteFremdFrei)}
</body></html>`;

  const ziel = path.join(__dirname, 'archiv-vorschau.html');
  fs.writeFileSync(ziel, seite);
  console.log('geschrieben: ' + ziel);
  console.log('Gegenprobe: ' + mitFremder.length + ' Einträge hinein, ' + kacheln + ' Kacheln heraus — die fremde Pflanze ist gefiltert.');
  console.log(eintraege.length + ' Einträge abgebildet, ' + funde.length + ' Auffälligkeiten:');
  funde.forEach(f => console.log('  - ' + f));
})();

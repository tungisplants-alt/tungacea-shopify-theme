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
engine.registerFilter('stylesheet_tag', () => '');
engine.registerFilter('image_url', function(v,...r){const w=(r.find(x=>Array.isArray(x)&&x[0]==='width')||[])[1]||480;return String(v)+'&width='+w;});
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
  return hit;
});

const person = (n, ig) => ({ name: { value: n }, instagram: { value: ig || null } });
const F=['https://cdn.shopify.com/s/files/1/1062/9349/4085/files/DCCFFEF4-8348-4E2F-A47B-AA1252A55363.jpg?v=1790464665','https://cdn.shopify.com/s/files/1/1062/9349/4085/files/30FB627E-281F-44BC-A6EC-B429E57E4B81.jpg?v=1790464664','https://cdn.shopify.com/s/files/1/1062/9349/4085/files/66D3254C-CAA5-4D89-A32C-FD6A8FF38D79.jpg?v=1790464556'];
const mutter = (b, bes, fot, fotos, frei) => ({ bezeichnung: { value: b }, besitzer: { value: bes || null }, fotograf: { value: fot || null }, fotos: { value: fotos || [] }, bildfreigabe: { value: frei === undefined ? null : frei } });
const mf = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { value: v }]));
const grower = person('Tropical Grower', '@tropicalgrower');
const ree = person('Ree Gardens', null);

const faelle = [
  ['Cutting · fremde Mutterpflanze · fremdes Foto', mf({
    lieferumfang: 'Cutting der Mutterpflanze', bewurzelung: 'Frisch bewurzelt',
    stadium: 'Steckling', generation: 'F2', blattlaenge_cm: 12, specimen_id: 'TNG-0147',
    mutterpflanze: mutter('Anthurium papillilaminum × forgetii', grower, grower, F, true),
    zuechter: ree, bezogen_von: grower })],
  ['Eigenes Exemplar · eigene Mutterpflanze · mit Aufnahmedatum', mf({
    lieferumfang: 'Dieses Exemplar', bewurzelung: 'Gut bewurzelt',
    stadium: 'Etabliert', generation: 'F1', blattlaenge_cm: 28, specimen_id: 'TNG-0151',
    aufnahmedatum: new Date('2026-09-26T00:00:00Z'),
    mutterpflanze: mutter('Anthurium luxurians × dressleri', null, null, F),
    zuechter: person('Tungacea', null) })],
  ['Unbewurzelt · strengerer Hinweis', mf({
    lieferumfang: 'Cutting der Mutterpflanze', stadium: 'Steckling', bewurzelung: 'Unbewurzelt', 
    specimen_id: 'TNG-0104' })],
  ['Fast nichts ausgefüllt', mf({ lieferumfang: 'Dieses Exemplar', blattlaenge_cm: 18 })],
];

(async () => {
  const css = ['base.css', 'tungacea.css', 'component-specimen-passport.css']
    .map(f => '/* ' + f + ' */\n' + fs.readFileSync(path.join(THEME, 'assets', f), 'utf8')).join('\n');

  const panes = {};
  for (const loc of ['de', 'en']) {
    locale = loc;
    const parts = [];
    for (const [titel, m] of faelle) {
      const html = await engine.renderFile('specimen-passport', {
        product: { metafields: { custom: m } }, block: { id: 'b1', shopify_attributes: '' },
      });
      parts.push('<div class="cell"><p class="cell__note">' + titel + '</p>' + html + '</div>');
    }
    panes[loc] = parts.join('\n');
  }

  const head = `
:root{
  --color-background:10,10,10; --color-foreground:242,238,232;
  --font-body-family:'Jost',sans-serif; --font-heading-family:'Cormorant',serif;
  --font-body-scale:1; --font-heading-scale:1.3; --font-body-weight:400;
}
html{font-size:62.5%;}
body{background:#0a0a0a;color:#f2eee8;font-family:'Jost',sans-serif;margin:0;}
.shell{max-width:1200px;margin:0 auto;padding:4.8rem 2.4rem 9rem;}
.head{border-bottom:1px solid rgba(242,238,232,.14);padding-bottom:2.8rem;margin-bottom:2rem;}
.head h1{font-family:'Cormorant',serif;font-weight:400;font-size:3.4rem;margin:0 0 1rem;}
.head p{font-size:1.4rem;line-height:1.7;color:rgba(205,198,188,.88);margin:0;max-width:74ch;}
.bar{display:flex;gap:.8rem;padding:1.6rem 0 3.2rem;}
.bar button{font-family:'Jost',sans-serif;text-transform:uppercase;letter-spacing:.18em;font-size:1.1rem;
  padding:.9rem 1.6rem;background:transparent;color:rgba(205,198,188,.88);
  border:1px solid rgba(242,238,232,.14);cursor:pointer;}
.bar button[aria-pressed="true"]{background:rgb(150,45,58);border-color:rgb(150,45,58);color:#f7f3ee;}
.grid{display:grid;grid-template-columns:1fr;gap:5.6rem;}
@media(min-width:960px){.grid{grid-template-columns:1fr 1fr;gap:4.8rem 5.6rem;}}
.cell__note{font-size:1.1rem;line-height:1.5;color:rgba(185,178,169,.62);margin:0 0 1.2rem;
  text-transform:uppercase;letter-spacing:.12em;}
[hidden]{display:none!important;}
`;

  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tungacea — Botanische Dokumentation</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,300;0,400;0,500;1,400&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
<style>${head}</style><style>${css}</style></head><body>
<div class="shell">
<div class="head"><h1>Botanische Dokumentation</h1>
<p>Gerendert aus dem eingebauten Snippet <code>specimen-passport.liquid</code> mit den echten
Sprachdateien des Themes. Jeder Satz entsteht aus Klickwerten — es ist kein Fliesstext hinterlegt.
Leere Felder erzeugen keine Zeile.</p></div>
<div class="bar">
<button type="button" data-lang="de" aria-pressed="true">Deutsch</button>
<button type="button" data-lang="en" aria-pressed="false">English</button></div>
<div class="grid" data-pane="de">${panes.de}</div>
<div class="grid" data-pane="en" hidden>${panes.en}</div>
</div>
<script>
document.querySelectorAll('.bar button').forEach(function(b){b.addEventListener('click',function(){
  var l=b.dataset.lang;
  document.querySelectorAll('.bar button').forEach(function(x){x.setAttribute('aria-pressed',String(x.dataset.lang===l));});
  document.querySelectorAll('[data-pane]').forEach(function(p){p.hidden=p.dataset.pane!==l;});
  document.documentElement.lang=l;});});
</script></body></html>`;

  fs.writeFileSync(path.join(__dirname, 'dokumentation-vorschau.html'), html);
  console.log('geschrieben: dokumentation-vorschau.html');
})();

// Prueft die Rechnung des Meilenstein-Skripts (assets/meilenstein-auto.js, Funktion plane) und den
// Datenknoten, den snippets/warenkorb-meilenstein.liquid dafuer ausgibt.
const fs = require('fs');
const path = require('path');
const { Liquid } = require('liquidjs');
const { plane, autoKennungen } = require('../assets/meilenstein-auto.js');
const THEME = path.join(__dirname, '..');
let n = 0, fehler = 0;
const pruefe = (name, ok, info) => { n++; if (!ok) { fehler++; console.log('FEHLER ' + name + (info ? ': ' + JSON.stringify(info) : '')); } };

const BASIS = { auto: true, winterMarke: true, b1: 10000, b2: 15000, maxEtiketten: 15, winterVar: 999, etikettVar: 777, fuerSchluessel: 'Für', zeilen: [] };
const st = (zeilen, extra) => Object.assign({}, BASIS, extra || {}, { zeilen });
const P = (h, c, extra) => Object.assign({ k: 'k-' + h, h, v: 1, q: 1, c, kl: 'pflanze', pk: 1, inkl: false, auto: null, pf: null, t: 'Anthurium ' + h }, extra || {});
const S = (h, c) => ({ k: 'k-' + h, h, v: 2, q: 1, c, kl: 'samen', pk: 4, inkl: false, auto: null, pf: null, t: 'Samen' });
const E = (pf, q, auto) => ({ k: 'e-' + pf + (auto ? '-a' : '-m'), h: 'archiv-etikett', v: 777, q, c: 250 * q, kl: 'etikett', pk: 1, inkl: false, auto: auto ? 'meilenstein' : null, pf, t: 'Pflanzenetikett' });
const W = (auto) => ({ k: 'w' + (auto ? '-a' : '-m'), h: 'winterverpackung', v: 999, q: 1, c: 390, kl: 'winter', pk: 1, inkl: false, auto: auto ? 'meilenstein' : null, pf: null, t: 'Winterverpackung' });
const arten = (p) => p.aktionen.map((a) => a.art + ':' + (a.kennung)).sort();

// Winterpackung
pruefe('60 €: nichts zu tun', plane(st([P('a', 6000)])).aktionen.length === 0);
let p = plane(st([P('a', 10000)]));
pruefe('100 €: Winterpackung wird gelegt (Variante 999, Menge 1, Markierung)', p.aktionen.some((a) => a.art === 'add' && a.id === 999 && a.menge === 1 && a.eig._auto === 'meilenstein'));
pruefe('Winterpackung liegt schon (vom Kunden): nichts', plane(st([P('a', 10000), W(false)])).aktionen.length === 0);
pruefe('Winterpackung automatisch da, Marke weiter erreicht: nichts', plane(st([P('a', 10000), W(true)])).aktionen.length === 0);
p = plane(st([P('a', 8000), W(true)]));
pruefe('Unter der Marke: automatische Winterpackung geht', p.aktionen.length === 1 && p.aktionen[0].art === 'set' && p.aktionen[0].menge === 0 && p.aktionen[0].key === 'w-a');
pruefe('Unter der Marke: manuelle Winterpackung bleibt', plane(st([P('a', 8000), W(false)])).aktionen.length === 0);
pruefe('Abgewaehlt: kommt nicht wieder', plane(st([P('a', 10000)]), { w: true }).aktionen.length === 0);
pruefe('Marke faellt weg: Abwahl wird vergessen', !('w' in plane(st([P('a', 5000)]), { w: true }).aus));
pruefe('Winter-Marke aus (Sommer): keine Winterpackung', plane(st([P('a', 20000)], { winterMarke: false })).aktionen.every((a) => a.id !== 999));
pruefe('Samen zaehlen nicht zum Wert (80 € Pflanze + 200 € Samen)', plane(st([P('a', 8000), S('s', 20000)])).aktionen.length === 0);

// Etiketten
p = plane(st([P('a', 7000), P('b', 8000)]));
pruefe('150 €, zwei Pflanzen: zwei automatische Etiketten mit Namen', p.aktionen.filter((a) => a.art === 'add' && a.id === 777).length === 2 && p.aktionen.some((a) => a.eig._pflanze === 'a' && a.eig['Für'] === 'Anthurium a' && a.eig._auto === 'meilenstein' && a.menge === 1));
pruefe('150 €: auch die Winterpackung kommt dazu', p.aktionen.some((a) => a.id === 999));
pruefe('Pflanze ab 100 € je Stueck (inklusive): kein Etikett', plane(st([P('a', 15000, { inkl: true })])).aktionen.every((a) => a.id !== 777));
pruefe('Samen bekommen kein automatisches Etikett', plane(st([P('a', 15000, { inkl: true }), S('s', 3500)])).aktionen.every((a) => a.id !== 777));
pruefe('Kunde hat das Etikett schon selbst gelegt: nichts dazu', plane(st([P('a', 7000), P('b', 8000), E('a', 1, false)])).aktionen.filter((a) => a.id === 777).length === 1);
p = plane(st([P('a', 15000, { q: 1, pk: 4 })]));
pruefe('Packung 4x: vier Etiketten', p.aktionen.some((a) => a.id === 777 && a.menge === 4));
pruefe('Packung 4x, eines vom Kunden: drei', plane(st([P('a', 15000, { pk: 4 }), E('a', 1, false)])).aktionen.some((a) => a.id === 777 && a.menge === 3));
const viele = Array.from({ length: 20 }, (_, i) => i + 1).map((i) => P('p' + String(i).padStart(2, '0'), 1500));
p = plane(st(viele));
pruefe('Hoechstens 15 automatische Etiketten', p.aktionen.filter((a) => a.id === 777).reduce((s, a) => s + a.menge, 0) === 15);
p = plane(st([P('a', 7000), P('b', 8000), E('a', 1, true), E('b', 2, true)]));
const nurSet = p.aktionen.filter((a) => a.art === 'set');
pruefe('Automatisches Etikett mit falscher Menge wird angepasst', nurSet.length === 1 && nurSet[0].key === 'e-b-a' && nurSet[0].menge === 1);
p = plane(st([P('a', 7000), E('a', 1, true), E('b', 1, true)]));
pruefe('Etikett fuer entfernte Pflanze geht', p.aktionen.some((a) => a.key === 'e-b-a' && a.menge === 0));
p = plane(st([P('a', 8000), E('a', 1, true)]));
pruefe('Unter der Marke (80 €): automatische Etiketten gehen, manuelle bleiben', p.aktionen.length === 1 && p.aktionen[0].key === 'e-a-a' && plane(st([P('a', 8000), E('a', 1, false)])).aktionen.length === 0);
pruefe('Abgewaehltes Etikett kommt nicht wieder', plane(st([P('a', 7000), P('b', 8000)]), { 'e:a': true }).aktionen.filter((a) => a.id === 777).length === 1);
pruefe('Ohne Etikett-Variante: nichts', plane(st([P('a', 15000)]), {}).aktionen.length > 0 && plane(Object.assign(st([P('a', 7000), P('b', 8000)]), { etikettVar: 0 })).aktionen.every((a) => a.id !== 777));
pruefe('autoKennungen findet Winterpackung und Etiketten', JSON.stringify(Object.keys(autoKennungen(st([W(true), E('a', 1, true), E('b', 1, false)]))).sort()) === JSON.stringify(['e:a', 'w']));

// Idempotenz: nach dem Anwenden des Plans bleibt nichts uebrig
function anwenden(stand, plan) {
  const z = stand.zeilen.map((x) => Object.assign({}, x));
  plan.aktionen.forEach((a) => {
    if (a.art === 'set') { const i = z.findIndex((x) => x.k === a.key); if (a.menge === 0) z.splice(i, 1); else z[i].q = a.menge; }
    else if (a.id === 999) z.push(W(true));
    else z.push(E(a.eig._pflanze, a.menge, true));
  });
  return Object.assign({}, stand, { zeilen: z });
}
for (const zeilen of [[P('a', 7000), P('b', 8000)], [P('a', 10000), S('s', 3500)], [P('a', 15000, { pk: 4 })], viele]) {
  const s1 = st(zeilen);
  const p1 = plane(s1);
  const s2 = anwenden(s1, p1);
  pruefe('Idempotent: nach dem Plan nichts mehr zu tun', plane(s2).aktionen.length === 0, plane(s2).aktionen);
}

// Datenknoten aus dem Liquid
(async () => {
  const strip = (s) => s.replace(/^\s*\/\*[\s\S]*?\*\//, '');
  const LOC = JSON.parse(strip(fs.readFileSync(path.join(THEME, 'locales/de.json'), 'utf8')));
  const engine = new Liquid({ root: path.join(THEME, 'snippets'), extname: '.liquid' });
  engine.registerFilter('asset_url', (v) => '/assets/' + v);
  engine.registerFilter('stylesheet_tag', (v) => '<link href="' + v + '">');
  engine.registerFilter('money_without_trailing_zeros', (v) => (Number(v) / 100).toFixed(2).replace('.', ',').replace(',00', '') + '€');
  engine.registerFilter('t', function (key, ...rest) {
    const opts = {};
    for (const r of rest) { if (Array.isArray(r) && typeof r[0] === 'string') opts[r[0]] = r[1]; }
    let hit = String(key).split('.').reduce((o, k) => (o == null ? undefined : o[k]), LOC);
    if (hit === undefined) throw new Error('FEHLENDER Schluessel: ' + key);
    for (const [k, v] of Object.entries(opts)) hit = hit.split('{{ ' + k + ' }}').join(String(v));
    return hit;
  });
  const mf = (u) => ({ custom: { lieferumfang: u ? { value: u } : null } });
  const item = (h, u, preis, extra) => Object.assign({ key: 'key-' + h, product: { handle: h, title: 'Titel ' + h, metafields: mf(u) }, variant: { price: preis, option1: 'A' }, variant_id: 11, quantity: 1, original_line_price: preis, properties: {} }, extra || {});
  const items = [item('p1', 'Dieses Exemplar', 8000), item('s1', 'Gekeimter Samen aus dieser Kreuzung', 3500, { variant: { price: 3500, option1: '4x' } }), item('archiv-etikett', null, 250, { properties: { _auto: 'meilenstein', _pflanze: 'p1' } }), item('winterverpackung', null, 390)];
  const gesamt = items.reduce((s, i) => s + i.original_line_price, 0);
  const render = (settings) => engine.renderFile('warenkorb-meilenstein', {
    cart: { items, item_count: items.length, original_total_price: gesamt },
    all_products: { winterverpackung: { handle: 'winterverpackung', selected_or_first_available_variant: { id: 999, available: true } }, 'archiv-etikett': { handle: 'archiv-etikett', selected_or_first_available_variant: { id: 777, available: true } } },
    settings,
  });
  const html = await render({ meilenstein_auto: true });
  const m = html.match(/<script type="application\/json" data-meilenstein-stand>([\s\S]*?)<\/script>/);
  pruefe('Datenknoten vorhanden', !!m);
  let d = null;
  try { d = JSON.parse(m[1]); } catch (e) { pruefe('Datenknoten ist gueltiges JSON', false, e.message); }
  if (d) {
    pruefe('Datenknoten: Marken und Varianten', d.b1 === 10000 && d.b2 === 15000 && d.winterVar === 999 && d.etikettVar === 777 && d.winterMarke === true && d.auto === true && d.fuerSchluessel === 'Für');
    const kl = Object.fromEntries(d.zeilen.map((z) => [z.h, z.kl]));
    pruefe('Datenknoten: Klassen der Zeilen', kl.p1 === 'pflanze' && kl.s1 === 'samen' && kl['archiv-etikett'] === 'etikett' && kl.winterverpackung === 'winter', kl);
    pruefe('Datenknoten: Auto-Markierung und Pflanzen-Handle am Etikett', d.zeilen.find((z) => z.kl === 'etikett').auto === 'meilenstein' && d.zeilen.find((z) => z.kl === 'etikett').pf === 'p1');
    pruefe('Datenknoten: Pflanze unter 100 € ist nicht "inklusive"', d.zeilen.find((z) => z.h === 'p1').inkl === false);
  }
  pruefe('Ohne die Einstellung gibt es keinen Datenknoten', !(await render({})).includes('data-meilenstein-stand'));
  console.log('\n' + (n - fehler) + '/' + n + ' Pruefungen bestanden, ' + fehler + ' Fehler.');
  process.exit(fehler ? 1 : 0);
})();

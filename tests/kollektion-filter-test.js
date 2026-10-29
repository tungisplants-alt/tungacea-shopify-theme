// Prueft snippets/catalogue-filter.liquid (Telefon-Filter der Kollektion) gegen
// die echten Sprachdateien, mit einer nachgebauten Shopify-Kollektion.
const fs = require('fs');
const path = require('path');
const { Liquid } = require('liquidjs');

const THEME = path.join(__dirname, '..');
const strip = (s) => s.replace(/^\s*\/\*[\s\S]*?\*\//, '');
const LOC = {
  de: JSON.parse(strip(fs.readFileSync(path.join(THEME, 'locales/de.json'), 'utf8'))),
  en: JSON.parse(strip(fs.readFileSync(path.join(THEME, 'locales/en.default.json'), 'utf8'))),
};
let locale = 'de';
const engine = new Liquid({ root: path.join(THEME, 'snippets'), extname: '.liquid' });
engine.registerFilter('asset_url', (v) => '/assets/' + v);
engine.registerFilter('stylesheet_tag', (v) => '<link rel="stylesheet" href="' + v + '">');
engine.registerFilter('money_without_trailing_zeros', (v) => String(Number(v) / 100).replace('.', ',') + ' €');
engine.registerFilter('money_without_currency', (v) => (Number(v) / 100).toFixed(2).replace('.', ','));
engine.registerFilter('t', function (key, ...rest) {
  const opts = {};
  for (const r of rest) {
    if (Array.isArray(r) && typeof r[0] === 'string') opts[r[0]] = r[1];
    else if (r && typeof r === 'object') Object.assign(opts, r);
  }
  let hit = String(key).split('.').reduce((o, k) => (o == null ? undefined : o[k]), LOC[locale]);
  if (hit === undefined) throw new Error('FEHLENDER Schluessel [' + locale + ']: ' + key);
  for (const [k, v] of Object.entries(opts)) hit = hit.split('{{ ' + k + ' }}').join(String(v));
  if (/\{\{/.test(hit)) throw new Error('Platzhalter nicht ersetzt: ' + key);
  return hit;
});

const wert = (param, value, label, count, aktiv) => ({
  param_name: param, value, label, count, active: !!aktiv,
  url_to_add: '/collections/x?' + param + '=' + value, url_to_remove: '/collections/x?ohne=' + value,
});
function kollektion(aktiv = {}) {
  const stadium = ['Steckling', 'Samen', 'Sämling', 'Jungpflanze', 'Etabliert'].map((w, i) =>
    wert('filter.v.m.custom.stadium', w, w, [6, 1, 2, 3, 2][i], aktiv.stadium === w));
  stadium.push(wert('filter.v.m.custom.stadium', 'Mutterpflanze', 'Mutterpflanze', 0, false));
  return {
    url: '/collections/x', products_count: aktiv.stadium ? 6 : 14, all_products_count: 14,
    sort_by: 'created-descending', default_sort_by: 'manual',
    sort_options: [{ name: 'Neueste zuerst', value: 'created-descending' }, { name: 'Preis aufsteigend', value: 'price-ascending' }],
    filters: [
      { type: 'list', label: 'Verfügbarkeit', param_name: 'filter.v.availability', operator: 'OR',
        values: [wert('filter.v.availability', '1', 'Auf Lager', 13, aktiv.vorrat), wert('filter.v.availability', '0', 'Nicht auf Lager', 1, false)],
        active_values: aktiv.vorrat ? [wert('filter.v.availability', '1', 'Auf Lager', 13, true)] : [] },
      { type: 'list', label: 'Stadium', param_name: 'filter.v.m.custom.stadium', operator: 'OR', values: stadium,
        active_values: stadium.filter((v) => v.active) },
      { type: 'price_range', label: 'Preis', param_name: 'filter.v.price', range_max: 34900, url_to_remove: '/collections/x?ohne=preis',
        min_value: { param_name: 'filter.v.price.gte', value: aktiv.preis ? 5000 : null },
        max_value: { param_name: 'filter.v.price.lte', value: aktiv.preis ? 25000 : null }, active_values: [] },
    ],
  };
}
const rendere = (k, extra = {}) => engine.renderFile('catalogue-filter', Object.assign({ results: k, section_id: 'sec1', enable_sorting: true }, extra));

let geprueft = 0;
let fehler = 0;
function pruefe(name, ist, soll) {
  geprueft++;
  if (JSON.stringify(ist) !== JSON.stringify(soll)) {
    fehler++;
    console.log('FEHLER  ' + name + '\n   ist:  ' + JSON.stringify(ist) + '\n   soll: ' + JSON.stringify(soll));
  }
}
const zaehle = (h, m) => (h.match(m) || []).length;

(async () => {
  locale = 'de';
  const h = await rendere(kollektion());
  pruefe('Schnellwahl: Alle + 5 Stadien mit Treffern (Mutterpflanze mit 0 fehlt), kein Verfuegbar-Tab', zaehle(h, /class="catalogue-filter__tab"/g), 6);
  pruefe('Alle ist gewaehlt, wenn nichts aktiv ist', /href="\/collections\/x"\s+aria-current="true"/.test(h), true);
  pruefe('Stadien tragen die uebersetzte Aufschrift, Samen eingeschlossen', ['Steckling/Klon', 'Gekeimter Samen', 'Sämling', 'Jungpflanze', 'Etabliert'].every((w) => h.includes('>' + w + ' <span class="catalogue-filter__tab-count">')), true);
  const reihe = ['Steckling/Klon', 'Etabliert', 'Jungpflanze', 'Sämling', 'Gekeimter Samen'].map((w) => h.indexOf('>' + w + ' <span class="catalogue-filter__tab-count">'));
  pruefe('Reihenfolge der Schnellwahl: Steckling/Klon, Etabliert, Jungpflanze, Saemling, gekeimter Samen', reihe.every((v, i) => v > 0 && (i === 0 || v > reihe[i - 1])), true);
  const blatt = h.slice(h.indexOf('catalogue-filter__sheet'));
  const chips = ['value="Steckling"', 'value="Etabliert"', 'value="Jungpflanze"', 'value="Sämling"', 'value="Samen"'].map((w) => blatt.indexOf(w));
  pruefe('Gleiche Reihenfolge bei den Auswahlfeldern im Blatt', chips.every((v, i) => v > 0 && (i === 0 || v > chips[i - 1])), true);
  pruefe('Kein Verfuegbar-Tab in der Schnellwahl (die Gruppe im Blatt bleibt)', !/catalogue-filter__tab-count">13</.test(h) && /Verfügbarkeit/.test(h), true);
  pruefe('kein Badge ohne Filter', /catalogue-filter__badge/.test(h), false);
  pruefe('Zaehlzeile ohne Filter: 14 Pflanzen', />\s*14 Pflanzen\s*</.test(h), true);
  pruefe('keine aktive Zeile ohne Filter', /catalogue-filter__active"/.test(h), false);
  pruefe('Blatt ist verborgen und ein Dialog', /<div\s+class="catalogue-filter__sheet"[^>]*role="dialog"[^>]*hidden/.test(h), true);
  pruefe('Formular ist GET an die Kollektion', /<form class="catalogue-filter__form" method="get" action="\/collections\/x"/.test(h), true);
  pruefe('Sortierung als Auswahl mit der gewaehlten vorbelegt', /name="sort_by" value="created-descending" checked/.test(h) && !/name="sort_by" value="price-ascending" checked/.test(h), true);
  pruefe('Schalter tragen Parametername und Rohwert (Samen deutsch in value)', /name="filter\.v\.m\.custom\.stadium"\s+value="Samen"/.test(h), true);
  pruefe('Schalter ohne Treffer ist gesperrt', /is-disabled[\s\S]{0,200}value="Mutterpflanze"[\s\S]{0,120}disabled/.test(h), true);
  pruefe('Preisfelder mit Parameternamen und Platzhalter aus der Obergrenze', /name="filter\.v\.price\.gte"/.test(h) && /name="filter\.v\.price\.lte"[\s\S]{0,200}placeholder="349.00"/.test(h), true);
  pruefe('Anwenden-Knopf mit allen vier Saetzen', /data-text-eins="1 Pflanze anzeigen"[\s\S]*data-text-viele="%anzahl% Pflanzen anzeigen"[\s\S]*data-text-keine="Keine Pflanze passt dazu"/.test(h) && />Ergebnisse anzeigen</.test(h), true);
  pruefe('Abschnitts-ID am Element', /data-section-id="sec1"/.test(h), true);

  // aktive Filter
  const a = await rendere(kollektion({ stadium: 'Samen', preis: true, vorrat: true }));
  pruefe('Badge zaehlt Stadium, Verfuegbarkeit und Preis: 3', /catalogue-filter__badge"[^>]*>3</.test(a), true);
  pruefe('aktive Zeile hat drei Chips mit Entfernen-Link', zaehle(a, /class="catalogue-filter__active-chip"/g), 3);
  pruefe('Preis-Chip zeigt Spanne', /50 € –\s*250 €/.test(a) || /50 €\s*–\s*250 €/.test(a), true);
  pruefe('Stadium-Tab Samen ist gewaehlt und entfernt beim Tippen', /href="\/collections\/x\?ohne=Samen"\s+aria-current="true"/.test(a), true);
  pruefe('Alle ist nicht mehr gewaehlt', /catalogue-filter__tab"\s+href="\/collections\/x"\s+>/.test(a) || !/href="\/collections\/x"\s+aria-current="true"/.test(a), true);
  pruefe('Zaehlzeile mit Filter: 6 von 14', /6 von 14 Pflanzen/.test(a), true);
  pruefe('Preisfelder vorbelegt', /name="filter\.v\.price\.gte"\s+value="50.00"/.test(a), true);

  // Englisch
  locale = 'en';
  const en = await rendere(kollektion({ stadium: 'Samen' }));
  pruefe('Englisch: Aufschriften uebersetzt, Rohwert deutsch', />Sprouted seed <span/.test(en) && />Cutting\/Clone <span/.test(en) && /value="Steckling"/.test(en) && /Young plant <span/.test(en) && /value="Samen"/.test(en), true);
  pruefe('Englisch: Knopf und Zaehlzeile', />Show results</.test(en) && /6 of 14 plants/.test(en), true);
  pruefe('Englisch: kein deutsches Stadium als Aufschrift', />Samen <span|>Jungpflanze <span|>Sämling <span/.test(en), false);

  // Aktive Chips tragen die uebersetzte Aufschrift, nicht den deutschen Rohwert.
  locale = 'en';
  const enChips = await rendere(kollektion({ stadium: 'Steckling' }));
  pruefe('Englisch: aktiver Chip uebersetzt', /catalogue-filter__active-chip"[^>]*>\s*<span>Cutting\/Clone<\/span>/.test(enChips) && !/<span>Steckling<\/span>/.test(enChips), true);
  pruefe('Englisch: Entfernen-Text nennt die uebersetzte Aufschrift', /Remove Cutting\/Clone/.test(enChips), true);
  locale = 'de';
  const deChips = await rendere(kollektion({ stadium: 'Steckling' }));
  pruefe('Deutsch: aktiver Chip Steckling/Klon', /<span>Steckling\/Klon<\/span>/.test(deChips), true);

  // Ohne Stadium- und Vorrats-Filter keine Schnellwahl
  locale = 'de';
  const k = kollektion();
  k.filters = k.filters.filter((f) => f.type === 'price_range');
  const ohne = await rendere(k);
  pruefe('ohne Stadiumfilter keine Schnellwahl, Filterknopf bleibt', !/catalogue-filter__tabs/.test(ohne) && /catalogue-filter__button/.test(ohne), true);

  console.log(fehler + ' Fehler in ' + geprueft + ' Pruefungen');
  process.exit(fehler ? 1 : 0);
})().catch((e) => { console.log('ABBRUCH: ' + e.message); process.exit(1); });

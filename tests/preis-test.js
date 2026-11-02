// Prueft die Preisanzeige in snippets/price.liquid: ganze Euro ohne ",00",
// Cent bleiben, Leerzeichen vor dem Eurozeichen, mit und ohne Waehrungscode.
// Die Filter bilden Shopifys Format des Shops nach: "{{amount_with_comma_separator}}€".
const path = require('path');
const { Liquid } = require('liquidjs');
const engine = new Liquid({ root: path.join(__dirname, '..', 'snippets'), extname: '.liquid' });
const fmt = c => (c / 100).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/, '.') + '€';
engine.registerFilter('money', fmt);
engine.registerFilter('money_with_currency', fmt);
engine.registerFilter('money_without_trailing_zeros', c => fmt(c).replace(',00', ''));
engine.registerFilter('t', k => k);

const faelle = [
  { name: 'Ganzer Betrag', price: 23000, erwartet: ['230 €'], verboten: ['230,00', '230€'] },
  { name: 'Mit Cent', price: 3499, erwartet: ['34,99 €'], verboten: ['35 €'] },
  { name: 'Tausender', price: 123400, erwartet: ['1.234 €'], verboten: ['1.234,00'] },
  { name: 'Streichpreis', price: 23000, cap: 29000, erwartet: ['230 €', '290 €'], verboten: ['290,00'] },
];
(async () => {
  let fails = 0, checks = 0;
  for (const cc of [true, false]) for (const f of faelle) {
    const html = await engine.renderFile('price', {
      product: { price: f.price, compare_at_price: f.cap || 0, available: true, price_min: f.price, price_max: f.price },
      settings: { currency_code_enabled: cc }, use_variant: false, show_compare_at_price: true,
    });
    const text = html.replace(/<[^>]+>/g, ' ');
    for (const e of f.erwartet) { checks++; if (!text.includes(e)) { fails++; console.log('FEHLER [Code ' + cc + '] ' + f.name + ': fehlt "' + e + '"'); } }
    for (const v of f.verboten) { checks++; if (text.includes(v)) { fails++; console.log('FEHLER [Code ' + cc + '] ' + f.name + ': enthaelt "' + v + '"'); } }
  }
  console.log('\n' + (checks - fails) + '/' + checks + ' Pruefungen bestanden, ' + fails + ' Fehler.');
  process.exit(fails ? 1 : 0);
})();

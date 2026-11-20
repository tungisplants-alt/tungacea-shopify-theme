// Prueft die Mengensperre im Warenkorb (snippets/cart-drawer.liquid, sections/main-cart-items.liquid)
// und den Wegfall des Schreib-mir-Knopfs im Archiv (layout/theme.liquid).
// Der Warenkorb ist zu gross, um ihn mit allen Dawn-Bausteinen zu rendern; geprueft wird deshalb der Aufbau:
//   - die Sperre gilt genau fuer "Dieses Exemplar" und "Cutting der Mutterpflanze"
//   - die Klasse sitzt auf der Mengen-Zelle, in Schublade UND Warenkorbseite
//   - das Stylesheet blendet nur das Mengenfeld aus, nicht den Knopf "Entfernen"
const fs = require('fs');
const path = require('path');
const THEME = path.join(__dirname, '..');
const lies = (p) => fs.readFileSync(path.join(THEME, p), 'utf8');
let n = 0, fehler = 0;
const pruefe = (name, ok) => { n++; if (!ok) { fehler++; console.log('FEHLER ' + name); } };

for (const [datei, was] of [['snippets/cart-drawer.liquid', 'Schublade'], ['sections/main-cart-items.liquid', 'Warenkorbseite']]) {
  const t = lies(datei);
  pruefe(was + ': Sperre gilt fuer Dieses Exemplar und Cutting', t.includes("mengen_umfang == 'Dieses Exemplar' or mengen_umfang == 'Cutting der Mutterpflanze'"));
  pruefe(was + ': Samen, Etiketten und Zubehoer sind nicht gesperrt', !/mengen_umfang == 'Gekeimter Samen|mengen_umfang == 'Saemling|mengen_umfang == 'Sämling/.test(t));
  pruefe(was + ': Klasse sitzt auf der Mengen-Zelle', /cart-item__quantity[^"]*\{% if mengen_fest %\} cart-item__quantity--fest\{% endif %\}/.test(t));
  pruefe(was + ': Zelle fuer "Entfernen" bleibt (cart-remove-button)', t.includes('cart-remove-button'));
}
const css = lies('assets/component-mengensperre.css');
pruefe('Stylesheet blendet das Mengenfeld aus', /\.cart-item__quantity--fest quantity-input\.quantity\s*\{\s*display:\s*none/.test(css));
pruefe('Stylesheet blendet "Entfernen" nicht aus', !/cart-remove-button/.test(css));
const layout = lies('layout/theme.liquid');
pruefe('Stylesheet wird im Layout geladen', layout.includes("'component-mengensperre.css' | asset_url"));
pruefe('Schreib-mir-Knopf fehlt im Archiv', /unless page\.handle == 'archive'[\s\S]*render 'whatsapp-contact'[\s\S]*endunless/.test(layout));
console.log('\n' + (n - fehler) + '/' + n + ' Pruefungen bestanden, ' + fehler + ' Fehler.');
process.exit(fehler ? 1 : 0);

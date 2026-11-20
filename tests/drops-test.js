// Prueft die Drop-Mail in der Fusszeile (sections/footer.liquid): Aufbau, Schalter, Texte in beiden Sprachen.
const fs = require('fs');
const path = require('path');
const THEME = path.join(__dirname, '..');
const strip = (s) => s.replace(/^\s*\/\*[\s\S]*?\*\//, '');
const lies = (p) => fs.readFileSync(path.join(THEME, p), 'utf8');
let n = 0, fehler = 0;
const pruefe = (name, ok) => { n++; if (!ok) { fehler++; console.log('FEHLER ' + name); } };
const f = lies('sections/footer.liquid');
pruefe('Formular ist Shopifys Kundenformular', /form 'customer', id: 'FooterDropForm'/.test(f));
pruefe('Nur sichtbar, wenn die Einstellung an ist', /if section\.settings\.newsletter_enable[\s\S]*FooterDropForm[\s\S]*endif/.test(f));
pruefe('E-Mail ist Pflichtfeld mit Label', /id="FooterDropMail"[\s\S]*required/.test(f) && /for="FooterDropMail"/.test(f));
pruefe('Tag "drop" geht mit', /name="contact\[tags\]" value="newsletter,drop"/.test(f));
pruefe('Fehler und Erfolg werden gemeldet', /form\.errors/.test(f) && /form\.posted_successfully\?/.test(f));
pruefe('Link zur Datenschutzerklaerung', /shop\.privacy_policy\.url/.test(f));
for (const [datei, wort] of [['locales/de.json', 'Ich schreibe dir nur, wenn ein Drop kommt'], ['locales/en.default.json', 'I only write when a drop is coming']]) {
  const L = JSON.parse(strip(lies(datei)));
  const g = L.sections.footer;
  pruefe(datei + ': Texte der Drop-Mail vorhanden', g.drops_text.includes(wort) && g.drops_button && g.drops_hint && g.drops_privacy);
}
const raw = lies('sections/footer-group.json');
const g = JSON.parse(raw.slice(raw.indexOf('{\n')));
pruefe('Einstellung in der Gruppe ist an, Ueberschrift in Grossbuchstaben', g.sections.footer.settings.newsletter_enable === true && g.sections.footer.settings.newsletter_heading === 'DROP-MAIL');
console.log('\n' + (n - fehler) + '/' + n + ' Pruefungen bestanden, ' + fehler + ' Fehler.');
process.exit(fehler ? 1 : 0);

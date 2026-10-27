// Der Rueckweg vom Archiv ins Produkt muss BEIDE Elternrollen finden.
//
// Eine Pflanze kann an einem Angebot in zwei Rollen beteiligt sein: als Mutter
// eines Cuttings oder als einer von zwei Eltern eines Saemlings. Beide Rollen
// speisen dieselbe Liste — sonst zeigt eine Pflanze ihre Cuttings und ihre
// Saemlinge an zwei verschiedenen Stellen.
//
// Die Pruefung haengt nicht an Variablennamen, die sich umbenennen lassen,
// sondern am Feldnamen und am Handle-Vergleich: wo ein Produkt ueber
// `custom.mutterpflanze` und `.system.handle` einem Eintrag zugeordnet wird,
// muss `custom.vaterpflanze` in derselben Datei ebenso vorkommen.
//
// Vier Stellen tun das heute. Eine fuenfte, die jemand spaeter dazuschreibt,
// faellt hier auf und nicht erst im Laden.
const fs = require('fs');
const path = require('path');

const THEME = path.join(__dirname, '..');
const ORDNER = ['snippets', 'sections', 'templates', 'layout'];

let geprueft = 0;
let betroffen = 0;
let fehler = 0;

for (const ordner of ORDNER) {
  const voll = path.join(THEME, ordner);
  if (!fs.existsSync(voll)) continue;
  for (const name of fs.readdirSync(voll)) {
    if (!name.endsWith('.liquid')) continue;
    const datei = path.join(ordner, name);
    const text = fs.readFileSync(path.join(voll, name), 'utf8');
    geprueft++;

    const liestMutter = text.includes('custom.mutterpflanze');
    const vergleichtHandle = /\.system\.handle\s*==/.test(text);
    if (!liestMutter || !vergleichtHandle) continue;

    betroffen++;
    if (!text.includes('custom.vaterpflanze')) {
      console.log('FEHLER ' + datei + ' — ordnet ueber custom.mutterpflanze zu, '
        + 'prueft aber custom.vaterpflanze nicht. Ein Saemling, bei dem diese '
        + 'Pflanze der Vater ist, bleibt damit unsichtbar.');
      fehler++;
      continue;
    }

    // Gegenprobe gegen die halbe Korrektur: beide Felder muessen gleich oft
    // einem Handle gegenuebergestellt werden. Sonst ist eine von mehreren
    // Fundstellen nachgezogen und die anderen nicht — genau der Fall, der
    // schon einmal dreimal dieselbe Zeile stehen liess.
    const zaehle = feld => {
      const re = new RegExp('custom\\.' + feld + '\\.value', 'g');
      return (text.match(re) || []).length;
    };
    const m = zaehle('mutterpflanze');
    const v = zaehle('vaterpflanze');
    if (m !== v) {
      console.log('FEHLER ' + datei + ' — custom.mutterpflanze ' + m + 'x, '
        + 'custom.vaterpflanze ' + v + 'x gelesen. Eine Fundstelle ist nicht '
        + 'nachgezogen.');
      fehler++;
    }
  }
}

console.log('\n' + geprueft + ' Dateien, ' + betroffen
  + ' mit Rueckweg ueber die Elternpflanze geprueft, ' + fehler + ' Fehler.');
process.exit(fehler ? 1 : 0);

# Prüfstände

Prüfen die **ausgelieferten** Snippets dieses Themes gegen die **echten**
Sprachdateien in `locales/`. Keine Kopien, keine eigene Stringtabelle — sonst
wird eine Prüfung grün auf einem Pfad, den es im Theme nicht gibt. Genau das ist
hier einmal passiert.

Shopify übernimmt aus GitHub nur die bekannten Theme-Ordner. **Dieser Ordner
wird nicht ausgeliefert.**

## Ausführen

```bash
cd tests
npm install     # einmalig, nur liquidjs
npm test
```

Erwartet: `0 Fehler` in allen vier Läufen, 205 Prüfungen plus der Lint.

Ein Lauf mit `ZEIGE=1 node pass-test.js` schreibt zusätzlich den Text jedes
Falls in die Konsole. `npm run vorschau` baut
`dokumentation-vorschau.html` — eine Seite, die alle Fälle nebeneinander zeigt.

## Die vier Läufe

| Datei | Prüft | Fälle |
|---|---|---|
| `liquid-lint.js` | Kommentarzeilen in `{% liquid %}`-Blöcken, alle Theme-Dateien | 54 Zeilen |
| `pass-test.js` | `snippets/specimen-passport.liquid` | 94 |
| `card-test.js` | `snippets/specimen-card-fields.liquid` | 73 |
| `flags-test.js` | `snippets/specimen-card-flags.liquid` | 38 |

## Warum es diese Prüfungen gibt

Jede hält einen Fehler fest, der schon einmal passiert ist.

**`liquid-lint.js`** — In einem `{% liquid %}`-Block ist jede Zeile ein Tag.
Eine Prosazeile zwischen `comment` und `endcomment`, die mit einem
Anführungszeichen beginnt, zerlegt das ganze Snippet, und die Fehlermeldung
zeigt auf eine andere Zeile. Zweimal passiert. Die Gegenprobe dazu steckt nicht
in der Datei: wer sie ändert, baut sich eine kaputte Kommentarzeile in eine
Kopie und stellt sicher, dass der Lauf rot wird.

**Der Namensraum heißt `products.product.specimen`**, nicht
`products.specimen`. Der `t`-Filter in allen Prüfständen **wirft**, wenn ein
Schlüssel fehlt oder ein Platzhalter nicht ersetzt wurde. Ein Tippfehler fällt
hier auf und nicht im Laden.

**Jeder Fall läuft deutsch und englisch.** Der englische Lauf prüft nicht auf
Gleichheit, sondern darauf, dass **kein** deutsches Wort durchkommt. Diese
Prüfung war einmal zu eng — sie kannte eine feste Liste deutscher Wörter, in der
der neue Wert fehlte.

**`verboten`-Listen sind so wichtig wie `erwartet`.** Was nicht dastehen darf:
„Generation Species", ein Hinweis bei guter Bewurzelung, ein Verweis auf eine
Mutterpflanze, die es nicht gibt, und ein fremdes Foto ohne Freigabe. Drei
Fehler wären sonst durchgerutscht.

**Die Bildfreigabe wird in vier Zuständen geprüft:** eigenes Foto, fremdes Foto
mit Freigabe, fremdes ohne, fremdes mit ausdrücklichem `false`. Nur der erste
und der zweite dürfen ein Bild ausgeben.

**`pass-test.js` prüft auch die Reihenfolge**, nicht nur den Inhalt: Hinweis
hinter Mutterpflanze, Hinweis hinter Züchter, Einstiegssatz vor allem. Ein
Vorbehalt gehört hinter die Sache, die er einschränkt.

**Die Auswahlwerte der Metafelder stehen deutsch in Shopify.** `card-test.js`
prüft gegen `'Steckling'`, nicht `'Cutting'`. Wer einen Auswahlwert im Admin
umbenennt, muss das `case`/`when` im Snippet mitziehen — sonst verschwindet der
Wert still von allen Karten. Genau das hat dieser Test einmal gefangen.

**Der Leerfall gehört dazu.** Ein Produkt ohne jedes Feld muss **gar keine**
Ausgabe erzeugen, keinen leeren Rahmen. Und eine Blattlänge von `0` darf nicht
wegfallen, nur weil `0` in Liquid unwahr ist.

## Was diese Prüfungen nicht können

Sie rendern Liquid mit `liquidjs`, nicht mit Shopify. Metaobjekt-Referenzen,
`image_url` und Datumsformate sind nachgebaut. Sie beweisen die Logik und die
Texte, **nicht** dass Shopify dieselbe Struktur liefert. Das wird am Live-Theme
nachgesehen.

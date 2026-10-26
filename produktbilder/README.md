# Produktbilder

Bilder für Produkte, die kein Foto haben können, weil sie keine Pflanze sind.
**Shopify liefert diesen Ordner nicht aus** — er wird nur aus GitHub mitgeführt,
damit die Quelle der Bilder nicht verlorengeht. Die Bilder werden im Shopify-
Admin am Produkt angehängt, nicht aus dem Theme verlinkt.

## Winterverpackung

`_basis.js` erzeugt die drei SVG. Farben und Strichbreiten stehen dort einmal,
damit die Fassungen sich garantiert nur in der Form unterscheiden.

    node _basis.js

Dann mit headless Edge zu PNG (1200×1200) und zum Vergleichsblatt — siehe die
Befehle im Sitzungsbericht vom 26. Oktober 2026.

### Zwei Festlegungen, die nicht geraten sind

**Der dunkle Grund ist fest im Bild, nicht transparent.** Checkout und
Bestellbestätigung zeigen Produktbilder auf Weiß; helle Linien auf Transparenz
wären dort unsichtbar gewesen. Das Vergleichsblatt zeigt deshalb jede Fassung
auch auf Weiß.

**Strichbreite 12 px auf 1200 px Fläche.** Im Warenkorb ist das Bild rund
150 px breit, also ein Achtel. Eine 4-px-Haarlinie läge dort bei 0,5 px und
verblasste; 12 px landen bei 1,5 px und halten.

### Was beim ersten Durchgang falsch war

- **Das Blatt war ein Herz.** Runde Lappen, breite Spitze — bei jeder Größe ein
  Valentinsherz. Behoben mit längerer Form, geraden Flanken zur Spitze und
  einem Stiel. Der Stiel entscheidet: Ohne ihn bleibt jede herzförmige
  Silhouette mehrdeutig.
- **C sah aus wie eine Handtasche.** Der Wärmebogen über dem Kasten wurde zum
  Henkel. Die Wärme liegt jetzt als Schein hinter dem Kasten.

Beides fiel nur am Bild auf, nicht an der Zeichnung im Kopf.

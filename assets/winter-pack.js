/*
 * Winterverpackung: legt das Zusatzprodukt bei jedem Klick in den Warenkorb.
 *
 * Vorgeschichte in drei Schritten.
 *
 * 1. Submit des Kaufformulars abfangen — kam nie im Warenkorb an, weil Dawns
 *    <product-form> den Submit selbst abfaengt.
 * 2. Ein Kontrollkaestchen, das den Warenkorb SPIEGELTE. Der Warenkorb aendert
 *    sich aber auch anderswo, und beim Zurueckblaettern kommt die Seite aus
 *    dem Zwischenspeicher: Haken gesetzt, Warenkorb leer, naechster Klick
 *    entfernte statt zu legen.
 * 3. Ein Knopf. Er behauptet nichts und kann deshalb nicht veralten.
 *
 * Und ein vierter Punkt, den Tung fand: Die Zahl im Kopf stimmte, die
 * Schublade war leer. Nur die Blase wurde aufgefrischt, der Inhalt nicht.
 * Dawn loest das, indem es bei /cart/add.js gleich die gerenderten
 * ABSCHNITTE mitbestellt (`sections`) und sie einsetzt. Genau das tut dieses
 * Skript jetzt auch — mit den Methoden des Warenkorb-Elements selbst, damit
 * hier keine zweite Vorstellung davon entsteht, was ein Abschnitt ist.
 *
 * Erst habe ich Dawns `renderContents` NICHT benutzt, weil es am Ende
 * `open()` ruft und ich die Schublade nicht bei jedem Klick aufreissen
 * wollte. Die Abschnitte habe ich stattdessen selbst eingesetzt — und damit
 * Dawns Schliessen-Logik mit herausgeworfen: `renderContents` haengt nach dem
 * innerHTML-Tausch den Klick auf `#CartDrawer-Overlay` eigens wieder an, weil
 * der Tausch ihn zerstoert. Tungs Schublade liess sich danach nicht mehr
 * schliessen.
 *
 * Lehre: Wer fremdes Markup austauscht, uebernimmt dessen Ereignisse. Es gibt
 * genau eine Stelle, die weiss, was danach wieder anzuhaengen ist — die
 * Methode des Elements selbst. Die Schublade springt jetzt auf wie beim
 * normalen Kauf; das ist der Preis dafuer, und er ist kleiner als eine
 * Schublade, die sich nicht schliessen laesst.
 */
(function () {
  'use strict';

  var knopf = document.querySelector('[data-winter-pack]');
  if (!knopf) return;

  var wurzel = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
  var id = Number(knopf.dataset.variante);
  if (!id) return;

  // Schublade oder Benachrichtigung — je nachdem, was im Theme eingestellt
  // ist. Steht der Warenkorb als eigene Seite, ist das hier null, und es
  // bleibt beim Auffrischen der Blase.
  var korb = document.querySelector('cart-notification') || document.querySelector('cart-drawer');

  var textFeld = knopf.querySelector('.winter-pack__knopf-text');
  var labelStart = textFeld ? textFeld.textContent : '';
  var labelFertig = knopf.dataset.labelFertig || labelStart;
  var uhr = null;

  function abschnitteBestellen() {
    if (!korb || typeof korb.getSectionsToRender !== 'function') return null;
    try {
      return korb.getSectionsToRender().map(function (a) { return a.id; });
    } catch (e) {
      return null;
    }
  }

  function abschnitteEinsetzen(antwort) {
    // Dawns eigene Methode. Sie setzt die Abschnitte ein, nimmt der Schublade
    // die Leer-Klasse, haengt den Overlay-Klick wieder an und oeffnet.
    if (!korb || typeof korb.renderContents !== 'function') return false;
    if (!antwort || !antwort.sections) return false;
    try {
      korb.renderContents(antwort);
    } catch (e) {
      return false;
    }
    return true;
  }

  function blaseNachholen() {
    // Rueckweg, wenn es kein Warenkorb-Element gibt oder das Einsetzen
    // scheiterte: wenigstens die Zahl im Kopf stimmt dann.
    return fetch(wurzel + '?section_id=cart-icon-bubble')
      .then(function (a) { return a.ok ? a.text() : null; })
      .then(function (text) {
        if (!text) return;
        var ziel = document.getElementById('cart-icon-bubble');
        if (!ziel) return;
        var neu = new DOMParser().parseFromString(text, 'text/html').querySelector('.shopify-section');
        if (neu) ziel.innerHTML = neu.innerHTML;
      })
      .catch(function () {});
  }

  function ruecksetzen() {
    knopf.classList.remove('ist-fertig');
    if (textFeld) textFeld.textContent = labelStart;
  }

  knopf.addEventListener('click', function () {
    if (knopf.disabled) return;
    knopf.disabled = true;
    if (uhr) { clearTimeout(uhr); uhr = null; }

    if (korb && typeof korb.setActiveElement === 'function') korb.setActiveElement(knopf);

    var koerper = { items: [{ id: id, quantity: 1 }] };
    var abschnitte = abschnitteBestellen();
    if (abschnitte) {
      koerper.sections = abschnitte;
      koerper.sections_url = window.location.pathname;
    }

    fetch(wurzel + 'cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(koerper),
    })
      .then(function (a) {
        if (!a.ok) throw new Error('add fehlgeschlagen');
        return a.json();
      })
      .then(function (antwort) {
        if (!abschnitteEinsetzen(antwort)) return blaseNachholen();
      })
      .then(function () {
        // Oertliche Rueckmeldung: Sie sagt, dass DIESER Klick durchging, und
        // behauptet nichts ueber den Inhalt des Warenkorbs.
        knopf.classList.add('ist-fertig');
        if (textFeld) textFeld.textContent = labelFertig;
        uhr = setTimeout(ruecksetzen, 2200);
      })
      .catch(function () {
        // Lieber kein Zeichen als ein falsches: Eine Bestaetigung ohne Ware
        // waere das Schlimmste.
        ruecksetzen();
      })
      .then(function () {
        knopf.disabled = false;
      });
  });
})();

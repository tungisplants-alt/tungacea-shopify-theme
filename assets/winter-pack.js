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
 * Absichtlich NICHT uebernommen: Dawns `renderContents` ruft am Ende
 * `open()`. Fuer eine Zusatzleistung von 3,90 € waere es zu viel, bei jedem
 * Klick die Schublade aufzureissen — zumal mehrfaches Hinzufuegen erlaubt ist
 * und sie dann mehrfach aufspringt. Der Zaehler und der Knopf melden; die
 * Schublade ist richtig, sobald sie jemand oeffnet.
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
    if (!korb || !antwort || !antwort.sections) return false;
    var eingesetzt = false;
    try {
      // Wie Dawn: War der Warenkorb leer, traegt die Schublade noch die
      // Leer-Klasse und bliebe sonst leer aussehen.
      var innen = korb.querySelector('.drawer__inner');
      if (innen) innen.classList.remove('is-empty');

      korb.getSectionsToRender().forEach(function (a) {
        var ziel = a.selector ? document.querySelector(a.selector) : document.getElementById(a.id);
        var html = antwort.sections[a.id];
        if (!ziel || !html) return;
        ziel.innerHTML = korb.getSectionInnerHTML(html, a.selector);
        eingesetzt = true;
      });
    } catch (e) {
      return false;
    }
    return eingesetzt;
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

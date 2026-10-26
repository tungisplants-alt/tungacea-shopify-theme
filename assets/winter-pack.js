/*
 * Winterverpackung: legt das Zusatzprodukt bei jedem Klick in den Warenkorb.
 *
 * Vorgeschichte in zwei Schritten.
 *
 * Erst hing sich das Skript in den Submit des Kaufformulars ein und legte die
 * Verpackung beim Kauf dazu. Das kam nie im Warenkorb an — Dawns
 * <product-form> faengt den Submit selbst ab.
 *
 * Dann war es ein Kontrollkaestchen, das den Warenkorb SPIEGELTE: beim Laden
 * nachgezogen, beim Anhaken gelegt, beim Abwaehlen entfernt. Der Warenkorb
 * aendert sich aber auch anderswo — auf der Warenkorbseite, in der Schublade,
 * in einem zweiten Tab, und beim Zurueckblaettern liefert der Browser die
 * Seite aus dem Zwischenspeicher, ohne dass irgendetwas neu laedt. Dann stand
 * der Haken, waehrend das Produkt laengst entfernt war, und der naechste Klick
 * entfernte es ein zweites Mal statt es zu legen. Genau dieser Fall ist Tung
 * beim Durchprobieren begegnet.
 *
 * Jetzt ist es ein Knopf. Ein Knopf ist eine Handlung, kein Zustand — er kann
 * nicht veralten, weil er nichts behauptet. Er legt jedes Mal eine dazu; was
 * im Warenkorb liegt, sagt der Warenkorb.
 */
(function () {
  'use strict';

  var knopf = document.querySelector('[data-winter-pack]');
  if (!knopf) return;

  var wurzel = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
  var id = Number(knopf.dataset.variante);
  if (!id) return;

  var textFeld = knopf.querySelector('.winter-pack__knopf-text');
  var labelStart = textFeld ? textFeld.textContent : '';
  var labelFertig = knopf.dataset.labelFertig || labelStart;
  var uhr = null;

  function zaehlerAuffrischen() {
    // Die Warenkorbblase im Kopf neu holen, damit die Zahl stimmt.
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

    fetch(wurzel + 'cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items: [{ id: id, quantity: 1 }] }),
    })
      .then(function (a) {
        if (!a.ok) throw new Error('add fehlgeschlagen');
        return a.json();
      })
      .then(zaehlerAuffrischen)
      .then(function () {
        // Oertliche Rueckmeldung: Sie sagt nur, dass DIESER Klick durchging,
        // und behauptet nichts ueber den Inhalt des Warenkorbs.
        knopf.classList.add('ist-fertig');
        if (textFeld) textFeld.textContent = labelFertig;
        uhr = setTimeout(ruecksetzen, 2200);
      })
      .catch(function () {
        // Scheitert es, bleibt der Knopf wie er war. Lieber kein Zeichen als
        // ein falsches: Eine Bestaetigung ohne Ware waere das Schlimmste.
        ruecksetzen();
      })
      .then(function () {
        knopf.disabled = false;
      });
  });
})();

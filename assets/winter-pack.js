/*
 * Winterverpackung: legt das Zusatzprodukt beim Anhaken sofort in den
 * Warenkorb und nimmt es beim Abwaehlen wieder heraus.
 *
 * Der erste Versuch hing sich in den Submit des Kaufformulars ein und legte
 * die Verpackung erst beim Kauf dazu. Das kam nie im Warenkorb an. Dawns
 * <product-form> faengt den Submit selbst ab, und der Wettlauf zwischen
 * beiden Wegen liess sich von aussen nicht zuverlaessig gewinnen.
 *
 * Dieser Weg greift gar nicht in den Kaufablauf ein. Er hat zwei Vorteile,
 * die den Umweg aufwiegen: Der Kunde sieht sofort, dass etwas passiert ist —
 * der Warenkorbzaehler springt —, und wenn das Hinzufuegen scheitert, springt
 * das Kaestchen zurueck. Ein Haken, der Schutz verspricht, den niemand
 * eingepackt hat, waere das Schlimmste von allem.
 *
 * Der Preis dafuer: Die Verpackung kann allein im Warenkorb liegen, wenn der
 * Kunde die Pflanze doch nicht nimmt. Das ist sichtbar und er kann sie dort
 * entfernen.
 */
(function () {
  'use strict';

  var box = document.querySelector('[data-winter-pack]');
  if (!box) return;

  var wurzel = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
  var id = Number(box.dataset.variante);
  if (!id) return;

  var laeuft = false;

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

  function zeileFinden() {
    return fetch(wurzel + 'cart.js', { headers: { Accept: 'application/json' } })
      .then(function (a) { return a.ok ? a.json() : null; })
      .then(function (korb) {
        if (!korb || !korb.items) return -1;
        for (var i = 0; i < korb.items.length; i++) {
          if (Number(korb.items[i].id) === id) return i + 1; // 1-basiert
        }
        return -1;
      })
      .catch(function () { return -1; });
  }

  function dazu() {
    return fetch(wurzel + 'cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items: [{ id: id, quantity: 1 }] }),
    }).then(function (a) {
      if (!a.ok) throw new Error('add fehlgeschlagen');
      return a.json();
    });
  }

  function weg(zeile) {
    return fetch(wurzel + 'cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ line: zeile, quantity: 0 }),
    }).then(function (a) {
      if (!a.ok) throw new Error('change fehlgeschlagen');
      return a.json();
    });
  }

  box.addEventListener('change', function () {
    if (laeuft) return;
    laeuft = true;
    box.disabled = true;

    var gewollt = box.checked;

    zeileFinden()
      .then(function (zeile) {
        if (gewollt) return zeile > 0 ? null : dazu();
        return zeile > 0 ? weg(zeile) : null;
      })
      .then(zaehlerAuffrischen)
      .catch(function () {
        // Zurueckspringen: Der Haken darf nichts behaupten, was nicht im
        // Warenkorb liegt.
        box.checked = !gewollt;
      })
      .then(function () {
        box.disabled = false;
        laeuft = false;
      });
  });

  // Beim Laden der Seite nachziehen: Liegt die Verpackung schon im Warenkorb,
  // muss der Haken das zeigen. Sonst haekelt der Kunde ein zweites Mal an und
  // nimmt sie damit wieder heraus.
  zeileFinden().then(function (zeile) {
    if (zeile > 0) box.checked = true;
  });
})();

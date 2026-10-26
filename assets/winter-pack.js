/*
 * Winterverpackung: legt bei angehaktem Kaestchen ein zweites Produkt mit in
 * den Warenkorb.
 *
 * Shopify kennt keine kostenpflichtige Zusatzoption ohne App. Deshalb haengt
 * hier ein eigenes Produkt dahinter, und dieses Skript legt es zusammen mit
 * der Pflanze ab.
 *
 * Der Weg fuehrt ueber einen Listener in der CAPTURE-Phase: Dawns
 * <product-form> faengt den Submit selbst ab, und ein normaler Listener kaeme
 * zu spaet. Wir halten den Submit an, legen die Winterverpackung ab, und
 * holen den eigenen Ablauf danach nach.
 *
 * Grundsatz: Der Kauf darf hieran nie scheitern. Schlaegt das Hinzufuegen
 * fehl, geht die Bestellung trotzdem durch — ohne Winterverpackung, aber sie
 * geht durch. Ein fehlendes Heatpack ist ein kleines Problem, ein Kaufknopf
 * ohne Wirkung ist ein grosses.
 */
(function () {
  'use strict';

  var box = document.querySelector('[data-winter-pack]');
  if (!box) return;

  var form = box.closest('.product')
    ? box.closest('.product').querySelector('form[action*="/cart/add"]')
    : null;
  if (!form) form = document.querySelector('form[action*="/cart/add"]');
  if (!form) return;

  var wurzel = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
  var laeuft = false;

  // Liegt die Winterverpackung schon im Warenkorb? Sonst sammeln sich bei
  // mehreren Pflanzen in einer Bestellung mehrere Heatpacks an, die niemand
  // bestellt hat.
  function schonDrin(variantenId) {
    return fetch(wurzel + 'cart.js', { headers: { Accept: 'application/json' } })
      .then(function (a) { return a.ok ? a.json() : null; })
      .then(function (warenkorb) {
        if (!warenkorb || !warenkorb.items) return false;
        return warenkorb.items.some(function (zeile) {
          return String(zeile.id) === String(variantenId);
        });
      })
      .catch(function () { return false; });
  }

  function hinzufuegen(variantenId) {
    return fetch(wurzel + 'cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items: [{ id: Number(variantenId), quantity: 1 }] }),
    });
  }

  form.addEventListener(
    'submit',
    function (ereignis) {
      if (!box.checked || laeuft) return;

      var id = box.dataset.variante;
      if (!id) return;

      ereignis.preventDefault();
      ereignis.stopImmediatePropagation();

      var knopf = form.querySelector('[type="submit"]');

      schonDrin(id)
        .then(function (drin) {
          return drin ? null : hinzufuegen(id);
        })
        .catch(function () { return null; })
        .then(function () {
          laeuft = true;
          if (form.requestSubmit) form.requestSubmit(knopf || undefined);
          else form.submit();
          laeuft = false;
        });
    },
    true
  );
})();

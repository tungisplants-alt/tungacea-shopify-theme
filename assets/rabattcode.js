/*
 * Rabattcode im Warenkorb (snippets/rabattcode.liquid): Beim Absenden geht es auf /discount/<Code>,
 * Shopify setzt den Code und leitet zurueck in den Warenkorb. Der Handler haengt am Dokument, weil die
 * Schublade ihren Inhalt bei jeder Aenderung ersetzt.
 */
(function () {
  'use strict';
  if (window.__rabattcode) return;
  window.__rabattcode = true;
  document.addEventListener('submit', function (e) {
    var form = e.target.closest && e.target.closest('[data-rabattcode-form]');
    if (!form) return;
    e.preventDefault();
    var code = (form.elements.code.value || '').trim();
    if (!code) return;
    var wurzel = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
    window.location.href = wurzel + 'discount/' + encodeURIComponent(code) + '?redirect=' + encodeURIComponent(wurzel + 'cart');
  });
})();

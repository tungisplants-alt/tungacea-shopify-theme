/*
 * Etikett-Vorschlag im Warenkorb (snippets/etikett-vorschlag.liquid).
 *
 * Ein Klick legt das Pflanzenetikett mit dem Namen der Pflanze in den
 * Warenkorb (so viele, wie die Pflanze Stueck hat, siehe data-menge), wie der Knopf auf der Pflanzenseite (assets/etikett.js): sichtbare
 * Zeile "Für: <Pflanze>", verborgen _pflanze = Handle der Pflanze.
 *
 * Derselbe Handler bedient den Knopf "Winterpackung gratis dazulegen" im
 * Meilenstein-Balken (data-meilenstein-add, ohne Eigenschaften).
 *
 * Der Warenkorb wird danach neu gezeichnet: in der Schublade ueber die
 * Methoden des Elements (renderContents), auf der Warenkorbseite durch
 * Neuladen. Die Handler haengen am Dokument, weil die Schublade ihren Inhalt
 * bei jeder Aenderung ersetzt.
 */
(function () {
  'use strict';
  if (window.__etikettVorschlag) return;
  window.__etikettVorschlag = true;

  var wurzel = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';

  function schublade() {
    var d = document.querySelector('cart-drawer');
    return d && typeof d.renderContents === 'function' ? d : null;
  }

  document.addEventListener('click', function (e) {
    var knopf = e.target.closest && e.target.closest('[data-etikett-vorschlag], [data-meilenstein-add]');
    if (!knopf || knopf.disabled) return;
    var id = Number(knopf.dataset.variante);
    if (!id) return;
    knopf.disabled = true;

    // Etikett: mit dem Namen der Pflanze. Winterpackung (Meilenstein): ohne Eigenschaften.
    var eigenschaften = {};
    if (knopf.dataset.handle !== undefined) {
      eigenschaften._pflanze = knopf.dataset.handle || '';
      var schluessel = knopf.dataset.schluesselFuer || 'Für';
      if (knopf.dataset.fuer) eigenschaften[schluessel] = knopf.dataset.fuer;
    }

    var d = schublade();
    var menge = Math.max(1, Math.min(99, Number(knopf.dataset.menge) || 1));
    var koerper = { items: [{ id: id, quantity: menge, properties: eigenschaften }] };
    if (d && typeof d.getSectionsToRender === 'function') {
      try {
        koerper.sections = d.getSectionsToRender().map(function (a) { return a.id; });
        koerper.sections_url = window.location.pathname;
      } catch (err) { /* dann ohne Abschnitte */ }
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
        if (d && antwort && antwort.sections) {
          try { d.renderContents(antwort); return; } catch (err) { /* dann neu laden */ }
        }
        window.location.reload();
      })
      .catch(function () {
        knopf.disabled = false;
      });
  });
})();

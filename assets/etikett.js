/*
 * Archiv-Etikett: legt das Zusatzprodukt bei jedem Klick in den Warenkorb,
 * mit dem Namen der Pflanze als Zeile ("Für: ..."). So bleibt auch bei
 * mehreren Pflanzen im Warenkorb sichtbar, zu welcher das Etikett gehoert.
 *
 * Gleiche Technik wie winter-pack.js (siehe dort die Vorgeschichte): Dawns
 * Abschnitte mitbestellen und ueber die Methoden des Warenkorb-Elements
 * einsetzen, nie selbst Markup tauschen.
 *
 * Eigenschaften der Position:
 *  - sichtbar:  <Schluessel>: <Name der Pflanze>   (z.B. "Für: Anthurium ...")
 *  - versteckt: _pflanze = Handle der Pflanze (Unterstrich: Dawn zeigt sie
 *    nicht an; bleibt aber an der Bestellung)
 */
(function () {
  'use strict';

  var knopf = document.querySelector('[data-etikett]');
  if (!knopf) return;

  var wurzel = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
  var id = Number(knopf.dataset.variante);
  if (!id) return;

  var korb = document.querySelector('cart-notification') || document.querySelector('cart-drawer');

  var textFeld = knopf.querySelector('.etikett__knopf-text');
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
    if (!korb || typeof korb.renderContents !== 'function') return false;
    if (!antwort || !antwort.sections) return false;
    try {
      // Siehe winter-pack.js: `is-empty` sitzt auf dem aeusseren Element und
      // bleibt sonst stehen.
      korb.classList.remove('is-empty');
      korb.renderContents(antwort);
    } catch (e) {
      return false;
    }
    return true;
  }

  function blaseNachholen() {
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

    var eigenschaften = { _pflanze: knopf.dataset.handle || '' };
    var schluessel = knopf.dataset.schluesselFuer || 'Für';
    if (knopf.dataset.fuer) eigenschaften[schluessel] = knopf.dataset.fuer;

    // So viele Etiketten, wie die Pflanze Stueck gewaehlt ist (Mengenfeld der Seite).
    var mengenFeld = document.querySelector('input.quantity__input[name="quantity"]');
    var menge = Math.max(1, Math.min(99, Number(mengenFeld && mengenFeld.value) || 1));
    var koerper = { items: [{ id: id, quantity: menge, properties: eigenschaften }] };
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
        knopf.classList.add('ist-fertig');
        if (textFeld) textFeld.textContent = labelFertig;
        uhr = setTimeout(ruecksetzen, 2200);
      })
      .catch(function () {
        ruecksetzen();
      })
      .then(function () {
        knopf.disabled = false;
      });
  });
})();

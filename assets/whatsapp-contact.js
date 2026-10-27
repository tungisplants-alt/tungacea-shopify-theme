/*
 * Schreib-mir-Knopf: schliesst die aufgeklappte Karte mit Escape und beim
 * Klick daneben.
 *
 * Aufgeklappt wird ohne Skript, mit <details>. Dieses Skript ist nur der Komfort
 * dazu; faellt es aus, bleibt der Knopf bedienbar und nur das Schliessen geht
 * ueber den Knopf selbst.
 */
(function () {
  'use strict';

  var wurzel = document.querySelector('[data-whatsapp-contact]');
  if (!wurzel) return;

  var knopf = wurzel.querySelector('.whatsapp-contact__toggle');

  function schliessen(fokusZurueck) {
    wurzel.removeAttribute('open');
    if (fokusZurueck && knopf) knopf.focus();
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && wurzel.open) schliessen(true);
  });

  document.addEventListener('click', function (e) {
    if (wurzel.open && !wurzel.contains(e.target)) schliessen(false);
  });
})();

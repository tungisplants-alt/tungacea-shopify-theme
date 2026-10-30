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

  /*
   * Der Knopf weicht beim Lesen aus: Beim Runterscrollen verschwindet er, damit
   * er nicht auf Karten, Preisen und Text liegt. Beim Hochscrollen, ganz oben
   * und am Seitenende ist er wieder da. Aufgeklappt bleibt er immer stehen.
   */
  var letzte = window.scrollY;
  var geplant = false;
  function pruefen() {
    geplant = false;
    var y = window.scrollY;
    var ende = window.innerHeight + y >= document.documentElement.scrollHeight - 120;
    var runter = y > letzte + 4;
    var hoch = y < letzte - 4;
    if (wurzel.open || y < 80 || ende || hoch) {
      wurzel.classList.remove('ist-weg');
    } else if (runter) {
      wurzel.classList.add('ist-weg');
    }
    letzte = y;
  }
  window.addEventListener('scroll', function () {
    if (geplant) return;
    geplant = true;
    window.requestAnimationFrame(pruefen);
  }, { passive: true });
})();

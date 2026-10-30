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
   * Der Knopf weicht nur aus, solange man nach unten scrollt, damit er beim
   * Stöbern nicht auf Karten, Preisen und Text liegt. Sobald man stehen
   * bleibt, ist er sofort wieder da; ebenso beim Hochscrollen, ganz oben und
   * am Seitenende. Aufgeklappt bleibt er immer stehen.
   *
   * "Stehen bleiben" meldet der Browser mit scrollend. Wo es das nicht gibt
   * (ältere Safari-Versionen), gilt eine Pause von 150 ms ohne Scrollereignis
   * als Stillstand. Beim Nachschwingen auf dem Handy kommen weiter Ereignisse,
   * der Knopf erscheint also erst, wenn die Seite wirklich steht.
   */
  var letzte = window.scrollY;
  var geplant = false;
  var stillstand = null;
  var steht = true;
  function zeigen() {
    steht = true;
    wurzel.classList.remove('ist-weg');
  }
  function pruefen() {
    geplant = false;
    var y = window.scrollY;
    var ende = window.innerHeight + y >= document.documentElement.scrollHeight - 120;
    var runter = y > letzte + 4;
    var hoch = y < letzte - 4;
    if (wurzel.open || y < 80 || ende || hoch) {
      zeigen();
    } else if (runter && !steht) {
      /* Nur verstecken, solange die Seite noch läuft. Meldet der Browser das
         Ende schon vor dieser Prüfung, bleibt der Knopf stehen. */
      wurzel.classList.add('ist-weg');
    }
    letzte = y;
  }
  window.addEventListener('scroll', function () {
    steht = false;
    window.clearTimeout(stillstand);
    stillstand = window.setTimeout(zeigen, 150);
    if (geplant) return;
    geplant = true;
    window.requestAnimationFrame(pruefen);
  }, { passive: true });
  window.addEventListener('scrollend', function () {
    window.clearTimeout(stillstand);
    zeigen();
  });
})();

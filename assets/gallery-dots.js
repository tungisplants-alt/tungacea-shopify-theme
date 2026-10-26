/*
 * Punkte unter der Produktgalerie (nur Telefon).
 *
 * Dawn zeigt dort Pfeile und "1 / 6". Beides stimmt, aber man muss es lesen.
 * Die Punkte zeigen Anzahl und Stand auf einen Blick.
 *
 * Die Stellung kommt NICHT aus einem eigenen Zaehler, sondern aus dem
 * Ereignis `slideChanged`, das Dawns SliderComponent beim Scrollen wirft. Ein
 * zweiter Zaehler waere ein Spiegel, der benachrichtigt werden muss — und
 * genau daran ist in diesem Projekt schon einmal etwas zerbrochen.
 */
(function () {
  'use strict';

  var leiste = document.querySelector('[data-galerie-punkte]');
  if (!leiste) return;

  var schieber = leiste.closest('slider-component');
  if (!schieber) return;

  var liste = schieber.querySelector('.product__media-list');
  if (!liste) return;

  var punkte = Array.prototype.slice.call(leiste.querySelectorAll('.galerie-punkte__punkt'));
  if (punkte.length < 2) return;

  function setzen(nr) {
    for (var i = 0; i < punkte.length; i++) {
      punkte[i].classList.toggle('ist-hier', i === nr - 1);
    }
  }

  schieber.addEventListener('slideChanged', function (e) {
    if (e.detail && e.detail.currentPage) setzen(e.detail.currentPage);
  });

  leiste.addEventListener('click', function (e) {
    var p = e.target.closest('.galerie-punkte__punkt');
    if (!p) return;
    var nr = Number(p.dataset.folie);
    var folien = liste.querySelectorAll('.product__media-item');
    var ziel = folien[nr - 1];
    if (!ziel) return;
    // scrollIntoView statt eigener Rechnung mit scrollLeft: Die Breite einer
    // Folie haengt an Randabstaenden und am "peek" der Nachbarin, und eine
    // nachgebaute Rechnung liefe von Dawns eigener auseinander.
    ziel.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    setzen(nr);
  });
})();

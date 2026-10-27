/*
 * Archiv-Galerie: dieselbe Bedienung wie auf der Produktseite.
 *
 * Am Desktop eine senkrechte Spalte Miniaturen links, ein grosses Bild
 * rechts. Auf dem Telefon wischen, mit eckigen Punkten im Bild.
 *
 * Miniaturen und Punkte entstehen hier und nicht in Liquid. Grund: Die Bilder
 * kommen aus zwei Zweigen (Bildnachweis je Foto und der alte Weg ueber
 * `fotos`), und eine zweite Schleife in der Vorlage haette dieselbe
 * Freigabepruefung ein zweites Mal treffen muessen. Eine Freigabe, die an
 * zwei Stellen entschieden wird, geht irgendwann auseinander — und dann zeigt
 * eine Miniatur ein Bild, das die Galerie bewusst weglaesst.
 *
 * Ohne JavaScript bleibt eine Bahn, die man wischen kann. Das ist die
 * Rueckfallebene, nicht ein Rest.
 */
(function () {
  'use strict';

  // Alle Bahnen, nicht nur die erste. Auf einer Pflanzenseite gibt es genau
  // eine — aber das ist eine Annahme ueber die Seite, nicht ueber das Bauteil,
  // und solche Annahmen halten nur bis zur naechsten Vorlage.
  Array.prototype.forEach.call(document.querySelectorAll('[data-pflanzen-galerie]'), aufbauen);

  function aufbauen(bahn) {
  var huelle = bahn.parentElement;
  var folien = Array.prototype.slice.call(bahn.children);
  if (folien.length < 2) return;

  function bildVon(folie) {
    return folie.tagName === 'IMG' ? folie : folie.querySelector('img');
  }

  // --- Miniaturen -------------------------------------------------------
  var spalte = document.createElement('div');
  spalte.className = 'plant-profile__thumbs';
  spalte.setAttribute('aria-label', bahn.dataset.labelThumbs || '');

  var minis = folien.map(function (folie, i) {
    var knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.className = 'plant-profile__thumb';
    var quelle = bildVon(folie);
    if (quelle) {
      var mini = document.createElement('img');
      mini.src = quelle.currentSrc || quelle.src;
      mini.alt = '';
      mini.loading = 'lazy';
      knopf.appendChild(mini);
    }
    knopf.addEventListener('click', function () { hin(i); });
    spalte.appendChild(knopf);
    return knopf;
  });

  // --- Punkte -----------------------------------------------------------
  var leiste = document.createElement('div');
  leiste.className = 'plant-profile__dots';
  var punkte = folien.map(function (_, i) {
    var p = document.createElement('button');
    p.type = 'button';
    p.className = 'plant-profile__dot';
    p.addEventListener('click', function () { hin(i); });
    leiste.appendChild(p);
    return p;
  });

  huelle.insertBefore(spalte, bahn);
  huelle.insertBefore(leiste, bahn.nextSibling);
  huelle.classList.add('hat-galerie');

  function hin(i) {
    if (!folien[i]) return;
    folien[i].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    setzen(i);
  }

  function setzen(i) {
    for (var k = 0; k < folien.length; k++) {
      minis[k].classList.toggle('ist-hier', k === i);
      minis[k].setAttribute('aria-current', k === i ? 'true' : 'false');
      punkte[k].classList.toggle('ist-hier', k === i);
    }
  }

  // Die Stellung aus der tatsaechlichen Scrollposition ableiten, nicht aus
  // einem gemerkten Wert: Gewischt wird auch ohne Klick.
  var warte = null;
  bahn.addEventListener('scroll', function () {
    if (warte) return;
    warte = requestAnimationFrame(function () {
      warte = null;
      var breite = bahn.clientWidth || 1;
      var i = Math.round(bahn.scrollLeft / breite);
      if (i < 0) i = 0;
      if (i > folien.length - 1) i = folien.length - 1;
      setzen(i);
    });
  });

  setzen(0);
  }
})();

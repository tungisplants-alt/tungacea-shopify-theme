/*
 * Etiketten bestellen: Namen eintragen, die Menge ergibt sich aus den Zeilen.
 *
 * Ein einziges Zustandsmodell: der Modus ("namen" oder "spaeter"). Alles Weitere
 * folgt daraus: welcher Zweig sichtbar ist, welche Eingaben mitgeschickt werden
 * (disabled = nicht im Formular), was die Summe anzeigt.
 *
 * Die Summe rechnet mit den Stufen aus dem Block. Sie ist eine Anzeige. Den
 * echten Preis setzt der automatische Rabatt im Warenkorb.
 */
(function () {
  'use strict';

  var wurzel = document.querySelector('[data-etikett-bestellung]');
  if (!wurzel) return;

  var form = document.getElementById(wurzel.dataset.form);
  var modusKnoepfe = wurzel.querySelectorAll('[data-eb-modus]');
  var zweige = {
    namen: wurzel.querySelector('[data-eb-zweig="namen"]'),
    spaeter: wurzel.querySelector('[data-eb-zweig="spaeter"]'),
  };
  var namenFeld = wurzel.querySelector('[data-eb-namen]');
  var mengeNamen = wurzel.querySelector('[data-eb-menge-namen]');
  var anzahlFeld = wurzel.querySelector('[data-eb-anzahl]');
  var mengeSpaeter = wurzel.querySelector('[data-eb-menge-spaeter]');
  var fehler = wurzel.querySelector('[data-eb-fehler]');
  var zaehler = wurzel.querySelector('[data-eb-zaehler]');
  var betrag = wurzel.querySelector('[data-eb-betrag]');

  var grundpreis = Number(wurzel.dataset.preis) || 0;
  var stufen = (wurzel.dataset.stufen || '')
    .split(',')
    .filter(Boolean)
    .map(function (s) {
      var t = s.split(':');
      return { ab: Number(t[0]), preis: Number(t[1]) };
    })
    .sort(function (a, b) { return a.ab - b.ab; });

  var wortEins = wurzel.dataset.wortEins || '';
  var wortMehr = wurzel.dataset.wortMehr || '';
  var modus = 'namen';

  var geld;
  try {
    geld = new Intl.NumberFormat(wurzel.dataset.sprache || 'de', {
      style: 'currency',
      currency: wurzel.dataset.waehrung || 'EUR',
    });
  } catch (e) {
    geld = null;
  }

  function zeilen() {
    return namenFeld.value
      .split(/\r?\n/)
      .map(function (z) { return z.trim(); })
      .filter(Boolean);
  }

  function menge() {
    if (modus === 'namen') return zeilen().length;
    var n = parseInt(mengeSpaeter.value, 10);
    return n > 0 ? n : 0;
  }

  function stueckpreis(n) {
    var p = grundpreis;
    stufen.forEach(function (s) { if (n >= s.ab) p = s.preis; });
    return p;
  }

  function formatieren(cent) {
    var wert = cent / 100;
    return geld ? geld.format(wert) : wert.toFixed(2).replace('.', ',') + ' €';
  }

  function aktualisieren() {
    var n = menge();

    // Namen-Zweig: die Menge folgt den Zeilen. Mindestens 1, damit das Feld nie
    // leer im Formular steht; ohne Namen verhindert das Absenden den Kauf.
    mengeNamen.value = String(Math.max(n, 1));
    anzahlFeld.value = String(modus === 'namen' ? n : 0);

    if (n > 0) {
      zaehler.textContent = n + ' ' + (n === 1 ? wortEins : wortMehr);
      betrag.textContent = '· ' + formatieren(stueckpreis(n) * n);
    } else {
      zaehler.textContent = '';
      betrag.textContent = '';
    }

    if (n > 0 && fehler) fehler.hidden = true;
  }

  function modusSetzen(neu) {
    modus = neu;
    modusKnoepfe.forEach(function (k) {
      k.setAttribute('aria-pressed', String(k.dataset.ebModus === neu));
    });
    zweige.namen.hidden = neu !== 'namen';
    zweige.spaeter.hidden = neu !== 'spaeter';

    // Nur der geltende Zweig geht mit ins Formular.
    var namenAktiv = neu === 'namen';
    namenFeld.disabled = !namenAktiv;
    mengeNamen.disabled = !namenAktiv;
    anzahlFeld.disabled = !namenAktiv;
    mengeSpaeter.disabled = namenAktiv;
    if (fehler) fehler.hidden = true;
    aktualisieren();
  }

  modusKnoepfe.forEach(function (k) {
    k.addEventListener('click', function () { modusSetzen(k.dataset.ebModus); });
  });
  namenFeld.addEventListener('input', aktualisieren);
  mengeSpaeter.addEventListener('input', aktualisieren);

  if (form) {
    // Vor Dawns eigener Behandlung des Absendens: ohne Namen kein Kauf.
    form.addEventListener(
      'submit',
      function (e) {
        if (menge() > 0) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        if (modus === 'namen') {
          if (fehler) fehler.hidden = false;
          namenFeld.focus();
        } else {
          mengeSpaeter.focus();
        }
      },
      true
    );
  }

  modusSetzen('namen');
})();

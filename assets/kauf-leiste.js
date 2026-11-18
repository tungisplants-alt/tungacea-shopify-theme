/*
 * Feste Kaufleiste am Handy.
 *
 * Sie erscheint, sobald der Kaufknopf der Seite nach oben aus dem Bild
 * gescrollt ist, und verschwindet wieder, wenn er zurueckkommt. Ein Tipp
 * darauf loest den echten Knopf aus: Pruefungen, Etikett-Auswahl, Warenkorb
 * und Fehlermeldungen laufen so ueber genau einen Weg.
 *
 * Preis und Knopftext werden vom echten Abschnitt gelesen und bei jeder
 * Aenderung (Variantenwechsel ersetzt den Preis-Block) nachgezogen. Ist der
 * echte Knopf gesperrt (vergeben, ausverkauft), bleibt die Leiste unsichtbar.
 * Ohne Skript bleibt sie versteckt; die Seite funktioniert wie vorher.
 */
(function () {
  'use strict';

  var leiste = document.querySelector('[data-kauf-leiste]');
  if (!leiste) return;

  var id = leiste.getAttribute('data-section-id');
  var echt = document.getElementById('ProductSubmitButton-' + id);
  var preisBlock = document.getElementById('price-' + id);
  var knopf = leiste.querySelector('[data-kauf-leiste-knopf]');
  var preis = leiste.querySelector('[data-kauf-leiste-preis]');
  if (!echt || !knopf || !preis) return;

  var vorbei = false;

  function textVon(el) {
    var span = el.querySelector('span');
    return (span || el).textContent.replace(/\s+/g, ' ').trim();
  }

  function preisLesen() {
    if (!preisBlock) return;
    var el = preisBlock.querySelector('.price-item--last') ||
      preisBlock.querySelector('.price__regular .price-item--regular');
    var text = el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
    if (text) preis.textContent = text;
  }

  function abgleichen() {
    var t = textVon(echt);
    if (t) knopf.textContent = t;
    knopf.disabled = echt.disabled;
    var zeigen = vorbei && !echt.disabled;
    if (zeigen) {
      leiste.hidden = false;
      /* Ein Bild spaeter einblenden, damit die Eigenschaft sich aendert. */
      window.requestAnimationFrame(function () {
        leiste.classList.add('ist-da');
      });
    } else {
      leiste.classList.remove('ist-da');
      leiste.hidden = true;
    }
    document.documentElement.classList.toggle('hat-kauf-leiste', zeigen);
  }

  /* "Vorbei" heisst: der Knopf liegt oberhalb des sichtbaren Bereichs. Noch
     nicht erreicht zaehlt nicht, sonst stuende die Leiste gleich beim Laden
     ueber dem Foto. */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (eintraege) {
      var e = eintraege[eintraege.length - 1];
      vorbei = !e.isIntersecting && e.boundingClientRect.top < 0;
      abgleichen();
    }).observe(echt);
  } else {
    return;
  }

  knopf.addEventListener('click', function () {
    if (!echt.disabled) echt.click();
  });

  var beobachter = new MutationObserver(function () {
    preisLesen();
    abgleichen();
  });
  beobachter.observe(echt, { attributes: true, childList: true, subtree: true, characterData: true });
  if (preisBlock) {
    beobachter.observe(preisBlock, { childList: true, subtree: true, characterData: true });
  }

  preisLesen();
  abgleichen();
})();

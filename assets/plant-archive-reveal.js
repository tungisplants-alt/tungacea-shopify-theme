/*
 * Tungacea — Kacheln und Fokus im Archiv ruhig einblenden.
 *
 * Erst wenn dieses Skript läuft, bekommt das Archiv die Klasse, die die
 * Kacheln unsichtbar macht. Ohne Skript, ohne IntersectionObserver oder mit
 * reduzierter Bewegung steht alles sofort da.
 *
 * Kacheln, die "Mehr anzeigen" später sichtbar macht, kommen genauso herein:
 * versteckte Kacheln schneiden den Bildschirm nicht und werden erst gemeldet,
 * wenn sie erscheinen.
 */
(() => {
  const archiv = document.querySelector('[data-testid="plant-archive"]');
  if (!archiv || !('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const stuecke = Array.from(archiv.querySelectorAll('.plant-card, .plant-focus'));
  if (stuecke.length === 0) return;

  const beobachter = new IntersectionObserver(
    (meldungen) => {
      meldungen.forEach((m) => {
        if (!m.isIntersecting) return;
        m.target.classList.add('ist-da');
        beobachter.unobserve(m.target);
      });
    },
    { rootMargin: '0px 0px -6% 0px', threshold: 0.08 }
  );

  archiv.classList.add('plant-archive--einblenden');
  stuecke.forEach((s) => beobachter.observe(s));
})();

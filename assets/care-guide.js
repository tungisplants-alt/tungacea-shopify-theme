/*
 * Pflegeguide (sections/main-care-guide.liquid).
 *
 * - Stadien-Tafel: Ein Tipp auf eine Zeichnung zeigt das Stadium direkt unter
 *   der Tafel, die anderen treten zurück. Ohne Skript sind die Zeichnungen
 *   Links auf die Kästen, und alle Kästen stehen untereinander.
 * - Kapitel-Tafel: genauso. Ein Tipp zeigt nur das gewählte Kapitel unter der
 *   Tafel, das Piktogramm wird rot; man muss nicht zwischen langen Kapiteln
 *   hin und her scrollen. Ohne Skript stehen alle Kapitel untereinander.
 * - Ein Link wie /pages/pflegeguide#stadium-steckling oder #wasser wählt das
 *   Stadium oder Kapitel, auf das er zeigt.
 */
class CareGuide extends HTMLElement {
  connectedCallback() {
    this.wahlStarten();
    this.kapitelStarten();
    this.hashOeffnen();
    window.addEventListener('hashchange', () => this.hashOeffnen());
  }

  wahlStarten() {
    const wahl = this.querySelector('[data-stadien-wahl]');
    this.stufen = Array.from(this.querySelectorAll('details.care-guide__stage'));
    this.knoten = wahl ? Array.from(wahl.querySelectorAll('[data-stadium]')) : [];
    if (!this.stufen.length || !this.knoten.length) return;

    this.classList.add('care-guide--wahl');
    this.knoten.forEach((k) => {
      k.addEventListener('click', (e) => {
        e.preventDefault();
        this.waehlen(k.dataset.stadium, true);
        history.replaceState(null, '', '#stadium-' + k.dataset.stadium);
      });
    });
    // Die Klappe des gewählten Kastens schließt ihn nicht: gewählt wird an der Tafel.
    this.stufen.forEach((d) => {
      const klappe = d.querySelector('summary');
      if (klappe) klappe.addEventListener('click', (e) => e.preventDefault());
    });

    // Vorauswahl: der Steckling, weil die meisten Pflanzen als Steckling kommen;
    // sonst die erste Zeichnung.
    const vorhanden = (s) => this.knoten.some((k) => k.dataset.stadium === s);
    this.waehlen(vorhanden('steckling') ? 'steckling' : this.knoten[0].dataset.stadium, false);
  }

  kapitelStarten() {
    const tafel = this.querySelector('.care-guide__tafel--kapitel');
    this.kapitelLinks = tafel ? Array.from(tafel.querySelectorAll('a[href^="#"]')) : [];
    this.kapitel = this.kapitelLinks
      .map((a) => this.querySelector('[id="' + a.getAttribute('href').slice(1) + '"]'))
      .filter(Boolean);
    if (this.kapitel.length < 2) return;

    this.classList.add('care-guide--kapitelwahl');
    this.kapitelLinks.forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const id = a.getAttribute('href').slice(1);
        this.kapitelWaehlen(id, true);
        history.replaceState(null, '', '#' + id);
      });
    });
    this.kapitelWaehlen(this.kapitel[0].id, false);
  }

  kapitelWaehlen(id, vomTipp) {
    let gewaehlt = null;
    this.kapitel.forEach((k) => {
      const an = k.id === id;
      k.hidden = !an;
      if (an) gewaehlt = k;
    });
    this.kapitelLinks.forEach((a) => {
      a.setAttribute('aria-current', a.getAttribute('href') === '#' + id ? 'step' : 'false');
    });
    // Nur wenn der Anfang des Kapitels unter dem Bildschirmrand liegt, rückt es ins Bild.
    if (vomTipp && gewaehlt && gewaehlt.getBoundingClientRect().top > window.innerHeight - 120) {
      const ruhig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      gewaehlt.scrollIntoView({ block: 'nearest', behavior: ruhig ? 'auto' : 'smooth' });
    }
  }

  waehlen(stadium, vomTipp) {
    let gewaehlt = null;
    this.stufen.forEach((d) => {
      const an = d.id === 'stadium-' + stadium;
      d.hidden = !an;
      d.open = an;
      if (an) gewaehlt = d;
    });
    this.knoten.forEach((k) => {
      k.setAttribute('aria-current', k.dataset.stadium === stadium ? 'step' : 'false');
    });
    // Nur wenn das Stadium unter dem Bildschirmrand liegt, rückt es ins Bild.
    if (vomTipp && gewaehlt) {
      const unten = gewaehlt.getBoundingClientRect().top > window.innerHeight - 120;
      if (unten) {
        const ruhig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        gewaehlt.scrollIntoView({ block: 'nearest', behavior: ruhig ? 'auto' : 'smooth' });
      }
    }
  }

  hashOeffnen() {
    const id = decodeURIComponent((window.location.hash || '').replace(/^#/, ''));
    if (!id) return;
    const ziel = this.querySelector('[id="' + id.replace(/"/g, '') + '"]');
    if (ziel && this.kapitel && this.kapitel.includes(ziel)) {
      this.kapitelWaehlen(id, false);
      const tafel = this.querySelector('.care-guide__tafel--kapitel');
      if (tafel) tafel.scrollIntoView({ block: 'start' });
      return;
    }
    if (!ziel || ziel.tagName !== 'DETAILS') return;
    if (this.classList.contains('care-guide--wahl')) {
      this.waehlen(id.replace(/^stadium-/, ''), false);
      const wahl = this.querySelector('[data-stadien-wahl]');
      if (wahl) wahl.scrollIntoView({ block: 'start' });
    } else {
      ziel.open = true;
      ziel.scrollIntoView({ block: 'start' });
    }
  }
}

if (!customElements.get('care-guide')) customElements.define('care-guide', CareGuide);

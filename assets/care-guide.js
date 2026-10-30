/*
 * Pflegeguide (sections/main-care-guide.liquid).
 *
 * Zwei kleine Dinge, der Rest ist reines HTML und CSS:
 * - Ein Link wie /pages/pflegeguide#stadium-steckling öffnet das Stadium, auf das
 *   er zeigt; ohne Skript bliebe der Kasten zu.
 * - Die Kapitel-Leiste läuft am Rand weich aus, wo man noch wischen kann
 *   (Attribute data-mehr-links / data-mehr-rechts, das CSS blendet die Kante aus).
 */
class CareGuide extends HTMLElement {
  connectedCallback() {
    this.leiste = this.querySelector('.care-guide__nav');
    this.hashOeffnen();
    window.addEventListener('hashchange', () => this.hashOeffnen());

    if (this.leiste) {
      const pruefen = () => {
        const max = this.leiste.scrollWidth - this.leiste.clientWidth;
        this.leiste.toggleAttribute('data-mehr-links', this.leiste.scrollLeft > 2);
        this.leiste.toggleAttribute('data-mehr-rechts', max > 2 && this.leiste.scrollLeft < max - 2);
      };
      this.leiste.addEventListener('scroll', pruefen, { passive: true });
      window.addEventListener('resize', pruefen);
      pruefen();
    }
  }

  hashOeffnen() {
    const id = decodeURIComponent((window.location.hash || '').replace(/^#/, ''));
    if (!id) return;
    const ziel = this.querySelector('[id="' + id.replace(/"/g, '') + '"]');
    if (ziel && ziel.tagName === 'DETAILS') {
      ziel.open = true;
      ziel.scrollIntoView({ block: 'start' });
    }
  }
}

if (!customElements.get('care-guide')) customElements.define('care-guide', CareGuide);

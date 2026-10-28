/*
 * Tungacea — "Mehr anzeigen" in der Kollektion.
 *
 * Der Knopf ist ein ganz gewoehnlicher Link auf die naechste Seite. Ohne dieses
 * Skript fuehrt er dorthin. Mit Skript holt es die Seite im Hintergrund (derselbe
 * Abschnitts-Aufruf wie bei Dawns Filterung), haengt die Karten an die Liste und
 * aktualisiert Strich und Zahl. Die neue Seite liefert ihre eigene Fusszeile
 * mit, daraus kommen "naechste Seite" und "wie viele schon da sind".
 *
 * Dawns Seitenleiste darunter bleibt im Dokument und wird per CSS ausgeblendet,
 * sobald dieses Element laeuft (data-aktiv).
 */
class CatalogueMore extends HTMLElement {
  connectedCallback() {
    this.setAttribute('data-aktiv', '');
    this.knopf = this.querySelector('.catalogue-more__button');
    if (!this.knopf) return;
    this.knopf.addEventListener('click', (e) => {
      e.preventDefault();
      this.laden();
    });
  }

  adresse() {
    const naechste = this.dataset.next;
    const trenner = naechste.includes('?') ? '&' : '?';
    return `${naechste}${trenner}section_id=${encodeURIComponent(this.dataset.sectionId)}`;
  }

  async laden() {
    if (this.laedt || !this.dataset.next) return;
    this.laedt = true;
    this.knopf.setAttribute('aria-busy', 'true');
    try {
      const antwort = await fetch(this.adresse());
      if (!antwort.ok) throw new Error('Antwort ' + antwort.status);
      const doc = new DOMParser().parseFromString(await antwort.text(), 'text/html');
      const neueListe = doc.getElementById('product-grid');
      const liste = document.getElementById('product-grid');
      if (!neueListe || !liste) throw new Error('keine Liste');

      const vorher = liste.children.length;
      Array.from(neueListe.children).forEach((karte) => {
        /* Dawns Einblenden beim Scrollen wuerde neue Karten unsichtbar lassen. */
        karte.querySelectorAll('.scroll-trigger').forEach((el) => el.classList.add('scroll-trigger--cancel'));
        karte.classList.add('scroll-trigger--cancel');
        liste.appendChild(karte);
      });

      const neu = doc.querySelector('catalogue-more');
      this.dataset.next = (neu && neu.dataset.next) || '';
      this.dataset.shown = String(liste.children.length);
      this.zeigen();

      const erste = liste.children[vorher];
      const link = erste && erste.querySelector('a');
      if (link) link.focus({ preventScroll: true });
    } catch (fehler) {
      /* Das Skript gibt auf und laesst den Link arbeiten: die Seite laedt normal. */
      window.location.href = this.dataset.next;
    } finally {
      this.laedt = false;
      this.knopf.removeAttribute('aria-busy');
    }
  }

  zeigen() {
    const gezeigt = parseInt(this.dataset.shown, 10) || 0;
    const gesamt = parseInt(this.dataset.total, 10) || gezeigt;
    const text = this.querySelector('.catalogue-more__text');
    const strich = this.querySelector('.catalogue-more__line span');
    const vorlage = this.dataset.textGezeigt || '%gezeigt% von %gesamt% angezeigt';
    if (text) text.textContent = vorlage.replace('%gezeigt%', gezeigt).replace('%gesamt%', gesamt);
    if (strich) strich.style.width = Math.min(100, Math.round((gezeigt / gesamt) * 100)) + '%';
    if (this.knopf) {
      this.knopf.href = this.dataset.next || '#';
      this.knopf.hidden = !this.dataset.next;
    }
  }
}

if (!customElements.get('catalogue-more')) {
  customElements.define('catalogue-more', CatalogueMore);
}

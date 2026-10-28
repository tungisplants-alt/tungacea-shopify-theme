/*
 * Tungacea — Filterblatt der Kollektion (Telefon).
 *
 * Das Blatt ist ein gewoehnliches Formular mit GET: ohne dieses Skript tippt man
 * auf "Ergebnisse anzeigen" und die Seite laedt mit der Auswahl neu. Das Skript
 * ergaenzt nur zwei Dinge:
 * - das Blatt oeffnet und schliesst sich (Knopf, Kreuz, Schleier, Escape),
 * - waehrend der Auswahl holt es still die Trefferzahl und schreibt sie in den
 *   Knopf ("5 Pflanzen anzeigen"). Das geschieht ueber dieselbe Abschnitts-
 *   Abfrage wie bei Dawns eigener Filterung (section_id), liest aber nur die
 *   Zahl und fasst die Seite nicht an.
 *
 * Dawns Skript (facets.js) arbeitet unabhaengig weiter; dieses Element liegt
 * ausserhalb seiner Formulare.
 */
class CatalogueFilter extends HTMLElement {
  connectedCallback() {
    this.knopf = this.querySelector('.catalogue-filter__button');
    this.blatt = this.querySelector('.catalogue-filter__sheet');
    this.schleier = this.querySelector('.catalogue-filter__backdrop');
    this.zu = this.querySelector('.catalogue-filter__close');
    this.form = this.querySelector('.catalogue-filter__form');
    this.ok = this.querySelector('.catalogue-filter__apply');
    if (!this.knopf || !this.blatt) return;

    this.sectionId = this.dataset.sectionId;
    this.zaehlTimer = null;
    this.abbruch = null;

    this.knopf.addEventListener('click', () => (this.blatt.hidden ? this.oeffnen() : this.schliessen()));
    if (this.zu) this.zu.addEventListener('click', () => this.schliessen());
    if (this.schleier) this.schleier.addEventListener('click', () => this.schliessen());

    this.blatt.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.schliessen();
      } else if (e.key === 'Tab') {
        this.fokusHalten(e);
      }
    });

    if (this.form) {
      this.form.addEventListener('change', () => this.zaehlenSpaeter());
      this.form.addEventListener('input', (e) => {
        if (e.target.type === 'number') this.zaehlenSpaeter();
      });
      /* Leere Preisfelder nicht mitschicken, sonst steht ein leerer Filter in der Adresse. */
      this.form.addEventListener('submit', () => {
        this.form.querySelectorAll('input[type="number"]').forEach((feld) => {
          if (feld.value.trim() === '') feld.disabled = true;
        });
      });
    }
  }

  oeffnen() {
    this.blatt.hidden = false;
    if (this.schleier) this.schleier.hidden = false;
    this.knopf.setAttribute('aria-expanded', 'true');
    document.documentElement.classList.add('catalogue-filter-lock');
    if (this.zu) this.zu.focus({ preventScroll: true });
  }

  schliessen() {
    if (this.blatt.hidden) return;
    this.blatt.hidden = true;
    if (this.schleier) this.schleier.hidden = true;
    this.knopf.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('catalogue-filter-lock');
    this.knopf.focus({ preventScroll: true });
  }

  fokusHalten(e) {
    const ziele = Array.from(
      this.blatt.querySelectorAll('button:not([hidden]):not([disabled]), a[href], input:not([disabled])')
    ).filter((el) => el.offsetParent !== null);
    if (ziele.length === 0) return;
    const erstes = ziele[0];
    const letztes = ziele[ziele.length - 1];
    if (e.shiftKey && document.activeElement === erstes) {
      e.preventDefault();
      letztes.focus();
    } else if (!e.shiftKey && document.activeElement === letztes) {
      e.preventDefault();
      erstes.focus();
    }
  }

  zaehlenSpaeter() {
    clearTimeout(this.zaehlTimer);
    this.zaehlTimer = setTimeout(() => this.zaehlen(), 250);
  }

  suchparameter() {
    const params = new URLSearchParams();
    new FormData(this.form).forEach((wert, name) => {
      if (typeof wert === 'string' && wert.trim() !== '') params.append(name, wert);
    });
    return params;
  }

  async zaehlen() {
    if (!this.ok || !this.sectionId) return;
    if (this.abbruch) this.abbruch.abort();
    this.abbruch = new AbortController();
    const params = this.suchparameter();
    params.set('section_id', this.sectionId);
    const basis = this.form.getAttribute('action') || window.location.pathname;
    try {
      const antwort = await fetch(`${basis}?${params.toString()}`, { signal: this.abbruch.signal });
      const html = await antwort.text();
      const zaehler = new DOMParser().parseFromString(html, 'text/html').getElementById('ProductCount');
      const zahl = zaehler ? parseInt(zaehler.dataset.productCount, 10) : NaN;
      if (Number.isNaN(zahl)) return;
      if (zahl === 0) this.ok.textContent = this.ok.dataset.textKeine;
      else if (zahl === 1) this.ok.textContent = this.ok.dataset.textEins;
      else this.ok.textContent = (this.ok.dataset.textViele || '%anzahl%').replace('%anzahl%', zahl);
    } catch (fehler) {
      /* Abgebrochen oder offline: der Knopf behaelt seinen allgemeinen Text. */
    }
  }
}

if (!customElements.get('catalogue-filter')) {
  customElements.define('catalogue-filter', CatalogueFilter);
}

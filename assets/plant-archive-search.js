/*
 * Tungacea — Suche und Filter im Archiv.
 *
 * Läuft vollständig im Browser: es geht um wenige Dutzend Kacheln, die ohnehin
 * schon auf der Seite stehen. Kein Netzaufruf, kein Nachladen, keine leere
 * Sekunde zwischen Tastendruck und Ergebnis.
 *
 * Das Element ist in der Vorlage `hidden`. Erst dieses Skript nimmt die Marke
 * weg. Wo es nicht läuft, bleibt die Leiste unsichtbar und die Galerie
 * vollständig sichtbar — eine Suche, die wegen eines fehlenden Skripts nichts
 * findet, wäre schlimmer als gar keine.
 */
class PlantArchiveSearch extends HTMLElement {
  connectedCallback() {
    this.grid = document.querySelector('[data-testid="plant-archive-grid"]');
    if (!this.grid) return;

    this.eintraege = Array.from(this.grid.children).map((li) => ({
      huelle: li,
      karte: li.querySelector('.plant-card'),
    })).filter((e) => e.karte);
    if (this.eintraege.length === 0) return;

    this.feld = this.querySelector('.plant-search__input');
    this.loeschen = this.querySelector('.plant-search__clear');
    this.zaehler = this.querySelector('.plant-search__count');
    this.chips = Array.from(this.querySelectorAll('.plant-search__chip'));
    this.gesamt = this.eintraege.length;

    this.vorlagen = {
      alle: this.dataset.textAlle || '%anzahl% Pflanzen',
      teil: this.dataset.textTeil || '%treffer% von %gesamt% Pflanzen',
      keine: this.dataset.textKeine || 'Keine Pflanze passt dazu.',
    };

    this.begriff = '';
    this.aktiv = {
      angebot: new Set(),
      stadium: new Set(),
      generation: new Set(),
      herkunft: new Set(),
      zuechter: new Set(),
    };

    this.ausklapper = this.querySelector('.plant-search__filters');
    this.marke = this.querySelector('.plant-search__badge');

    if (this.feld) {
      this.feld.addEventListener('input', () => {
        this.begriff = this.feld.value.trim().toLowerCase();
        this.anwenden();
      });
      // Enter soll in einem Suchfeld nichts abschicken; es gibt kein Formular.
      this.feld.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') e.preventDefault();
        if (e.key === 'Escape' && this.feld.value !== '') {
          e.preventDefault();
          this.zuruecksetzen();
        }
      });
    }

    this.chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const gruppe = chip.dataset.facet;
        const wert = chip.dataset.wert;
        const menge = this.aktiv[gruppe];
        if (!menge) return;
        if (menge.has(wert)) {
          menge.delete(wert);
          chip.setAttribute('aria-pressed', 'false');
        } else {
          menge.add(wert);
          chip.setAttribute('aria-pressed', 'true');
        }
        this.anwenden();
      });
    });

    if (this.loeschen) {
      this.loeschen.addEventListener('click', () => this.zuruecksetzen());
    }

    this.hidden = false;
    this.anwenden();
  }

  zuruecksetzen() {
    if (this.feld) this.feld.value = '';
    this.begriff = '';
    Object.values(this.aktiv).forEach((menge) => menge.clear());
    this.chips.forEach((chip) => chip.setAttribute('aria-pressed', 'false'));
    this.anwenden();
    if (this.feld) this.feld.focus();
  }

  /*
   * Innerhalb einer Gruppe gilt ODER, zwischen den Gruppen UND. Wer "Steckling"
   * und "Sämling" wählt, will beide sehen; wer zusätzlich einen Züchter wählt,
   * will beide Stadien von diesem Züchter. Das ist die Erwartung aus jedem
   * Bibliothekskatalog.
   */
  passt(karte) {
    if (this.begriff) {
      const text = karte.dataset.suche || '';
      // Mehrere Wörter müssen alle vorkommen, in beliebiger Reihenfolge.
      const woerter = this.begriff.split(/\s+/).filter(Boolean);
      if (!woerter.every((w) => text.includes(w))) return false;
    }
    for (const [gruppe, menge] of Object.entries(this.aktiv)) {
      if (menge.size === 0) continue;
      if (!menge.has(karte.dataset[gruppe] || '')) return false;
    }
    return true;
  }

  anwenden() {
    let treffer = 0;
    this.eintraege.forEach(({ huelle, karte }) => {
      const sichtbar = this.passt(karte);
      huelle.hidden = !sichtbar;
      if (sichtbar) treffer += 1;
    });

    const gesetzteFilter = Object.values(this.aktiv)
      .reduce((summe, menge) => summe + menge.size, 0);

    if (this.loeschen) {
      this.loeschen.hidden = this.begriff === '' && gesetzteFilter === 0;
    }

    /*
     * Eingeklappt waere eine gesetzte Einschraenkung sonst unsichtbar, und die
     * Galerie zeigte ohne erkennbaren Grund weniger Pflanzen.
     */
    if (this.marke) {
      this.marke.textContent = gesetzteFilter > 0 ? String(gesetzteFilter) : '';
      this.marke.hidden = gesetzteFilter === 0;
    }
    if (this.ausklapper) {
      this.ausklapper.classList.toggle('is-aktiv', gesetzteFilter > 0);
    }

    if (!this.zaehler) return;
    if (treffer === 0) {
      this.zaehler.textContent = this.vorlagen.keine;
    } else if (treffer === this.gesamt) {
      this.zaehler.textContent = this.vorlagen.alle.replace('%anzahl%', this.gesamt);
    } else {
      this.zaehler.textContent = this.vorlagen.teil
        .replace('%treffer%', treffer)
        .replace('%gesamt%', this.gesamt);
    }
  }
}

if (!customElements.get('plant-archive-search')) {
  customElements.define('plant-archive-search', PlantArchiveSearch);
}

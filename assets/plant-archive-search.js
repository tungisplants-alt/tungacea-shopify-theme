/*
 * Tungacea — Suche, Filter und Seitenweise Anzeige im Archiv.
 *
 * Läuft vollständig im Browser: die Kacheln stehen ohnehin schon auf der Seite.
 * Kein Netzaufruf, keine leere Sekunde zwischen Tastendruck und Ergebnis.
 *
 * Das Element ist in der Vorlage `hidden`. Erst dieses Skript nimmt die Marke
 * weg. Wo es nicht läuft, bleibt die Leiste unsichtbar und die Galerie
 * vollständig sichtbar — eine Suche, die wegen eines fehlenden Skripts nichts
 * findet, wäre schlimmer als gar keine.
 *
 * Bedienung:
 * - Schnellwahl oben (Alle, Stadien, Angebot) und das Filterblatt schalten
 *   dieselben Filter. Der Zustand liegt nur hier, die Knöpfe spiegeln ihn.
 * - Das Blatt öffnet sich mit dem Filterknopf, schließt mit Kreuz, Hintergrund
 *   oder Escape. Die Auswahl gilt sofort.
 * - Die Liste zeigt zuerst eine Seite voll Treffer; "Mehr anzeigen" holt die
 *   nächste. Gefiltert wird immer über alle Kacheln, nicht nur über die
 *   gezeigten.
 */
class PlantArchiveSearch extends HTMLElement {
  /* Merkmale, in denen mehrere Werte durch | getrennt stehen koennen. */
  static MEHRFACH = new Set(['linie', 'merkmale']);

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
    this.tabs = Array.from(this.querySelectorAll('.plant-search__tab'));
    this.aktivListe = this.querySelector('.plant-search__active');
    this.aktivZeile = this.querySelector('.plant-search__active-row');
    this.gesamt = this.eintraege.length;

    this.vorlagen = {
      alle: this.dataset.textAlle || '%anzahl% Pflanzen',
      teil: this.dataset.textTeil || '%treffer% von %gesamt% Pflanzen',
      keine: this.dataset.textKeine || 'Keine Pflanze passt dazu.',
      gezeigt: this.dataset.textGezeigt || '%gezeigt% von %gesamt% angezeigt',
      entfernen: this.dataset.textEntfernen || '%name% entfernen',
    };

    this.seite = Math.max(1, parseInt(this.dataset.seite, 10) || 12);
    this.sichtbarBis = this.seite;

    this.begriff = '';
    this.aktiv = {
      angebot: new Set(),
      linie: new Set(),
      merkmale: new Set(),
      reinheit: new Set(),
      stadium: new Set(),
      generation: new Set(),
      herkunft: new Set(),
      zuechter: new Set(),
    };

    this.filterKnopf = this.querySelector('.plant-search__filter-button');
    this.blatt = this.querySelector('.plant-search__sheet');
    this.hintergrund = this.querySelector('.plant-search__backdrop');
    this.marke = this.querySelector('.plant-search__badge');
    this.blattReset = this.querySelector('.plant-search__sheet-reset');
    this.blattZu = this.querySelector('.plant-search__sheet-close');
    this.blattOk = this.querySelector('.plant-search__sheet-apply');

    this.mehr = document.querySelector('[data-testid="plant-archive-more"]');
    this.mehrText = this.mehr && this.mehr.querySelector('.plant-archive__more-text');
    this.mehrStrich = this.mehr && this.mehr.querySelector('.plant-archive__more-line span');
    this.mehrKnopf = this.mehr && this.mehr.querySelector('.plant-archive__more-button');

    if (this.feld) {
      this.feld.addEventListener('input', () => {
        this.begriff = this.feld.value.trim().toLowerCase();
        this.sichtbarBis = this.seite;
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
        this.umschalten(chip.dataset.facet, chip.dataset.wert);
        this.sichtbarBis = this.seite;
        this.anwenden();
      });
    });

    this.tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const art = tab.dataset.einstieg;
        if (art === 'alle') {
          this.aktiv.stadium.clear();
          this.aktiv.angebot.clear();
        } else if (art === 'stadium') {
          /* Ein Stadium zur Zeit: die Schnellwahl ersetzt, das Blatt addiert. */
          const schonSo = this.aktiv.stadium.size === 1 && this.aktiv.stadium.has(tab.dataset.wert);
          this.aktiv.stadium.clear();
          if (!schonSo) this.aktiv.stadium.add(tab.dataset.wert);
        } else if (art === 'angebot') {
          if (this.aktiv.angebot.has('ja')) this.aktiv.angebot.delete('ja');
          else this.aktiv.angebot.add('ja');
        }
        this.sichtbarBis = this.seite;
        this.anwenden();
      });
    });

    if (this.loeschen) {
      this.loeschen.addEventListener('click', () => this.zuruecksetzen());
    }
    if (this.blattReset) {
      this.blattReset.addEventListener('click', () => this.zuruecksetzen({ fokus: false }));
    }

    if (this.filterKnopf && this.blatt) {
      this.filterKnopf.addEventListener('click', () => {
        if (this.blatt.hidden) this.oeffnen();
        else this.schliessen();
      });
      if (this.blattZu) this.blattZu.addEventListener('click', () => this.schliessen());
      if (this.blattOk) this.blattOk.addEventListener('click', () => this.schliessen());
      if (this.hintergrund) this.hintergrund.addEventListener('click', () => this.schliessen());
      this.blatt.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          this.schliessen();
        } else if (e.key === 'Tab' && this.istTelefon()) {
          this.fokusHalten(e);
        }
      });
    }

    if (this.mehrKnopf) {
      this.mehrKnopf.addEventListener('click', () => {
        const vorher = this.sichtbareKarten().length;
        this.sichtbarBis += this.seite;
        this.anwenden();
        const neu = this.sichtbareKarten()[vorher];
        const link = neu && neu.karte.querySelector('a');
        if (link) link.focus({ preventScroll: true });
      });
    }

    this.hidden = false;
    this.anwenden();
  }

  umschalten(gruppe, wert) {
    const menge = this.aktiv[gruppe];
    if (!menge) return;
    if (menge.has(wert)) menge.delete(wert);
    else menge.add(wert);
  }

  istTelefon() {
    return window.matchMedia('(max-width: 749px)').matches;
  }

  oeffnen() {
    this.blatt.hidden = false;
    this.filterKnopf.setAttribute('aria-expanded', 'true');
    if (this.istTelefon()) {
      this.blatt.setAttribute('aria-modal', 'true');
      if (this.hintergrund) this.hintergrund.hidden = false;
      document.documentElement.classList.add('plant-search-lock');
      this.letzterFokus = this.filterKnopf;
      if (this.blattZu) this.blattZu.focus({ preventScroll: true });
    }
  }

  schliessen() {
    if (!this.blatt || this.blatt.hidden) return;
    this.blatt.hidden = true;
    this.blatt.removeAttribute('aria-modal');
    if (this.hintergrund) this.hintergrund.hidden = true;
    document.documentElement.classList.remove('plant-search-lock');
    this.filterKnopf.setAttribute('aria-expanded', 'false');
    this.filterKnopf.focus({ preventScroll: true });
  }

  /* Am Telefon ist das Blatt modal: der Tab-Fokus bleibt darin. */
  fokusHalten(e) {
    const ziele = Array.from(this.blatt.querySelectorAll('button:not([hidden]):not([disabled])'));
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

  zuruecksetzen({ fokus = true } = {}) {
    if (this.feld) this.feld.value = '';
    this.begriff = '';
    Object.values(this.aktiv).forEach((menge) => menge.clear());
    this.sichtbarBis = this.seite;
    this.anwenden();
    if (fokus && this.feld) this.feld.focus();
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
      const roh = karte.dataset[gruppe] || '';
      if (PlantArchiveSearch.MEHRFACH.has(gruppe)) {
        /*
         * Eine Kreuzung traegt mehrere Linien, eine Pflanze mehrere Merkmale.
         * Sie passt, sobald eines davon gewaehlt ist — wer nach Dressleri
         * sucht, will auch die Luxurians x Dressleri sehen.
         */
        const eigene = roh ? roh.split('|') : [];
        if (!eigene.some((w) => menge.has(w))) return false;
      } else if (!menge.has(roh)) {
        return false;
      }
    }
    return true;
  }

  sichtbareKarten() {
    return this.eintraege.filter((e) => !e.huelle.hidden);
  }

  /* Die Beschriftung eines Schalters, so wie der Besucher sie liest. */
  beschriftung(gruppe, wert) {
    const chip = this.chips.find((c) => c.dataset.facet === gruppe && c.dataset.wert === wert);
    return chip ? chip.textContent.replace(/\s+/g, ' ').trim() : wert;
  }

  anwenden() {
    const treffer = this.eintraege.filter(({ karte }) => this.passt(karte));
    const trefferZahl = treffer.length;

    /* Erst alle verbergen, dann die ersten sichtbarBis Treffer zeigen. */
    this.eintraege.forEach((e) => { e.huelle.hidden = true; });
    treffer.slice(0, this.sichtbarBis).forEach((e) => { e.huelle.hidden = false; });

    const gesetzteFilter = Object.values(this.aktiv)
      .reduce((summe, menge) => summe + menge.size, 0);

    if (this.aktivZeile) {
      this.aktivZeile.hidden = this.begriff === '' && gesetzteFilter === 0;
    }
    if (this.blattReset) this.blattReset.hidden = gesetzteFilter === 0;

    /*
     * Zugeklappt waere eine gesetzte Einschraenkung sonst unsichtbar, und die
     * Galerie zeigte ohne erkennbaren Grund weniger Pflanzen.
     */
    if (this.marke) {
      this.marke.textContent = gesetzteFilter > 0 ? String(gesetzteFilter) : '';
      this.marke.hidden = gesetzteFilter === 0;
    }
    if (this.filterKnopf) {
      this.filterKnopf.classList.toggle('is-aktiv', gesetzteFilter > 0);
    }

    this.spiegeln();
    this.aktiveZeigen();
    this.zahlenSchreiben(trefferZahl);
    this.fussZeigen(trefferZahl);
  }

  /* Knöpfe zeigen den Zustand, sie halten ihn nicht. */
  spiegeln() {
    this.chips.forEach((chip) => {
      const menge = this.aktiv[chip.dataset.facet];
      chip.setAttribute('aria-pressed', menge && menge.has(chip.dataset.wert) ? 'true' : 'false');
    });
    this.tabs.forEach((tab) => {
      const art = tab.dataset.einstieg;
      let an = false;
      if (art === 'alle') {
        an = this.aktiv.stadium.size === 0 && this.aktiv.angebot.size === 0;
      } else if (art === 'stadium') {
        an = this.aktiv.stadium.has(tab.dataset.wert);
      } else if (art === 'angebot') {
        an = this.aktiv.angebot.has('ja');
      }
      tab.setAttribute('aria-pressed', an ? 'true' : 'false');
    });
  }

  aktiveZeigen() {
    if (!this.aktivListe) return;
    this.aktivListe.textContent = '';
    let anzahl = 0;
    Object.entries(this.aktiv).forEach(([gruppe, menge]) => {
      menge.forEach((wert) => {
        const name = this.beschriftung(gruppe, wert);
        const li = document.createElement('li');
        const knopf = document.createElement('button');
        knopf.type = 'button';
        knopf.className = 'plant-search__active-chip';
        knopf.setAttribute('aria-label', this.vorlagen.entfernen.replace('%name%', name));
        const text = document.createElement('span');
        text.textContent = name;
        const kreuz = document.createElement('span');
        kreuz.setAttribute('aria-hidden', 'true');
        kreuz.textContent = '✕';
        knopf.append(text, kreuz);
        knopf.addEventListener('click', () => {
          menge.delete(wert);
          this.sichtbarBis = this.seite;
          this.anwenden();
        });
        li.appendChild(knopf);
        this.aktivListe.appendChild(li);
        anzahl += 1;
      });
    });
    this.aktivListe.hidden = anzahl === 0;
  }

  zahlenSchreiben(trefferZahl) {
    /* Zahlen an der Schnellwahl: immer der Gesamtbestand, nicht der Treffer. */
    this.tabs.forEach((tab) => {
      const ziel = tab.querySelector('.plant-search__tab-count');
      if (!ziel) return;
      const art = tab.dataset.einstieg;
      let n = this.gesamt;
      if (art === 'stadium') {
        n = this.eintraege.filter((e) => (e.karte.dataset.stadium || '') === tab.dataset.wert).length;
      } else if (art === 'angebot') {
        n = this.eintraege.filter((e) => e.karte.dataset.angebot === 'ja').length;
      }
      ziel.textContent = String(n);
    });

    if (this.blattOk) {
      let satz;
      if (trefferZahl === 0) satz = this.blattOk.dataset.textKeine;
      else if (trefferZahl === 1) satz = this.blattOk.dataset.textEins;
      else satz = (this.blattOk.dataset.textViele || '%anzahl%').replace('%anzahl%', trefferZahl);
      this.blattOk.textContent = satz;
    }

    if (!this.zaehler) return;
    if (trefferZahl === 0) {
      this.zaehler.textContent = this.vorlagen.keine;
    } else if (trefferZahl === this.gesamt) {
      this.zaehler.textContent = this.vorlagen.alle.replace('%anzahl%', this.gesamt);
    } else {
      this.zaehler.textContent = this.vorlagen.teil
        .replace('%treffer%', trefferZahl)
        .replace('%gesamt%', this.gesamt);
    }
  }

  /* Die Fusszeile erscheint nur, wenn mehr Treffer da sind als gezeigt werden. */
  fussZeigen(trefferZahl) {
    if (!this.mehr) return;
    const gezeigt = Math.min(this.sichtbarBis, trefferZahl);
    const mehrDa = trefferZahl > this.seite;
    this.mehr.hidden = !mehrDa;
    if (!mehrDa) return;
    this.mehrText.textContent = this.vorlagen.gezeigt
      .replace('%gezeigt%', gezeigt)
      .replace('%gesamt%', trefferZahl);
    this.mehrStrich.style.width = Math.round((gezeigt / trefferZahl) * 100) + '%';
    this.mehrKnopf.hidden = gezeigt >= trefferZahl;
  }
}

if (!customElements.get('plant-archive-search')) {
  customElements.define('plant-archive-search', PlantArchiveSearch);
}

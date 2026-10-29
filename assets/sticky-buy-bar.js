/*
 * Feste Kaufleiste (siehe snippets/sticky-buy-bar.liquid).
 *
 * Zeigt sich, wenn der Kaufknopf der Seite nach oben aus dem Bild gescrollt
 * ist und er kaufbar ist. Bei einem Variantenwechsel ersetzt Dawn Teile der
 * Produktinfo; deshalb wird bei jeder Änderung neu gesucht, statt sich einen
 * Knoten zu merken.
 */
if (!customElements.get('sticky-buy-bar')) {
  customElements.define(
    'sticky-buy-bar',
    class StickyBuyBar extends HTMLElement {
      connectedCallback() {
        this.sectionId = this.dataset.sectionId;
        this.priceAnzeige = this.querySelector('[data-sticky-price]');
        this.knopf = this.querySelector('[data-sticky-button]');
        this.hauptKnopf = null;
        this.vorbei = false;

        this.beobachter = new IntersectionObserver((eintraege) => {
          const e = eintraege[eintraege.length - 1];
          this.vorbei = !e.isIntersecting && e.boundingClientRect.top < 0;
          this.aktualisieren();
        });

        this.knopf.addEventListener('click', () => {
          if (this.hauptKnopf && !this.kaufbar()) return;
          if (this.hauptKnopf) this.hauptKnopf.click();
        });

        this.aenderungen = new MutationObserver(() => {
          if (this.geplant) return;
          this.geplant = true;
          requestAnimationFrame(() => {
            this.geplant = false;
            this.suchen();
          });
        });
        this.aenderungen.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['disabled', 'aria-disabled'],
        });
        this.suchen();
      }

      disconnectedCallback() {
        if (this.beobachter) this.beobachter.disconnect();
        if (this.aenderungen) this.aenderungen.disconnect();
        document.body.classList.remove('has-buy-bar');
      }

      kaufbar() {
        const k = this.hauptKnopf;
        return !!k && !k.disabled && k.getAttribute('aria-disabled') !== 'true';
      }

      suchen() {
        const neu = document.getElementById('ProductSubmitButton-' + this.sectionId);
        if (neu !== this.hauptKnopf) {
          this.beobachter.disconnect();
          this.hauptKnopf = neu;
          if (neu) this.beobachter.observe(neu);
        }
        this.preisLesen();
        this.aktualisieren();
      }

      preisLesen() {
        const kasten = document.getElementById('price-' + this.sectionId);
        if (!kasten || !this.priceAnzeige) return;
        const preis = kasten.querySelector('.price');
        if (!preis) return;
        const zeile = preis.classList.contains('price--on-sale')
          ? preis.querySelector('.price-item--sale')
          : preis.querySelector('.price__regular .price-item--regular') || preis.querySelector('.price-item');
        const text = zeile ? zeile.textContent.trim() : '';
        if (text && text !== this.priceAnzeige.textContent.trim()) this.priceAnzeige.textContent = text;
      }

      aktualisieren() {
        const sichtbar = this.vorbei && this.kaufbar();
        this.classList.toggle('is-visible', sichtbar);
        this.knopf.tabIndex = sichtbar ? 0 : -1;
        document.body.classList.toggle('has-buy-bar', sichtbar);
      }
    }
  );
}

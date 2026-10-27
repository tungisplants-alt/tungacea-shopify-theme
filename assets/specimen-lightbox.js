/*
  Tungacea — Specimen lightbox.

  Opens a mother plant photo at full size. Built on the native <dialog>, which
  brings the focus trap, Escape and the inert background with it; only opening,
  the backdrop click and returning focus are ours.

  Scoped to one <specimen-lightbox> element, so several passports on one page
  never talk to each other's dialog.
*/
class SpecimenLightbox extends HTMLElement {
  connectedCallback() {
    this.dialog = this.querySelector('dialog');
    this.image = this.querySelector('[data-lightbox-image]');
    if (!this.dialog || !this.image) return;

    this.opener = null;

    this.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-lightbox-full]');
      if (trigger && this.contains(trigger)) {
        this.open(trigger);
        return;
      }
      if (event.target.closest('[data-lightbox-close]')) {
        this.dialog.close();
      }
    });

    // A click on the backdrop lands on the dialog itself, never on its content.
    this.dialog.addEventListener('click', (event) => {
      if (event.target === this.dialog) this.dialog.close();
    });

    // Give focus back to the tile that opened it — otherwise it falls to the
    // document and the next Tab starts over at the top of the page.
    this.dialog.addEventListener('close', () => {
      if (this.opener && document.contains(this.opener)) this.opener.focus();
      this.opener = null;
    });
  }

  open(trigger) {
    this.image.src = trigger.dataset.lightboxFull;
    this.image.alt = trigger.dataset.lightboxAlt || '';
    this.opener = trigger;

    if (typeof this.dialog.showModal === 'function') {
      this.dialog.showModal();
    } else {
      this.dialog.setAttribute('open', '');
    }
  }
}

if (!customElements.get('specimen-lightbox')) {
  customElements.define('specimen-lightbox', SpecimenLightbox);
}

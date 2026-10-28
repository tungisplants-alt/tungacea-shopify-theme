if (!customElements.get('product-modal')) {
  customElements.define(
    'product-modal',
    class ProductModal extends ModalDialog {
      constructor() {
        super();

        /*
         * Ein Tipp irgendwo in der Vollbild-Ansicht schliesst sie, nicht nur
         * das Kreuz. Dawn schliesst bei der Maus schon per pointerup; am
         * Telefon hat es das bewusst ausgelassen, weil dort auch gewischt und
         * gezoomt wird. Ein click entsteht nur bei einem echten Tipp, nicht bei
         * Wischen oder Aufziehen mit zwei Fingern. Videos und 3D-Modelle
         * behalten ihre eigene Bedienung. Hat die Maus die Ansicht schon
         * geschlossen, ist sie hier nicht mehr offen und es passiert nichts.
         */
        this.addEventListener('click', (event) => {
          if (!this.hasAttribute('open')) return;
          if (event.target.closest('deferred-media, product-model, .product-media-modal__toggle')) return;
          this.hide();
        });
      }

      hide() {
        super.hide();
      }

      show(opener) {
        super.show(opener);
        this.showActiveMedia();
      }

      showActiveMedia() {
        this.querySelectorAll(
          `[data-media-id]:not([data-media-id="${this.openedBy.getAttribute('data-media-id')}"])`
        ).forEach((element) => {
          element.classList.remove('active');
        });
        const activeMedia = this.querySelector(`[data-media-id="${this.openedBy.getAttribute('data-media-id')}"]`);
        const activeMediaTemplate = activeMedia.querySelector('template');
        const activeMediaContent = activeMediaTemplate ? activeMediaTemplate.content : null;
        activeMedia.classList.add('active');
        activeMedia.scrollIntoView();

        const container = this.querySelector('[role="document"]');
        container.scrollLeft = (activeMedia.width - container.clientWidth) / 2;

        if (
          activeMedia.nodeName == 'DEFERRED-MEDIA' &&
          activeMediaContent &&
          activeMediaContent.querySelector('.js-youtube')
        )
          activeMedia.loadContent();
      }
    }
  );
}

// Stellt die Shopify-eigenen Block-Tags fuer liquidjs bereit, damit die
// Vorlagen (sections/*.liquid) im Pruefstand gerendert werden koennen.
//
// paginate: rendert den Inhalt unveraendert. Die echte Seitenteilung (50 oder
// 250 pro Seite) kennt nur Shopify; hier geht es um die Logik der Vorlage.
// style und schema: erzeugen keine Ausgabe.
module.exports = function registriere(engine) {
  const blockTag = (endName, zeigeInhalt) => ({
    parse(token, remainTokens) {
      this.tpls = [];
      const stream = this.liquid.parser.parseStream(remainTokens)
        .on('tag:' + endName, () => stream.stop())
        .on('template', (tpl) => this.tpls.push(tpl))
        .on('end', () => { throw new Error(endName + ' fehlt'); });
      stream.start();
    },
    * render(ctx, emitter) {
      if (zeigeInhalt) yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
    },
  });
  engine.registerTag('paginate', blockTag('endpaginate', true));
  engine.registerTag('style', blockTag('endstyle', false));
  engine.registerTag('schema', blockTag('endschema', false));
};

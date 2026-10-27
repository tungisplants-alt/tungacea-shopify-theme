// Prueft die Variantenbilder: Galerie und Vollbild gegen die ECHTEN Snippets.
//
// Shopify erlaubt pro Variante ein Bild. Das Variantenfeld custom.variantenbilder
// (Liste von Dateien) erlaubt mehrere. Geprueft wird, welche Bilder die Galerie
// fuer eine Variante zeigt, in welcher Reihenfolge, und dass ein Produkt ohne
// das Feld sich verhaelt wie vorher.
//
// Die Snippets product-thumbnail und product-media sind hier Attrappen. Sie
// zeichnen nur die Bild-ID. Alles andere, auch variant-media-ids, ist echt.
const fs = require('fs');
const path = require('path');
const { Liquid } = require('liquidjs');

const THEME = path.join(__dirname, '..');
const SNIPPETS = path.join(THEME, 'snippets');

const ATTRAPPEN = {
  'product-thumbnail': '<img data-bild="{{ media.id }}">',
  'product-media': '<div class="product__media-item{% if variant_image %} product__media-item--variant{% endif %}" data-modal-bild="{{ media.id }}"></div>',
};

const engine = new Liquid({
  extname: '.liquid',
  fs: {
    sep: '/',
    resolve: (root, file, ext) => file + (path.extname(file) ? '' : ext),
    exists: async f => f in ATTRAPPEN_DATEIEN || fs.existsSync(path.join(SNIPPETS, f)),
    existsSync: f => f in ATTRAPPEN_DATEIEN || fs.existsSync(path.join(SNIPPETS, f)),
    readFile: async f => (f in ATTRAPPEN_DATEIEN ? ATTRAPPEN_DATEIEN[f] : fs.readFileSync(path.join(SNIPPETS, f), 'utf8')),
    readFileSync: f => (f in ATTRAPPEN_DATEIEN ? ATTRAPPEN_DATEIEN[f] : fs.readFileSync(path.join(SNIPPETS, f), 'utf8')),
    dirname: () => SNIPPETS,
    contains: () => true,
  },
  root: SNIPPETS,
});
const ATTRAPPEN_DATEIEN = Object.fromEntries(Object.entries(ATTRAPPEN).map(([k, v]) => [k + '.liquid', v]));

// Filter, die es nur in Shopify gibt.
engine.registerFilter('t', k => String(k));
engine.registerFilter('asset_url', f => '/assets/' + f);
engine.registerFilter('stylesheet_tag', u => '<link href="' + u + '">');
engine.registerFilter('inline_asset_content', () => '<svg></svg>');
engine.registerFilter('image_url', () => '/bild.jpg');
engine.registerFilter('image_tag', () => '<img>');

// ---- Testdaten -------------------------------------------------------------
const bild = (id, name) => ({
  id,
  media_type: 'image',
  src: 'https://cdn.example/files/' + name + '.jpg?v=' + id,
  preview_image: { src: 'https://cdn.example/files/' + name + '.jpg?v=' + id },
  alt: name,
});
const BILDER = { A: bild(11, 'a'), B: bild(12, 'b'), C: bild(13, 'c'), D: bild(14, 'd') };
const alle = [BILDER.A, BILDER.B, BILDER.C, BILDER.D];

// Eine Datei aus dem Variantenfeld: gleiche ID und URL wie das Produktbild.
const datei = b => ({ id: b.id, src: b.src });

const variante = (liste, featured) => ({
  featured_media: featured || null,
  metafields: { custom: { variantenbilder: { value: liste } } },
});

const produkt = v => ({ media: alle, selected_or_first_available_variant: v });

async function lauf(snippet, v, einstellungen, extra) {
  const product = produkt(v);
  const section = {
    id: 'main',
    settings: Object.assign(
      { gallery_layout: 'thumbnail', mobile_thumbnails: 'hide', media_size: 'medium', hide_variants: true,
        enable_sticky_info: false, enable_video_looping: false, media_fit: 'cover', constrain_to_viewport: false,
        color_scheme: 'background-1' },
      einstellungen
    ),
  };
  const globals = { product, section, settings: { page_width: 1200, animations_reveal_on_scroll: false } };
  const variant_images = Object.assign([], (extra && extra.variant_images) || []);
  return engine.renderFile(snippet, { variant_images }, { globals });
}

const ids = (html, attr) => [...html.matchAll(new RegExp(attr + '="(?:main-)?(\\d+)"', 'g'))].map(m => Number(m[1]));
const zahl = (html, rx) => (html.match(rx) || [])[1];

let geprueft = 0;
let fehler = 0;
function pruefe(name, ist, soll) {
  geprueft++;
  const a = JSON.stringify(ist);
  const b = JSON.stringify(soll);
  if (a !== b) {
    fehler++;
    console.log('FEHLER  ' + name + '\n   ist:  ' + a + '\n   soll: ' + b);
  }
}

(async () => {
  // ---- Ohne Variantenfeld: wie vorher ------------------------------------
  {
    const html = await lauf('product-media-gallery', variante(null, null), {});
    pruefe('ohne Feld: alle vier Bilder in Produktreihenfolge', ids(html, 'data-media-id'), [11, 12, 13, 14]);
    pruefe('ohne Feld: kein Marker am Element', /data-variant-media/.test(html), false);
    pruefe('ohne Feld: Vorschaubilder alle vier', ids(html, 'data-target'), [11, 12, 13, 14]);
  }
  {
    const html = await lauf('product-media-gallery', variante([], BILDER.C), {});
    pruefe('leere Liste, Hauptbild der Variante vorn', ids(html, 'data-media-id')[0], 13);
    pruefe('leere Liste: alle vier, keine doppelt', ids(html, 'data-media-id').slice().sort(), [11, 12, 13, 14]);
    pruefe('leere Liste: kein Marker', /data-variant-media/.test(html), false);
  }

  // ---- Mit Variantenfeld -------------------------------------------------
  {
    const html = await lauf('product-media-gallery', variante([datei(BILDER.B), datei(BILDER.D)]), {});
    pruefe('zwei von vier: nur diese zwei', ids(html, 'data-media-id'), [12, 14]);
    pruefe('zwei von vier: Vorschaubilder gleich', ids(html, 'data-target'), [12, 14]);
    pruefe('zwei von vier: Marker gesetzt', /data-variant-media/.test(html), true);
    pruefe('zwei von vier: Zaehler zeigt 2', zahl(html, /slider-counter--total">(\d+)</), '2');
    pruefe('zwei von vier: erstes Bild ist aktiv', /is-active[^>]*data-media-id="main-12"/.test(html), true);
  }
  {
    const html = await lauf('product-media-gallery', variante([datei(BILDER.C), datei(BILDER.A)]), {});
    pruefe('Reihenfolge der Auswahl: Hauptbild ist das erste gewaehlte', ids(html, 'data-media-id')[0], 13);
    pruefe('Reihenfolge der Auswahl: beide da', ids(html, 'data-media-id').slice().sort(), [11, 13]);
  }
  {
    const html = await lauf('product-media-gallery', variante([datei(BILDER.A), datei(BILDER.B), datei(BILDER.C)]), {});
    pruefe('drei Bilder: alle drei', ids(html, 'data-media-id').slice().sort(), [11, 12, 13]);
    pruefe('drei Bilder: Zaehler 3', zahl(html, /slider-counter--total">(\d+)</), '3');
  }
  {
    const html = await lauf('product-media-gallery', variante([datei(BILDER.A)]), {});
    pruefe('ein Bild: genau eins', ids(html, 'data-media-id'), [11]);
  }
  {
    // Das Variantenfeld nennt die Datei mit anderer ID, aber derselben URL.
    const andereId = { id: 99999, src: BILDER.B.src.replace('?v=12', '?v=77') };
    const html = await lauf('product-media-gallery', variante([andereId]), {});
    pruefe('Treffer ueber die URL, wenn die ID nicht passt', ids(html, 'data-media-id'), [12]);
  }
  {
    // Bild, das nicht zum Produkt gehoert, wird nie gezeigt. Dann gilt der alte Weg.
    const fremd = { id: 55555, src: 'https://cdn.example/files/fremd.jpg?v=1' };
    const html = await lauf('product-media-gallery', variante([fremd], BILDER.B), {});
    pruefe('fremdes Bild: nichts davon in der Galerie', ids(html, 'data-media-id').includes(55555), false);
    pruefe('fremdes Bild: alte Galerie mit vier Bildern', ids(html, 'data-media-id').slice().sort(), [11, 12, 13, 14]);
    pruefe('fremdes Bild: kein Marker', /data-variant-media/.test(html), false);
  }
  {
    // Fremdes und eigenes gemischt: das eigene zaehlt.
    const fremd = { id: 55555, src: 'https://cdn.example/files/fremd.jpg?v=1' };
    const html = await lauf('product-media-gallery', variante([fremd, datei(BILDER.D)]), {});
    pruefe('fremd und eigen gemischt: nur das eigene', ids(html, 'data-media-id'), [14]);
  }
  {
    // Dasselbe Bild zweimal gewaehlt darf nicht doppelt erscheinen.
    const html = await lauf('product-media-gallery', variante([datei(BILDER.A), datei(BILDER.A), datei(BILDER.B)]), {});
    pruefe('doppelt gewaehlt: einmal gezeigt', ids(html, 'data-media-id').slice().sort(), [11, 12]);
    pruefe('doppelt gewaehlt: Zaehler 2', zahl(html, /slider-counter--total">(\d+)</), '2');
  }

  // ---- Das normale Variantenbild steht vorn --------------------------------
  {
    const html = await lauf('product-media-gallery', variante([datei(BILDER.A), datei(BILDER.B)], BILDER.C), {});
    pruefe('Variantenbild C + Feld A,B: C zuerst, dann A, B', ids(html, 'data-media-id'), [13, 11, 12]);
    pruefe('Variantenbild + Feld: Zaehler zaehlt alle drei', zahl(html, /slider-counter--total">(\d+)</), '3');
    pruefe('Variantenbild + Feld: drei Punkte', (html.match(/galerie-punkte__punkt/g) || []).length, 3);
    pruefe('Variantenbild + Feld: Vorschaubilder gleich', ids(html, 'data-target'), [13, 11, 12]);
    pruefe('Variantenbild + Feld: Marker gesetzt', /data-variant-media/.test(html), true);
  }
  {
    const html = await lauf('product-media-gallery', variante([datei(BILDER.A), datei(BILDER.B)], BILDER.B), {});
    pruefe('Variantenbild steht schon im Feld: nach vorn, nicht doppelt', ids(html, 'data-media-id'), [12, 11]);
  }
  {
    const html = await lauf('product-media-gallery', variante([datei(BILDER.A)], BILDER.A), {});
    pruefe('Variantenbild ist das einzige Feldbild: einmal', ids(html, 'data-media-id'), [11]);
  }
  {
    // Ein Variantenbild allein macht noch keinen Variantenmodus: sonst zeigte jede
    // Variante mit eigenem Bild nur noch dieses eine.
    const html = await lauf('product-media-gallery', variante(null, BILDER.C), {});
    pruefe('nur Variantenbild, kein Feld: altes Verhalten, vier Bilder', ids(html, 'data-media-id').slice().sort(), [11, 12, 13, 14]);
    pruefe('nur Variantenbild, kein Feld: kein Marker', /data-variant-media/.test(html), false);
  }
  {
    const fremd = { id: 55555, src: 'https://cdn.example/files/fremd.jpg?v=1' };
    const html = await lauf('product-media-gallery', variante([fremd], BILDER.C), {});
    pruefe('Variantenbild + nur fremdes Feldbild: altes Verhalten', ids(html, 'data-media-id').slice().sort(), [11, 12, 13, 14]);
  }
  {
    const v = variante([datei(BILDER.A), datei(BILDER.B)], BILDER.C);
    const m = ids(await lauf('product-media-modal', v, {}), 'data-modal-bild');
    pruefe('Vollbild: Variantenbild zuerst, dann das Feld', m, [13, 11, 12]);
  }

  // ---- Die alte Variantenregel darf die Auswahl nicht verstecken ----------
  {
    // hide_variants blendet Bilder aus, die an eine Variante geheftet sind.
    // Gewaehlte Variantenbilder gehoeren zur Variante und muessen bleiben.
    const html = await lauf('product-media-gallery', variante([datei(BILDER.A), datei(BILDER.B)], BILDER.A),
      { hide_variants: true }, { variant_images: [BILDER.A.src, BILDER.B.src] });
    pruefe('hide_variants: gewaehlte Bilder bleiben', ids(html, 'data-media-id').slice().sort(), [11, 12]);
    pruefe('hide_variants: Vorschaubilder nicht als Variantenbild versteckt', /thumbnail-list_item--variant/.test(html), false);
  }
  {
    // Ohne Feld bleibt die alte Regel: Bild einer anderen Variante verschwindet.
    const html = await lauf('product-media-gallery', variante(null, BILDER.A),
      { hide_variants: true }, { variant_images: [BILDER.A.src, BILDER.B.src] });
    pruefe('alte Regel: B (Bild einer anderen Variante) ist nicht in den Folien', ids(html, 'data-media-id').includes(12), false);
  }

  // ---- Bestehende Layouts ------------------------------------------------
  {
    const html = await lauf('product-media-gallery', variante([datei(BILDER.A), datei(BILDER.B)]), { gallery_layout: 'stacked' });
    pruefe('gestapelt: zwei Bilder', ids(html, 'data-media-id').slice().sort(), [11, 12]);
  }

  // ---- Vollbild ----------------------------------------------------------
  {
    const html = await lauf('product-media-modal', variante([datei(BILDER.B), datei(BILDER.D)]), {});
    pruefe('Vollbild: nur die gewaehlten', ids(html, 'data-modal-bild'), [12, 14]);
    pruefe('Vollbild: nichts als Variantenbild markiert', /product__media-item--variant/.test(html), false);
  }
  {
    const html = await lauf('product-media-modal', variante([datei(BILDER.D), datei(BILDER.B)]), {});
    pruefe('Vollbild: Auswahlreihenfolge, erstes zuerst', ids(html, 'data-modal-bild'), [14, 12]);
  }
  {
    const html = await lauf('product-media-modal', variante(null, BILDER.C), {});
    pruefe('Vollbild ohne Feld: alle vier, Hauptbild vorn', ids(html, 'data-modal-bild'), [13, 11, 12, 14]);
  }
  {
    // Galerie und Vollbild muessen dieselben Bilder meinen.
    const v = variante([datei(BILDER.C), datei(BILDER.A)]);
    const g = ids(await lauf('product-media-gallery', v, {}), 'data-media-id');
    const m = ids(await lauf('product-media-modal', v, {}), 'data-modal-bild');
    pruefe('Galerie und Vollbild zeigen dieselben Bilder', g.slice().sort(), m.slice().sort());
    pruefe('Galerie und Vollbild haben dasselbe Hauptbild', g[0], m[0]);
  }

  console.log(fehler + ' Fehler in ' + geprueft + ' Pruefungen');
  process.exit(fehler ? 1 : 0);
})().catch(e => {
  console.log('ABBRUCH: ' + e.message);
  process.exit(1);
});

/*
 * Meilensteine automatisch in den Warenkorb legen (nur mit der Einstellung
 * "Meilensteine automatisch in den Warenkorb legen" im Theme-Editor).
 *
 * Der Warenkorb (Schublade und Seite) enthaelt einen Datenknoten
 * <script type="application/json" data-meilenstein-stand> mit jeder Zeile und den Marken
 * (snippets/warenkorb-meilenstein.liquid). Dieses Skript rechnet daraus, was fehlt oder
 * zu viel ist, und gleicht den Warenkorb an:
 *
 *  - Pflanzenwert ab Marke 1 (Standard 100 EUR): Winterpackung hinein.
 *  - Pflanzenwert ab Marke 2 (Standard 150 EUR): zu jeder Pflanze (ohne Samen, ohne die
 *    Pflanzen ab 100 EUR, bei denen das Etikett schon inklusive ist) so viele Etiketten, wie die
 *    Pflanze Stueck hat, mit dem Namen der Pflanze. Hoechstens "maxEtiketten" (der Rabatt in Shopify
 *    deckt nur so viele ab).
 *  - Faellt der Wert unter die Marke oder verschwindet die Pflanze, kommen die
 *    automatischen Zeilen wieder heraus.
 *
 * Automatische Zeilen tragen die versteckte Eigenschaft _auto = "meilenstein". Etiketten, die der
 * Kunde selbst gelegt hat, werden nie angefasst, aber von der Menge abgezogen.
 *
 * Entfernt der Kunde eine automatische Zeile selbst, kommt sie nicht wieder, solange die Marke
 * erreicht bleibt (sessionStorage). Faellt die Marke weg, wird dieses Merken geloescht.
 *
 * Der Preis 0 kommt NICHT von diesem Skript, sondern von den automatischen Rabatten in Shopify.
 * Ohne sie kosten die Zeilen ihren normalen Preis. Deshalb ist die Einstellung zunaechst aus.
 *
 * Die Rechnung steckt in der reinen Funktion plane() und ist in tests/meilenstein-auto-test.js geprueft.
 */
(function (global) {
  'use strict';

  /** Reine Funktion: Stand + gemerkte Abwahlen -> Liste von Aktionen. */
  function plane(stand, aus) {
    aus = aus || {};
    var zeilen = stand.zeilen || [];
    var aktionen = [];
    var neueAus = {};
    var pflanzenCent = 0;
    zeilen.forEach(function (z) { if (z.kl === 'pflanze') pflanzenCent += z.c; });

    // --- Winterpackung
    var winterSoll = !!stand.winterMarke && pflanzenCent >= stand.b1;
    var winterZeilen = zeilen.filter(function (z) { return z.kl === 'winter'; });
    var winterAuto = winterZeilen.filter(function (z) { return z.auto === 'meilenstein'; });
    if (winterSoll) {
      if (!winterZeilen.length && !aus.w && stand.winterVar) {
        aktionen.push({ art: 'add', id: stand.winterVar, menge: 1, eig: { _auto: 'meilenstein' }, kennung: 'w' });
      }
    } else {
      winterAuto.forEach(function (z) { aktionen.push({ art: 'set', key: z.k, menge: 0, kennung: 'w' }); });
    }

    // --- Etiketten
    var etikettSoll = pflanzenCent >= stand.b2;
    var etiketten = zeilen.filter(function (z) { return z.kl === 'etikett'; });
    var pflanzen = {}; // Handle -> { bedarf, titel }
    zeilen.forEach(function (z) {
      if (z.kl !== 'pflanze' || z.inkl) return;
      var p = pflanzen[z.h] || (pflanzen[z.h] = { bedarf: 0, titel: z.t });
      p.bedarf += z.q * (z.pk || 1);
    });
    var handles = Object.keys(pflanzen).sort();
    var rest = stand.maxEtiketten == null ? 1e9 : stand.maxEtiketten;
    handles.forEach(function (h) {
      var kennung = 'e:' + h;
      var manuell = 0;
      var autoZeilen = [];
      etiketten.forEach(function (e) {
        if (e.pf !== h) return;
        if (e.auto === 'meilenstein') autoZeilen.push(e); else manuell += e.q;
      });
      var will = 0;
      if (etikettSoll && !aus[kennung]) {
        will = Math.max(0, pflanzen[h].bedarf - manuell);
        will = Math.min(will, rest);
        rest -= will;
      }
      var hat = autoZeilen.reduce(function (s, e) { return s + e.q; }, 0);
      if (will === 0) {
        autoZeilen.forEach(function (e) { aktionen.push({ art: 'set', key: e.k, menge: 0, kennung: kennung }); });
      } else if (!autoZeilen.length) {
        if (stand.etikettVar) {
          var eig = { _auto: 'meilenstein', _pflanze: h };
          eig[stand.fuerSchluessel || 'Für'] = pflanzen[h].titel;
          aktionen.push({ art: 'add', id: stand.etikettVar, menge: will, eig: eig, kennung: kennung });
        }
      } else if (hat !== will) {
        aktionen.push({ art: 'set', key: autoZeilen[0].k, menge: will, kennung: kennung });
        autoZeilen.slice(1).forEach(function (e) { aktionen.push({ art: 'set', key: e.k, menge: 0, kennung: kennung }); });
      }
    });
    // Automatische Etiketten fuer Pflanzen, die nicht mehr da sind (oder nicht mehr zaehlen)
    etiketten.forEach(function (e) {
      if (e.auto === 'meilenstein' && !pflanzen[e.pf]) {
        aktionen.push({ art: 'set', key: e.k, menge: 0, kennung: 'e:' + e.pf });
      }
    });

    // Abwahlen bereinigen: faellt die Marke weg, vergisst das Skript die Abwahl.
    if (!winterSoll) delete aus.w;
    Object.keys(aus).forEach(function (k) {
      if (k.indexOf('e:') === 0 && !(etikettSoll && pflanzen[k.slice(2)])) delete aus[k];
    });
    return { aktionen: aktionen, aus: aus, neueAus: neueAus };
  }

  /** Welche Kennungen der Auto-Zeilen stehen im Stand? (fuer die Abwahl-Erkennung) */
  function autoKennungen(stand) {
    var k = {};
    (stand.zeilen || []).forEach(function (z) {
      if (z.auto !== 'meilenstein') return;
      if (z.kl === 'winter') k.w = true;
      if (z.kl === 'etikett') k['e:' + z.pf] = true;
    });
    return k;
  }

  global.__meilensteinAuto = { plane: plane, autoKennungen: autoKennungen };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.__meilensteinAuto;
  if (typeof document === 'undefined') return;

  /* ------------------------------------------------------------------ Anwendung im Browser */
  if (global.__meilensteinAutoLaeuft) return;
  global.__meilensteinAutoLaeuft = true;

  var wurzel = (global.Shopify && global.Shopify.routes && global.Shopify.routes.root) || '/';
  var ARBEIT = false;
  var VORHER = 'tungacea-ma-vorher';
  var AUS = 'tungacea-ma-aus';

  function lies(key) {
    try { return JSON.parse(sessionStorage.getItem(key) || '{}') || {}; } catch (e) { return {}; }
  }
  function schreibe(key, wert) {
    try { sessionStorage.setItem(key, JSON.stringify(wert)); } catch (e) { /* ohne Speicher: keine Abwahl-Erinnerung */ }
  }
  function stand() {
    var knoten = document.querySelectorAll('script[data-meilenstein-stand]');
    var k = knoten[knoten.length - 1];
    if (!k) return null;
    try { return JSON.parse(k.textContent); } catch (e) { return null; }
  }
  function schublade() {
    var d = document.querySelector('cart-drawer');
    return d && typeof d.renderContents === 'function' ? d : null;
  }
  function post(pfad, koerper) {
    return fetch(wurzel + pfad, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(koerper),
    }).then(function (a) { if (!a.ok) throw new Error(pfad + ' fehlgeschlagen'); return a.json(); });
  }

  function lauf() {
    if (ARBEIT) return;
    var s = stand();
    if (!s || !s.auto) return;

    // Abwahl erkennen: eine Auto-Zeile war da, ist jetzt weg, und ich habe sie nicht selbst entfernt.
    var vorher = lies(VORHER);
    var jetzt = autoKennungen(s);
    var aus = lies(AUS);
    var eigene = vorher.__entfernt || {};
    Object.keys(vorher).forEach(function (k) {
      if (k === '__entfernt') return;
      if (!jetzt[k] && !eigene[k]) aus[k] = true;
    });

    var plan = plane(s, aus);
    schreibe(AUS, plan.aus);
    var merk = {};
    Object.keys(jetzt).forEach(function (k) { merk[k] = true; });
    var entfernt = {};
    plan.aktionen.forEach(function (a) { if (a.art === 'set' && a.menge === 0) entfernt[a.kennung] = true; });
    merk.__entfernt = entfernt;
    schreibe(VORHER, merk);

    if (!plan.aktionen.length) return;
    ARBEIT = true;
    var d = schublade();
    var abschnitte = null;
    if (d && typeof d.getSectionsToRender === 'function') {
      try { abschnitte = d.getSectionsToRender().map(function (x) { return x.id; }); } catch (e) { abschnitte = null; }
    }
    var letzte = null;
    var kette = Promise.resolve();
    plan.aktionen.forEach(function (a) {
      kette = kette.then(function () {
        var k = abschnitte ? { sections: abschnitte, sections_url: global.location.pathname } : {};
        if (a.art === 'set') {
          k.id = a.key; k.quantity = a.menge;
          return post('cart/change.js', k).then(function (r) { letzte = r; });
        }
        k.items = [{ id: a.id, quantity: a.menge, properties: a.eig }];
        return post('cart/add.js', k).then(function (r) { letzte = r; });
      });
    });
    kette.then(function () {
      if (d && letzte && letzte.sections) {
        try { d.renderContents(letzte); return; } catch (e) { /* dann neu laden */ }
      }
      global.location.reload();
    }).catch(function () { /* naechste Aenderung versucht es erneut */ })
      .then(function () { ARBEIT = false; });
  }

  // Warenkorb-Inhalt wird nach jeder Aenderung ersetzt: neuer Datenknoten -> neu rechnen.
  var timer = null;
  function geplant() { clearTimeout(timer); timer = setTimeout(lauf, 120); }
  var beobachter = new MutationObserver(function (liste) {
    for (var i = 0; i < liste.length; i++) {
      var m = liste[i];
      for (var j = 0; j < m.addedNodes.length; j++) {
        var n = m.addedNodes[j];
        if (n.nodeType === 1 && ((n.matches && n.matches('script[data-meilenstein-stand]')) || (n.querySelector && n.querySelector('script[data-meilenstein-stand]')))) { geplant(); return; }
      }
    }
  });
  beobachter.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', geplant); else geplant();
})(typeof window !== 'undefined' ? window : globalThis);

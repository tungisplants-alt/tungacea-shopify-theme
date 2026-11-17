/*
 * Etiketten bestellen: eine Liste, nach Gattungen gruppiert.
 *
 * Die Seite ist eine Ansicht auf eine Liste. Der Zustand steht im DOM selbst
 * (Gruppen mit Gattungsfeld und Namenszeilen); daraus rechnen sich Zaehler,
 * Summe und die Eigenschaften, die ans Kaufformular gehen. So gibt es keine
 * zweite Kopie, die auseinanderlaufen koennte.
 *
 * Preis: Der Rabatt im Warenkorb gilt fuer ALLE Etiketten, nicht je Position.
 * Darum zaehlt die Seite, was schon im Warenkorb liegt (cart.js), zu dieser
 * Bestellung dazu. Die Summe ist eine Anzeige, abgerechnet wird im Warenkorb.
 */
(function () {
  'use strict';

  var wurzel = document.querySelector('[data-etikett-bestellung]');
  if (!wurzel) return;

  var d = wurzel.dataset;
  var form = document.getElementById(d.form);
  var gruppenBox = wurzel.querySelector('[data-eb-gruppen]');
  var neueGruppe = wurzel.querySelector('[data-eb-gruppe-neu]');
  var etikettenFeld = wurzel.querySelector('[data-eb-etiketten]');
  var mengeFeld = wurzel.querySelector('[data-eb-menge]');
  var anzahlFeld = wurzel.querySelector('[data-eb-anzahl]');
  var fehlerBox = wurzel.querySelector('[data-eb-fehler]');
  var zaehler = wurzel.querySelector('[data-eb-zaehler]');
  var betrag = wurzel.querySelector('[data-eb-betrag]');
  var stueck = wurzel.querySelector('[data-eb-stueck]');
  var tipp = wurzel.querySelector('[data-eb-tipp]');
  var stufenEl = [].slice.call(wurzel.querySelectorAll('[data-eb-stufe]'));
  var liste = wurzel.querySelector('datalist');

  var grundpreis = Number(d.preis) || 0;
  var variante = Number(d.variante) || 0;
  var stufen = (d.stufen || '').split(',').filter(Boolean).map(function (s) {
    var t = s.split(':');
    return { ab: Number(t[0]), preis: Number(t[1]) };
  }).sort(function (a, b) { return a.ab - b.ab; });
  var imKorb = 0;
  var anzahlUngueltig = 0;
  var logoWahl = 'tungacea';
  var SPEICHER = 'tungacea-etiketten-entwurf';

  var geld;
  try {
    geld = new Intl.NumberFormat(d.sprache || 'de', { style: 'currency', currency: d.waehrung || 'EUR' });
  } catch (e) { geld = null; }
  function euro(cent) {
    var w = cent / 100;
    return geld ? geld.format(w) : w.toFixed(2).replace('.', ',') + ' €';
  }
  function ersetzen(text, werte) {
    Object.keys(werte).forEach(function (k) { text = text.split('{{ ' + k + ' }}').join(String(werte[k])); });
    return text;
  }

  /* -------------------------------------------------------------- Messen
     Wie der Generator: Namen in Grossbuchstaben, " x " wird " × ", Platz fuer
     zwei Zeilen, getrennt wird bevorzugt am letzten " × " ausserhalb von
     Klammern, sonst an einem Leerzeichen. Schriftbreiten: etikett-schrift.js. */
  var S = window.TUNGACEA_SCHRIFT || null;

  function vorschub(text, G, em, tr) {
    var w = 0, fehlt = [];
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i), g = G[ch];
      if (g === undefined) { fehlt.push(ch); w += 0.3 * em + tr; continue; }
      w += g * em / 1000 + tr;
    }
    return { w: Math.max(0, w - tr), fehlt: fehlt };
  }

  function aufbereiten(roh) {
    return roh.trim().replace(/\s+/g, ' ').replace(/ x /gi, ' × ').toUpperCase();
  }

  // -> { leer, zeilen (1|2), zuLang, fehlt: [Zeichen] }
  function pruefeName(roh) {
    var name = aufbereiten(roh);
    if (!name) return { leer: true, zeilen: 0, zuLang: false, fehlt: [] };
    if (!S) return { leer: false, zeilen: 1, zuLang: false, fehlt: [] };
    var m = function (t) { return vorschub(t, S.g400, S.em2, S.tr2); };
    var ganz = m(name);
    var fehlt = ganz.fehlt.filter(function (c, i, a) { return a.indexOf(c) === i; });
    if (ganz.w <= S.maxw) return { leer: false, zeilen: 1, zuLang: false, fehlt: fehlt };
    var tiefe = 0, schnitte = [], i;
    for (i = 0; i < name.length; i++) {
      var c = name.charAt(i);
      if (c === '(') tiefe++;
      else if (c === ')') tiefe--;
      else if (c === '×' && tiefe === 0 && i > 0 && name.charAt(i - 1) === ' ' && name.charAt(i + 1) === ' ') schnitte.push(i);
    }
    schnitte = schnitte.filter(function (k) { return m(name.slice(0, k).trim()).w <= S.maxw; });
    if (!schnitte.length) {
      for (i = 0; i < name.length; i++) {
        if (name.charAt(i) === ' ' && m(name.slice(0, i)).w <= S.maxw) schnitte.push(i + 1);
      }
    }
    if (!schnitte.length) return { leer: false, zeilen: 1, zuLang: true, fehlt: fehlt };
    var k = schnitte[schnitte.length - 1];
    var zweite = name.slice(k).trim();
    return { leer: false, zeilen: 2, zuLang: m(zweite).w > S.maxw, fehlt: fehlt };
  }

  function pruefeGattung(roh) {
    var g = aufbereiten(roh);
    if (!g || !S) return { zuLang: false, fehlt: [] };
    var r = vorschub(g, S.g600, S.em1, S.tr1);
    return { zuLang: r.w > S.maxw, fehlt: r.fehlt.filter(function (c, i, a) { return a.indexOf(c) === i; }) };
  }

  function istUngueltig(p) { return p.zuLang || p.fehlt.length > 0; }

  /* ----------------------------------------------------------- Aufbau */
  function el(tag, klasse, attrs) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }

  function nameZeile(wert) {
    var li = el('li', 'eb__zeile');
    var inp = el('input', 'eb__name', {
      type: 'text', autocomplete: 'off', spellcheck: 'false', autocapitalize: 'characters',
      enterkeyhint: 'next', placeholder: d.tName, 'aria-label': d.tNameLabel,
    });
    inp.value = wert || '';
    var hinweis = el('span', 'eb__hinweis', { 'aria-live': 'polite' });
    var weg = el('button', 'eb__weg', { type: 'button', 'aria-label': d.tWeg, tabindex: '-1' });
    weg.innerHTML = '&times;';
    li.appendChild(inp);
    li.appendChild(hinweis);
    li.appendChild(weg);
    inp._prev = inp.value;
    inp._prevValid = true;
    return li;
  }

  function gruppe(gattung, namen) {
    var g = el('section', 'eb__gruppe');
    var kopf = el('header', 'eb__gruppe-kopf');
    var gat = el('input', 'eb__gattung', {
      type: 'text', list: liste ? liste.id : '', autocomplete: 'off', maxlength: '40',
      placeholder: wurzel.dataset.gattungPlatzhalter || '', 'aria-label': 'Gattung',
    });
    gat.value = gattung || '';
    var zahl = el('span', 'eb__gruppe-zahl');
    var weg = el('button', 'eb__weg eb__weg--gruppe', { type: 'button', 'aria-label': d.tGruppeWeg });
    weg.innerHTML = '&times;';
    kopf.appendChild(gat);
    kopf.appendChild(zahl);
    kopf.appendChild(weg);
    var ul = el('ul', 'eb__namen');
    (namen && namen.length ? namen : ['']).forEach(function (n) { ul.appendChild(nameZeile(n)); });
    var plus = el('button', 'eb__zeile-knopf eb__zeile-knopf--name', { type: 'button' });
    plus.innerHTML = '<span class="eb__plus" aria-hidden="true">+</span>';
    plus.appendChild(document.createTextNode(wurzel.dataset.tNameNeu || ''));
    var mehr = el('button', 'eb__zeile-knopf eb__mehr-knopf', { type: 'button', 'aria-expanded': 'false' });
    mehr.hidden = true;
    mehr.innerHTML = '<span class="eb__mehr-text"></span><span class="eb__pfeil eb__pfeil--mehr" aria-hidden="true">&rsaquo;</span>';
    g.appendChild(kopf);
    g.appendChild(ul);
    g.appendChild(mehr);
    g.appendChild(plus);
    g.dataset.zu = '0';
    return g;
  }

  /* Lange Listen: ab ZU_AB Namen zeigt eine Gruppe nur die ersten ZU_ZEIGEN,
     der Rest steckt hinter einer Zeile "N weitere anzeigen". Die Zeilen bleiben
     im DOM, damit Zaehlen und Absenden nichts davon merken. */
  var ZU_AB = 6;
  var ZU_ZEIGEN = 3;

  function faltenAnwenden(g) {
    var zeilen = [].slice.call(g.querySelectorAll('.eb__zeile'));
    var knopf = g.querySelector('.eb__mehr-knopf');
    var kann = zeilen.length >= ZU_AB;
    var zu = kann && g.dataset.zu === '1';
    zeilen.forEach(function (li, i) { li.hidden = zu && i >= ZU_ZEIGEN; });
    if (!kann) { knopf.hidden = true; g.dataset.zu = '0'; return; }
    knopf.hidden = false;
    knopf.setAttribute('aria-expanded', String(!zu));
    knopf.classList.toggle('ist-offen', !zu);
    knopf.querySelector('.eb__mehr-text').textContent = zu
      ? ersetzen(d.tMehr, { n: zeilen.length - ZU_ZEIGEN })
      : d.tWeniger;
  }

  function gruppen() { return [].slice.call(gruppenBox.querySelectorAll('.eb__gruppe')); }
  function namenInput(g) { return [].slice.call(g.querySelectorAll('.eb__name')); }

  /* ------------------------------------------------------------- Rechnen */
  function zustand() {
    var teile = gruppen().map(function (g) {
      var namen = namenInput(g).map(function (i) { return i.value.trim(); }).filter(Boolean);
      return { el: g, gattung: g.querySelector('.eb__gattung').value.trim(), namen: namen };
    });
    return teile;
  }

  function stueckpreis(n) {
    var p = grundpreis;
    stufen.forEach(function (s) { if (n >= s.ab) p = s.preis; });
    return p;
  }

  function aktualisieren(speichern) {
    var z = zustand();
    var n = 0;
    var ungueltig = 0;
    var zeilen = [];
    z.forEach(function (g) {
      n += g.namen.length;
      g.namen.forEach(function (name) { zeilen.push((g.gattung ? g.gattung + ' | ' : '') + name); });
      g.el.querySelector('.eb__gruppe-zahl').textContent = g.namen.length ? String(g.namen.length) : '';
      var pg = pruefeGattung(g.gattung);
      var gattungFehlt = g.namen.length > 0 && !g.gattung && g.el.classList.contains('hat-fehler');
      g.el.classList.toggle('hat-fehler', gattungFehlt || istUngueltig(pg));
      if (istUngueltig(pg)) ungueltig += 1;
      namenInput(g.el).forEach(function (inp) {
        var p = pruefeName(inp.value);
        var li = inp.closest('.eb__zeile');
        var h = li.querySelector('.eb__hinweis');
        var text = '', art = '';
        if (p.fehlt.length) { text = ersetzen(d.tZeichen, { z: p.fehlt.join(' ') }); art = 'fehler'; }
        else if (p.zuLang) { text = d.tZuLang; art = 'fehler'; }
        else if (p.zeilen === 2) { text = d.tZweiZeilen; art = 'leise'; }
        h.textContent = text;
        h.className = 'eb__hinweis' + (art ? ' eb__hinweis--' + art : '');
        li.classList.toggle('hat-fehler', art === 'fehler');
        if (art === 'fehler') ungueltig += 1;
        inp._prev = inp.value;
        inp._prevValid = art !== 'fehler';
      });
      g.el.querySelector('.eb__weg--gruppe').hidden = z.length < 2;
      faltenAnwenden(g.el);
    });

    etikettenFeld.value = zeilen.join('\n');
    mengeFeld.value = String(Math.max(n, 1));
    anzahlFeld.value = String(n);

    var gesamt = imKorb + n;
    var wort = n === 1 ? d.wortEins : d.wortMehr;
    zaehler.textContent = n + ' ' + wort;
    if (n > 0) {
      var sp = stueckpreis(gesamt);
      betrag.textContent = euro(sp * n);
      stueck.textContent = euro(sp) + ' ' + d.tPro;
    } else {
      betrag.textContent = '';
      stueck.textContent = '';
    }

    // Stufe markieren: die, die fuer die GESAMTE Menge im Warenkorb gilt.
    var aktiv = stufenEl[0];
    stufenEl.forEach(function (li) { if (gesamt >= Number(li.dataset.ab)) aktiv = li; });
    stufenEl.forEach(function (li) {
      var an = li === aktiv && gesamt > 0;
      li.classList.toggle('ist-aktiv', an);
      if (an) li.setAttribute('aria-current', 'true'); else li.removeAttribute('aria-current');
    });

    // Hinweis: Warenkorb und naechste Stufe.
    var teile = [];
    if (imKorb > 0) teile.push(ersetzen(d.tImKorb, { n: imKorb }));
    var naechste = stufen.filter(function (s) { return s.ab > gesamt; })[0];
    if (naechste && gesamt > 0) teile.push(ersetzen(d.tNaechste, { rest: naechste.ab - gesamt, preis: euro(naechste.preis) }));
    tipp.textContent = teile.join(' ');
    tipp.hidden = teile.length === 0;

    if (n > 0 && ungueltig === 0 && fehlerBox && !fehlerBox.classList.contains('ist-ok')) fehlerBox.hidden = true;
    anzahlUngueltig = ungueltig;
    if (speichern !== false) entwurfSichern(z);
  }

  /* ------------------------------------------------------------- Entwurf */
  function entwurfSichern(z) {
    try {
      var daten = { logo: logoWahl, gruppen: z.map(function (g) {
        return { g: g.gattung, n: namenInput(g.el).map(function (i) { return i.value; }) };
      }) };
      sessionStorage.setItem(SPEICHER, JSON.stringify(daten));
    } catch (e) {}
  }
  function entwurfLaden() {
    try {
      var roh = sessionStorage.getItem(SPEICHER);
      if (!roh) return null;
      var daten = JSON.parse(roh);
      if (Array.isArray(daten)) daten = { logo: 'tungacea', gruppen: daten }; // alter Entwurf
      if (!daten || !Array.isArray(daten.gruppen) || !daten.gruppen.length) return null;
      return daten;
    } catch (e) { return null; }
  }

  /* ----------------------------------------------------------- Bedienung */
  function zeileEinfuegen(nach, wert, fokus) {
    var neu = nameZeile(wert);
    nach.parentNode.insertBefore(neu, nach.nextSibling);
    if (fokus) neu.querySelector('.eb__name').focus();
    return neu;
  }

  // Was nicht aufs Etikett passt, laesst sich nicht tippen: Die Eingabe springt
  // auf den letzten gueltigen Stand zurueck, und die Zeile sagt kurz warum.
  gruppenBox.addEventListener('input', function (e) {
    var inp = e.target;
    if (inp.classList && inp.classList.contains('eb__name') && !e.isComposing) {
      var p = pruefeName(inp.value);
      if (istUngueltig(p) && inp._prevValid && inp.value.length > inp._prev.length) {
        var pos = Math.max(0, inp.selectionStart - (inp.value.length - inp._prev.length));
        inp.value = inp._prev;
        try { inp.setSelectionRange(pos, pos); } catch (x) {}
        var li = inp.closest('.eb__zeile');
        var h = li.querySelector('.eb__hinweis');
        h.textContent = p.fehlt.length ? ersetzen(d.tZeichen, { z: p.fehlt.join(' ') }) : d.tVoll;
        h.className = 'eb__hinweis eb__hinweis--fehler';
        clearTimeout(inp._uhr);
        inp._uhr = setTimeout(function () { aktualisieren(false); }, 1600);
        return;
      }
    }
    aktualisieren();
  });

  gruppenBox.addEventListener('keydown', function (e) {
    var inp = e.target;
    // Enter in der Gattung: weiter zum ersten Namen derselben Gruppe.
    if (inp.classList && inp.classList.contains('eb__gattung') && e.key === 'Enter') {
      e.preventDefault();
      var ersterName = inp.closest('.eb__gruppe').querySelector('.eb__name');
      if (ersterName) ersterName.focus();
      return;
    }
    if (!inp.classList || !inp.classList.contains('eb__name')) return;
    var li = inp.closest('.eb__zeile');
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inp.value.trim() === '') return; // keine leeren Zeilen stapeln
      inp.closest('.eb__gruppe').dataset.zu = '0';
      zeileEinfuegen(li, '', true);
      aktualisieren();
    } else if (e.key === 'Backspace' && inp.value === '') {
      var ul = li.parentNode;
      if (ul.children.length > 1) {
        e.preventDefault();
        var davor = li.previousElementSibling || li.nextElementSibling;
        li.remove();
        if (davor) davor.querySelector('.eb__name').focus();
        aktualisieren();
      }
    }
  });

  // Eine ganze Liste einfuegen: jede Zeile wird ein Etikett.
  gruppenBox.addEventListener('paste', function (e) {
    var inp = e.target;
    if (!inp.classList || !inp.classList.contains('eb__name')) return;
    var text = (e.clipboardData || window.clipboardData).getData('text') || '';
    if (!/[\r\n]/.test(text)) return;
    e.preventDefault();
    var zeilen = text.split(/\r?\n/).map(function (z) { return z.trim(); }).filter(Boolean);
    if (!zeilen.length) return;
    var li = inp.closest('.eb__zeile');
    inp.value = zeilen[0];
    var letzte = li;
    zeilen.slice(1).forEach(function (z) { letzte = zeileEinfuegen(letzte, z, false); });
    var gr = inp.closest('.eb__gruppe');
    if (gr.querySelectorAll('.eb__zeile').length >= ZU_AB) {
      // Eine eingefuegte Liste prueft man nicht Zeile fuer Zeile: sie klappt zu.
      gr.dataset.zu = '1';
      inp.blur();
    } else {
      letzte.querySelector('.eb__name').focus();
    }
    aktualisieren();
  });

  gruppenBox.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var g = b.closest('.eb__gruppe');
    if (b.classList.contains('eb__weg--gruppe')) {
      if (gruppen().length > 1) { g.remove(); aktualisieren(); }
    } else if (b.classList.contains('eb__weg')) {
      var li = b.closest('.eb__zeile');
      var ul = li.parentNode;
      if (ul.children.length > 1) li.remove(); else li.querySelector('.eb__name').value = '';
      aktualisieren();
    } else if (b.classList.contains('eb__zeile-knopf--name')) {
      var ul2 = g.querySelector('.eb__namen');
      g.dataset.zu = '0';
      faltenAnwenden(g);
      zeileEinfuegen(ul2.lastElementChild, '', true);
      aktualisieren();
    } else if (b.classList.contains('eb__mehr-knopf')) {
      g.dataset.zu = g.dataset.zu === '1' ? '0' : '1';
      faltenAnwenden(g);
    }
  });

  neueGruppe.addEventListener('click', function () {
    var g = gruppe('', ['']);
    gruppenBox.appendChild(g);
    g.querySelector('.eb__gattung').focus();
    aktualisieren();
  });

  /* ---------------------------------------------------------------- Logo */
  var logoFeld = wurzel.querySelector('[data-eb-logo-feld]');
  var logoKnoepfe = [].slice.call(wurzel.querySelectorAll('[data-eb-logo]'));
  var logoHinweis = wurzel.querySelector('[data-eb-logo-hinweis]');
  var logoWeg = wurzel.querySelector('[data-eb-logo-weg]');
  var logoText = {
    tungacea: { wert: d.tLogoTungacea, hinweis: d.tHinweisTungacea },
    ohne: { wert: d.tLogoOhne, hinweis: d.tHinweisOhne },
    eigenes: { wert: d.tLogoEigenes, hinweis: d.tHinweisEigenes },
  };
  function logoSetzen(wahl) {
    if (!logoText[wahl]) wahl = 'tungacea';
    logoWahl = wahl;
    logoKnoepfe.forEach(function (k) {
      var an = k.dataset.ebLogo === wahl;
      k.classList.toggle('ist-aktiv', an);
      k.setAttribute('aria-checked', String(an));
    });
    logoFeld.value = logoText[wahl].wert;
    logoHinweis.textContent = logoText[wahl].hinweis;
    if (logoWeg) logoWeg.hidden = wahl !== 'eigenes';
    entwurfSichern(zustand());
  }
  logoKnoepfe.forEach(function (k) {
    k.addEventListener('click', function () { logoSetzen(k.dataset.ebLogo); });
  });

  /* ------------------------------------------------------------ Warenkorb */
  var wurzelPfad = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
  function korbLesen() {
    return fetch(wurzelPfad + 'cart.js', { headers: { Accept: 'application/json' } })
      .then(function (a) { return a.ok ? a.json() : null; })
      .then(function (c) {
        if (!c || !c.items) return null;
        var summe = 0;
        c.items.forEach(function (it) { if (Number(it.variant_id) === variante) summe += it.quantity; });
        return summe;
      })
      .catch(function () { return null; });
  }
  function korbAktualisieren() {
    return korbLesen().then(function (s) {
      if (s === null) return null;
      imKorb = s;
      aktualisieren(false);
      return s;
    });
  }

  /* ------------------------------------------------------------- Absenden */
  var nachAbsenden = null;
  function fehler(text, ziel) {
    fehlerBox.textContent = text;
    fehlerBox.hidden = false;
    if (ziel) ziel.focus();
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      var z = zustand();
      var n = z.reduce(function (s, g) { return s + g.namen.length; }, 0);
      if (n === 0) {
        e.preventDefault(); e.stopImmediatePropagation();
        var erste = gruppenBox.querySelector('.eb__name');
        fehler(d.tFehlerNamen, erste);
        return;
      }
      aktualisieren(false);
      if (anzahlUngueltig > 0) {
        e.preventDefault(); e.stopImmediatePropagation();
        var schlecht = gruppenBox.querySelector('.eb__zeile.hat-fehler .eb__name') || gruppenBox.querySelector('.eb__gruppe.hat-fehler .eb__gattung');
        fehler(ersetzen(d.tFehlerPasst, { n: anzahlUngueltig }), schlecht);
        return;
      }
      var ohne = z.filter(function (g) { return g.namen.length && !g.gattung; })[0];
      if (ohne) {
        e.preventDefault(); e.stopImmediatePropagation();
        ohne.el.classList.add('hat-fehler');
        fehler(d.tFehlerGattung, ohne.el.querySelector('.eb__gattung'));
        return;
      }
      gruppenBox.querySelectorAll('.hat-fehler').forEach(function (x) { x.classList.remove('hat-fehler'); });
      // Nach dem Absenden prueft die Seite den Warenkorb: Ist die Menge gestiegen,
      // war es erfolgreich, und die Liste wird fuer die naechste Bestellung leer.
      var vorher = imKorb;
      nachAbsenden = { vorher: vorher, n: n };
      [1200, 2800, 5000].forEach(function (ms) {
        setTimeout(function () {
          if (!nachAbsenden) return;
          korbLesen().then(function (s) {
            if (s === null || !nachAbsenden) return;
            imKorb = s;
            if (s >= nachAbsenden.vorher + nachAbsenden.n) {
              nachAbsenden = null;
              leeren();
              fehlerBox.textContent = d.tFertig;
              fehlerBox.hidden = false;
              fehlerBox.classList.add('ist-ok');
              setTimeout(function () { fehlerBox.hidden = true; fehlerBox.classList.remove('ist-ok'); }, 3500);
            } else {
              aktualisieren(false);
            }
          });
        }, ms);
      });
    }, true);
  }

  function leeren() {
    var gat = (gruppen()[0] && gruppen()[0].querySelector('.eb__gattung').value) || d.gattung || '';
    gruppenBox.innerHTML = '';
    gruppenBox.appendChild(gruppe(gat, ['']));
    aktualisieren();
  }

  window.addEventListener('pageshow', function () { korbAktualisieren(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) korbAktualisieren(); });

  /* ---------------------------------------------------------------- Start */
  var start = entwurfLaden();
  if (start) {
    start.gruppen.forEach(function (g) {
      var gr = gruppe(g.g, g.n);
      if ((g.n || []).length >= ZU_AB) gr.dataset.zu = '1';
      gruppenBox.appendChild(gr);
    });
  } else {
    gruppenBox.appendChild(gruppe(d.gattung || '', ['']));
  }
  logoSetzen(start ? start.logo : 'tungacea');
  aktualisieren(false);
  korbAktualisieren();
})();

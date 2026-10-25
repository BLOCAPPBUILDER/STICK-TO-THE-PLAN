/* Stick to the plan – Oberfläche. Die Datenfunktionen stehen in kern.js, die Vorlagen in daten.js.
   Drei Ansichten unten in der Leiste: Doings, Notizen, Zeitleiste. Alle Texte aus Daten laufen über esc(). */

var UI_SCHLUESSEL = "doings-ui-v1";
var LANGDRUCK_MS = 600;
var ANSICHTEN = ["notizen", "doings", "zeit"];   // Notizen ist die Startseite
var ANSICHT_TITEL = {
  doings: ["Doings", "Aufgaben mit Rubriken und Datum"],
  notizen: ["Notizen", "Gedanken, Lieder, Links – schnell festhalten"],
  zeit: ["Zeitleiste", "Doings und Meilensteine auf dem Strahl"]
};
var ICON = {
  chev: '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  kreuz: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  zurueck: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  stift: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  hoch: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>',
  runter: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  hell: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  dunkel: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
  system: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>',
  sichern: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
  installieren: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M12 7v7M9.5 11.5L12 14l2.5-2.5"/></svg>'
};
var THEMA_NAMEN = { system: "System", hell: "Hell", dunkel: "Dunkel" };
var NAECHSTES_THEMA = { system: "hell", hell: "dunkel", dunkel: "system" };

var daten = ladeDaten(window.localStorage);
var ui = ladeUi();
var offenerSheet = null;            // "notizen", "formular" oder null
var zeitFormOffen = false;          // Eingabe auf der Zeitleiste: erst nach Tipp auf den Strahl sichtbar
var langdruckAusgeloest = false;    // verhindert, dass ein Langdruck zusätzlich als Tipp zählt
var dunkelAbfrage = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

/* ---------- Einstellungen der Oberfläche (eigener Speicherschlüssel) ---------- */

function ladeUi() {
  var u = {
    thema: "system",
    ansicht: "notizen",
    aktivesProjekt: "",
    doingsOffen: true,
    nurOffene: false,
    rubrikDicht: {},
    notizFilter: "alle",
    letzteRubrik: "",
    letzteNotizRubrik: ""
  };
  try {
    var gespeichert = JSON.parse(window.localStorage.getItem(UI_SCHLUESSEL) || "null");
    if (gespeichert && typeof gespeichert === "object") Object.assign(u, gespeichert);
  } catch (e) {
    /* kaputte Einstellungen: Standard bleibt */
  }
  if (ANSICHTEN.indexOf(u.ansicht) === -1) u.ansicht = "notizen";
  if (!u.startFassung || u.startFassung < 2) {
    /* einmalig: alte Einstellungen starten ab jetzt auf Notizen */
    u.ansicht = "notizen";
    u.startFassung = 2;
  }
  return u;
}

function speichereUi() {
  try {
    window.localStorage.setItem(UI_SCHLUESSEL, JSON.stringify(ui));
  } catch (e) {
    /* ohne Speicher laufen die Einstellungen eben nur bis zum Neuladen */
  }
}

/* Das aktuelle Projekt. Ist keines gewählt oder gelöscht, ist es das erste. */
function P() {
  var p = daten.projekte.find(function (x) { return x.id === ui.aktivesProjekt; });
  return p || daten.projekte[0];
}

function istDunkel() {
  return ui.thema === "dunkel" || (ui.thema === "system" && !!(dunkelAbfrage && dunkelAbfrage.matches));
}

function wendeThemaAn() {
  var dunkel = istDunkel();
  document.documentElement.setAttribute("data-theme", dunkel ? "dark" : "light");
  var farbe = document.getElementById("theme-color");
  if (farbe) farbe.setAttribute("content", dunkel ? "#121214" : "#f5f5f2");
  var knopf = document.getElementById("btn-thema");
  var name = THEMA_NAMEN[ui.thema];
  knopf.innerHTML = ICON[ui.thema];
  knopf.setAttribute("aria-label", "Design: " + name + ". Tippen zum Wechseln");
  knopf.title = "Design: " + name;
}

/* ---------- Hilfen ---------- */

function esc(t) {
  return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function feld(form, name) {
  var el = form.querySelector('[name="' + name + '"]');
  return el ? el.value : "";
}

function findeDoing(id) { return P().doings.find(function (d) { return d.id === id; }); }
function findeRubrik(id) { return P().rubriken.find(function (r) { return r.id === id; }); }
function findeNotiz(id) { return P().notizen.find(function (n) { return n.id === id; }); }
function findeMeilenstein(id) { return P().meilensteine.find(function (m) { return m.id === id; }); }
function findeVorlage(id) { return PROMT_VORLAGEN.find(function (p) { return p.id === id; }); }
function findeProjekt(id) { return daten.projekte.find(function (p) { return p.id === id; }); }

function rubrikOptionen(gewaehlt) {
  var h = '<option value="">Ohne Rubrik</option>';
  P().rubriken.forEach(function (r) {
    h += '<option value="' + esc(r.id) + '"' + (r.id === gewaehlt ? " selected" : "") + ">" + esc(r.name) + "</option>";
  });
  return h;
}

function datumText(iso) {
  var d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" });
}

function heuteIso() {
  return datumVon(Date.now());
}

function zeigeFehler(f, text) {
  var p = f.querySelector("[data-fehler]");
  if (!p) return;
  p.textContent = text;
  p.hidden = false;
}

function aktualisiere() {
  if (!speichereDaten(daten, window.localStorage)) {
    alert("Konnte nicht speichern. Bitte sichere deine Daten über das Symbol oben rechts.");
  }
  zeichne();
}

function setzeAnsicht(name) {
  ui.ansicht = name;
  speichereUi();
  window.scrollTo(0, 0);
  zeichne();
}

/* ---------- Projekte ---------- */

function projektLeisteHtml() {
  var h = '<nav class="projekte" aria-label="Projekte">';
  daten.projekte.forEach(function (p) {
    var aktiv = p.id === P().id;
    h += '<button type="button" class="projekt-chip" data-aktion="projekt-wechseln" data-id="' + esc(p.id) + '" aria-pressed="' + aktiv + '">' + esc(p.name) + "</button>";
  });
  h += '<button type="button" class="projekt-chip plus" data-aktion="projekt-neu" aria-label="Neues Projekt">' + ICON.plus + "</button>";
  h += '<button type="button" class="projekt-chip plus" data-aktion="projekt-bearbeiten" aria-label="Projekt umbenennen oder löschen">' + ICON.stift + "</button>";
  return h + "</nav>";
}

function projektFormular(p) {
  return '<form class="formular" data-form="projekt-speichern"' + (p ? ' data-id="' + esc(p.id) + '"' : "") + ">" +
    '<label>Name des Projekts<input name="titel" maxlength="40" required value="' + esc(p ? p.name : "") + '" placeholder="z. B. Umzug, Studium, Training"></label>' +
    '<div class="formular-knoepfe">' +
      (p && daten.projekte.length > 1 ? '<button type="button" class="klein gefahr" data-aktion="projekt-loeschen" data-id="' + esc(p.id) + '">Projekt löschen</button>' : "") +
      '<span class="spacer"></span><button type="submit" class="knopf">Speichern</button></div>' +
    (p ? '<p class="hinweis">Beim Löschen verschwinden alle Doings, Rubriken, Notizen und Meilensteine dieses Projekts.</p>' : "") +
    "</form>";
}

function speichereProjekt(f) {
  var name = feld(f, "titel").trim();
  if (!name) return;
  var id = f.getAttribute("data-id");
  var p = id ? findeProjekt(id) : null;
  if (p) {
    p.name = name;
  } else {
    p = leerProjekt(name);
    daten.projekte.push(p);
    ui.aktivesProjekt = p.id;
    speichereUi();
  }
  schliesseSheet();
  aktualisiere();
}

/* ---------- Ansicht Doings ---------- */

function doingHtml(d) {
  return '<li class="doing' + (d.erledigt ? " fertig" : "") + '">' +
    '<button type="button" class="haken" data-aktion="doing-haken" data-id="' + esc(d.id) + '" aria-pressed="' + !!d.erledigt + '" aria-label="' +
      (d.erledigt ? "Wieder öffnen: " : "Erledigt: ") + esc(d.text) + '">' + (d.erledigt ? ICON.check : "") + "</button>" +
    '<button type="button" class="doing-text" data-aktion="doing-bearbeiten" data-id="' + esc(d.id) + '">' +
      "<span>" + esc(d.text) + "</span>" +
      (d.faellig ? '<small class="faellig">fällig ' + esc(datumText(d.faellig)) + "</small>" : "") +
      (d.notiz ? "<small>" + esc(d.notiz) + "</small>" : "") +
      (d.prompt ? '<em class="marke">Promt</em>' : "") +
    "</button></li>";
}

function doingsHtml() {
  var pr = P();
  var offen = pr.doings.filter(function (d) { return !d.erledigt; }).length;
  var fertig = pr.doings.length - offen;
  var h = '<section class="karte">';
  h += '<button type="button" class="abschnitt-kopf" data-aktion="doings-auf" aria-expanded="' + ui.doingsOffen + '" aria-controls="doings-body">' +
    '<span class="kopf-text"><h2>Doings</h2><small>' + offen + " offen · " + fertig + " erledigt</small></span>" + ICON.chev + "</button>";
  h += '<div class="abschnitt-body" id="doings-body"' + (ui.doingsOffen ? "" : " hidden") + ">";
  h += '<form class="schnell" data-form="doing-neu" autocomplete="off">' +
    '<input name="text" maxlength="200" placeholder="Neues Doing …" aria-label="Neues Doing" required>' +
    '<input name="prompt" type="hidden" value="">' +
    '<div class="schnell-zeile">' +
      '<input name="faellig" type="date" aria-label="Fällig am (optional)">' +
      '<button type="button" class="knopf knopf-zweit" data-aktion="promt-liste-auf" data-label>Promt</button>' +
      '<button type="submit" class="knopf">+ Hinzufügen</button>' +
    "</div>" +
    '<div class="promt-auswahl" hidden>' + promtAuswahlHtml("prompt") + "</div></form>";
  h += '<div class="werkzeug">' +
    '<button type="button" class="chip" data-aktion="nur-offene" aria-pressed="' + ui.nurOffene + '">Erledigte ausblenden</button>' +
    '<button type="button" class="chip" data-aktion="rubrik-neu">+ Rubrik</button></div>';

  var gruppen = pr.rubriken.map(function (r) { return { id: r.id, name: r.name }; });
  gruppen.push({ id: null, name: "Ohne Rubrik" });

  gruppen.forEach(function (g) {
    var alle = pr.doings.filter(function (d) { return (d.rubrikId || null) === g.id; });
    if (g.id === null && alle.length === 0) return;
    var schluessel = g.id || "_ohne";
    var dicht = !!ui.rubrikDicht[schluessel];
    var offenG = alle.filter(function (d) { return !d.erledigt; }).length;
    var sichtbar = alle.filter(function (d) { return !(ui.nurOffene && d.erledigt); });

    h += '<div class="rubrik"><div class="rubrik-kopf">' +
      '<button type="button" class="rubrik-auf" data-aktion="rubrik-dicht" data-id="' + esc(schluessel) + '" aria-expanded="' + !dicht + '">' +
        ICON.chev + "<span>" + esc(g.name) + "</span>" +
        '<span class="zaehl">' + offenG + "/" + alle.length + "</span></button>" +
      (g.id ? '<button type="button" class="klein" data-aktion="rubrik-bearbeiten" data-id="' + esc(g.id) + '">Bearbeiten</button>' : "") +
      "</div>";
    if (!dicht) {
      if (!sichtbar.length) {
        h += '<p class="leer">' + (alle.length ? "Alles erledigt." : "Noch nichts in dieser Rubrik.") + "</p>";
      } else {
        h += '<ul class="doings">' + sichtbar.map(doingHtml).join("") + "</ul>";
      }
    }
    h += "</div>";
  });

  return h + "</div></section>";
}

function doingFormular(d) {
  return '<form class="formular" data-form="doing-speichern" data-id="' + esc(d.id) + '">' +
    '<label>Doing<input name="text" maxlength="200" required value="' + esc(d.text) + '"></label>' +
    '<label>Rubrik<select name="rubrik">' + rubrikOptionen(d.rubrikId || "") + "</select></label>" +
    '<label>Fällig am<input name="faellig" type="date" value="' + esc(d.faellig) + '"></label>' +
    '<label>Notiz<textarea name="notiz" rows="2" maxlength="500">' + esc(d.notiz) + "</textarea></label>" +
    '<label>Promt (zum Kopieren)<textarea name="prompt" rows="5" maxlength="4000">' + esc(d.prompt) + "</textarea></label>" +
    '<button type="button" class="klein" data-aktion="promt-liste-auf">Promt einfügen</button>' +
    '<div class="promt-auswahl" hidden>' + promtAuswahlHtml("prompt") + "</div>" +
    '<div class="formular-knoepfe">' +
      '<button type="button" class="knopf knopf-zweit" data-aktion="text-kopieren" data-feld="prompt">Promt kopieren</button>' +
      '<button type="button" class="klein gefahr" data-aktion="doing-loeschen" data-id="' + esc(d.id) + '">Löschen</button>' +
      '<span class="spacer"></span>' +
      '<button type="submit" class="knopf">Speichern</button>' +
    "</div></form>";
}

/* Vorlagen direkt im Doing-Formular anbieten. Ein Tipp setzt den Text in das Promt-Feld (hängt bei Bedarf an). */
function promtAuswahlHtml(feldName) {
  return PROMT_VORLAGEN.map(function (p) {
    return '<button type="button" class="chip" data-aktion="promt-einfuegen" data-id="' + esc(p.id) + '" data-feld="' + esc(feldName) + '">' + esc(p.titel) + "</button>";
  }).join("");
}

function rubrikFormular(r) {
  var h = '<form class="formular" data-form="rubrik-speichern"' + (r ? ' data-id="' + esc(r.id) + '"' : "") + ">" +
    '<label>Name der Rubrik<input name="titel" maxlength="40" required value="' + esc(r ? r.name : "") + '" placeholder="z. B. Musik, Ideen, Termine"></label>' +
    '<div class="formular-knoepfe">';
  if (r) h += '<button type="button" class="klein gefahr" data-aktion="rubrik-loeschen" data-id="' + esc(r.id) + '">Rubrik löschen</button>';
  h += '<span class="spacer"></span><button type="submit" class="knopf">Speichern</button></div>';
  if (r) h += '<p class="hinweis">Beim Löschen bleiben Doings und Notizen erhalten und landen in „Ohne Rubrik“.</p>';
  return h + "</form>";
}

function speichereNeuesDoing(f) {
  var text = feld(f, "text").trim();
  if (!text) return;
  var jetzt = Date.now();
  P().doings.push({ id: neueId(), rubrikId: null, text: text, notiz: "", prompt: feld(f, "prompt").trim(), faellig: feld(f, "faellig"), erledigt: false, erstellt: jetzt, ordnung: jetzt });
  aktualisiere();
  var eingabe = document.querySelector('[data-form="doing-neu"] input[name="text"]');
  if (eingabe) eingabe.focus();
}

function speichereDoing(f) {
  var d = findeDoing(f.getAttribute("data-id"));
  var text = feld(f, "text").trim();
  if (!d || !text) return;
  d.text = text;
  d.notiz = feld(f, "notiz").trim();
  d.prompt = feld(f, "prompt").trim();
  d.faellig = gueltigesDatum(feld(f, "faellig")) ? feld(f, "faellig") : "";
  d.rubrikId = feld(f, "rubrik") || null;
  schliesseSheet();
  aktualisiere();
}

function speichereRubrik(f) {
  var name = feld(f, "titel").trim();
  if (!name) return;
  var r = f.getAttribute("data-id") ? findeRubrik(f.getAttribute("data-id")) : null;
  if (r) r.name = name;
  else P().rubriken.push({ id: neueId(), name: name });
  schliesseSheet();
  aktualisiere();
}

/* ---------- Ansicht Zeitleiste ---------- */

function zeitSchnellHtml(zielDatum) {
  return '<form class="zeit-schnell" data-form="zeit-ziel" autocomplete="off">' +
    '<input name="titel" maxlength="200" placeholder="Was passiert? (Doing oder Meilenstein)" aria-label="Titel" required>' +
    '<div class="schnell-zeile">' +
      '<input name="datum" type="date" value="' + esc(zielDatum) + '" aria-label="Datum">' +
      '<button type="button" class="knopf knopf-zweit" data-aktion="zeit-neu" data-typ="doing">+ Doing</button>' +
      '<button type="button" class="knopf" data-aktion="zeit-neu" data-typ="meilenstein">+ Meilenstein</button>' +
    "</div>" +
    '<p class="fehler" data-fehler hidden></p></form>';
}

function zeitSeiteHtml() {
  var pr = P();
  var eintraege = zeitleisteEintraege(pr);
  var heute = heuteIso();
  var datum = pr.zeitModus === "datum";
  var h = '<section class="karte zeit-karte">';
  h += '<div class="zeit-modus" role="group" aria-label="Modus">' +
    '<button type="button" class="chip" data-aktion="zeit-modus" data-wert="datum" aria-pressed="' + datum + '">Mit Datum</button>' +
    '<button type="button" class="chip" data-aktion="zeit-modus" data-wert="generisch" aria-pressed="' + !datum + '">Generisch</button></div>';
  if (zeitFormOffen) h += zeitSchnellHtml(heute);

  if (!eintraege.length) {
    return h + '<div class="zeit-strahl" data-aktion="zeit-form" data-langdruck><p class="leer">Noch nichts auf dem Strahl. Tippe hier, um etwas anzulegen.</p></div></section>';
  }

  h += '<div class="zeit-strahl" data-aktion="zeit-form" data-langdruck><ol class="zeit">';
  if (datum) {
    var gruppen = [];
    eintraege.forEach(function (e) {
      var letzte = gruppen[gruppen.length - 1];
      if (!letzte || letzte.datum !== e.datum) {
        letzte = { datum: e.datum, eintraege: [] };
        gruppen.push(letzte);
      }
      letzte.eintraege.push(e);
    });
    gruppen.forEach(function (g, gi) {
      var klasse = !g.datum ? " ohne" : g.datum === heute ? " heute" : g.datum < heute ? " vergangen" : "";
      h += '<li class="tag' + klasse + (gi % 2 ? " unten" : " oben") + '"><span class="punkt" aria-hidden="true"></span><div class="tag-kopf">' +
        "<time>" + (g.datum ? esc(datumText(g.datum)) : "Ohne Datum") + "</time>" +
        (g.datum === heute ? '<em class="marke">Heute</em>' : "") + "</div>" +
        '<ul class="tag-liste">' + g.eintraege.map(function (e) { return zeitEintragHtml(e, false); }).join("") + "</ul></li>";
    });
  } else {
    eintraege.forEach(function (e, i) {
      h += '<li class="tag' + (i % 2 ? " unten" : " oben") + '"><span class="punkt" aria-hidden="true"></span><div class="tag-kopf"><span class="schritt">' + (i + 1) + "</span></div>" +
        '<ul class="tag-liste">' + zeitEintragHtml(e, true) + "</ul></li>";
    });
  }
  return h + "</ol></div></section>";
}

function zeitEintragHtml(e, generisch) {
  var art = e.typ === "doing" ? "Doing" : e.typ === "meilenstein" ? "Meilenstein" : "Notiz";
  var text = e.typ === "notiz" ? (e.obj.text || e.obj.link) : e.typ === "doing" ? e.obj.text : e.obj.titel;
  var klasse = "ze " + (e.typ === "doing" ? "doing-ze" : e.typ === "meilenstein" ? "meilenstein-ze" : "notiz-ze") + (e.obj.erledigt ? " fertig" : "");
  var knopf = e.typ === "doing" ? "doing-bearbeiten" : e.typ === "meilenstein" ? "meilenstein-bearbeiten" : "notiz-bearbeiten";
  var h = '<li class="' + klasse + '"><button type="button" class="ze-knopf" data-aktion="' + knopf + '" data-id="' + esc(e.obj.id) + '">' +
    '<span class="ze-art">' + art + "</span><span>" + esc(text) + "</span></button>";
  if (generisch) {
    h += '<span class="ze-pfeile"><button type="button" class="klein" data-aktion="zeit-hoch" data-id="' + esc(e.obj.id) + '" aria-label="Nach oben">' + ICON.hoch + "</button>" +
      '<button type="button" class="klein" data-aktion="zeit-runter" data-id="' + esc(e.obj.id) + '" aria-label="Nach unten">' + ICON.runter + "</button></span>";
  }
  return h + "</li>";
}

function speichereZeitNeu(typ, f) {
  if (!f) return;
  var titel = feld(f, "titel").trim();
  var datum = feld(f, "datum");
  if (!titel) return zeigeFehler(f, "Bitte einen Titel eingeben.");
  if (datum && !gueltigesDatum(datum)) return zeigeFehler(f, "Das Datum ist ungültig.");
  if (typ === "meilenstein" && P().zeitModus === "datum" && !datum) return zeigeFehler(f, "Im Datumsmodus braucht der Meilenstein ein Datum.");
  var jetzt = Date.now();
  if (typ === "doing") {
    P().doings.push({ id: neueId(), rubrikId: null, text: titel, notiz: "", prompt: "", faellig: datum, erledigt: false, erstellt: jetzt, ordnung: jetzt });
  } else {
    P().meilensteine.push({ id: neueId(), titel: titel, datum: datum, erstellt: jetzt, ordnung: jetzt });
  }
  schliesseSheet();
  aktualisiere();
}

function zielDatumHtml() {
  return '<div class="formular">' +
    zeitSchnellHtml(heuteIso()) + "</div>";
}

function meilensteinFormular(m) {
  return '<form class="formular" data-form="meilenstein-speichern" data-id="' + esc(m.id) + '">' +
    '<label>Meilenstein<input name="titel" maxlength="200" required value="' + esc(m.titel) + '"></label>' +
    '<label>Datum' + (P().zeitModus === "datum" ? "" : " (optional)") + '<input name="datum" type="date" value="' + esc(m.datum) + '"></label>' +
    '<div class="formular-knoepfe">' +
      '<button type="button" class="klein gefahr" data-aktion="meilenstein-loeschen" data-id="' + esc(m.id) + '">Löschen</button>' +
      '<span class="spacer"></span><button type="submit" class="knopf">Speichern</button></div></form>';
}

function speichereMeilenstein(f) {
  var m = findeMeilenstein(f.getAttribute("data-id"));
  var titel = feld(f, "titel").trim();
  if (!m || !titel) return;
  m.titel = titel;
  m.datum = gueltigesDatum(feld(f, "datum")) ? feld(f, "datum") : "";
  schliesseSheet();
  aktualisiere();
}

/* ---------- Ansicht Notizen (Denkbrett) ---------- */

function chipHtml(wert, label, aktuell) {
  return '<button type="button" class="chip" data-aktion="notiz-filter" data-wert="' + esc(wert) + '" aria-pressed="' + (wert === aktuell) + '">' + esc(label) + "</button>";
}

function notizenSeiteHtml() {
  var pr = P();
  var f = ui.notizFilter;
  if (f !== "alle" && f !== "ohne" && !findeRubrik(f)) f = "alle";

  var h = '<section class="karte notiz-karte-gross"><form class="notiz-form" data-form="notiz-neu" autocomplete="off">' +
    '<textarea name="text" rows="3" maxlength="2000" placeholder="Gedanke, Liedtitel, Idee …" aria-label="Notiz"></textarea>' +
    '<input name="link" type="text" maxlength="500" inputmode="url" placeholder="Link (Spotify, YouTube …), optional" aria-label="Link">' +
    '<div class="schnell-zeile"><select name="rubrik" aria-label="Rubrik">' + rubrikOptionen(ui.letzteNotizRubrik) + "</select>" +
    '<button type="submit" class="knopf">Speichern</button></div>' +
    '<p class="fehler" data-fehler hidden></p></form></section>';

  h += '<div class="chips" role="group" aria-label="Filter">' + chipHtml("alle", "Alle", f) + chipHtml("ohne", "Ohne Rubrik", f);
  pr.rubriken.forEach(function (r) { h += chipHtml(r.id, r.name, f); });
  h += "</div>";

  var liste = pr.notizen.filter(function (n) {
    if (f === "alle") return true;
    if (f === "ohne") return !n.rubrikId;
    return n.rubrikId === f;
  });
  if (!liste.length) return h + '<p class="leer">Noch keine Notizen. Gedanken, Lieder und Links landen hier.</p>';

  return h + '<ul class="notiz-liste">' + liste.map(notizKarte).join("") + "</ul>";
}

function notizKarte(n) {
  var h = '<li class="notiz-karte">';
  if (n.text) h += "<p>" + esc(n.text) + "</p>";
  h += '<div class="notiz-fuss">';
  if (n.link) {
    var art = linkArt(n.link);
    h += '<a class="linkmarke ' + art.toLowerCase() + '" href="' + esc(n.link) + '" target="_blank" rel="noopener noreferrer" title="' + esc(n.link) + '">' + esc(art) + " ↗</a>";
  }
  if (n.rubrikId && findeRubrik(n.rubrikId)) h += '<span class="marke">' + esc(rubrikName(P(), n.rubrikId)) + "</span>";
  h += '<span class="spacer"></span>' +
    '<button type="button" class="klein" data-aktion="notiz-bearbeiten" data-id="' + esc(n.id) + '">Bearbeiten</button>' +
    "</div></li>";
  return h;
}

function notizFormular(n) {
  return '<form class="formular" data-form="notiz-speichern" data-id="' + esc(n.id) + '">' +
    '<label>Notiz<textarea name="text" rows="4" maxlength="2000">' + esc(n.text) + "</textarea></label>" +
    '<label>Link<input name="link" type="text" maxlength="500" inputmode="url" value="' + esc(n.link) + '"></label>' +
    '<label>Rubrik<select name="rubrik">' + rubrikOptionen(n.rubrikId || "") + "</select></label>" +
    '<p class="fehler" data-fehler hidden></p>' +
    '<div class="formular-knoepfe">' +
      '<button type="button" class="klein gefahr" data-aktion="notiz-loeschen" data-id="' + esc(n.id) + '">Löschen</button>' +
      '<span class="spacer"></span><button type="submit" class="knopf">Speichern</button>' +
    "</div></form>";
}

function speichereNotiz(f) {
  var text = feld(f, "text").trim();
  var eingabe = feld(f, "link").trim();
  var link = sichererLink(eingabe);
  if (eingabe && !link) return zeigeFehler(f, "Das ist kein gültiger Link.");
  if (!text && !link) return zeigeFehler(f, "Bitte Text oder einen Link eingeben.");

  var rubrik = feld(f, "rubrik");
  var n = f.getAttribute("data-id") ? findeNotiz(f.getAttribute("data-id")) : null;
  if (n) {
    n.text = text;
    n.link = link;
    n.rubrikId = rubrik || null;
    schliesseSheet();
  } else {
    ui.letzteNotizRubrik = rubrik;
    speichereUi();
    var jetzt = Date.now();
    P().notizen.unshift({ id: neueId(), text: text, link: link, rubrikId: rubrik || null, erstellt: jetzt, ordnung: jetzt });
  }
  aktualisiere();
}

/* ---------- Sichern ---------- */

function kopiere(text, knopf) {
  function fertig() {
    var alt = knopf.textContent;
    knopf.textContent = "Kopiert ✓";
    setTimeout(function () { knopf.textContent = alt; }, 1500);
  }
  function notfall() {
    var feldText = document.createElement("textarea");
    feldText.value = text;
    feldText.setAttribute("readonly", "");
    feldText.style.position = "fixed";
    feldText.style.opacity = "0";
    document.body.appendChild(feldText);
    feldText.select();
    try {
      document.execCommand("copy");
      fertig();
    } catch (e) {
      alert("Konnte nicht kopieren. Bitte den Text von Hand markieren.");
    }
    feldText.remove();
  }
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(fertig, notfall);
  else notfall();
}

/* Öffentliche Adresse der App (GitHub Pages). Im Browser gilt die Adresse, unter der die App gerade läuft;
 * die feste Adresse nur, wenn sie nicht über http(s) geöffnet ist (z. B. als Datei oder später in einer Store-App). */
var APP_ADRESSE = "https://blocappbuilder.github.io/STICK-TO-THE-PLAN/";

function appAdresse() {
  if (!/^https?:$/.test(location.protocol)) return APP_ADRESSE;
  return location.origin + location.pathname.replace(/index\.html$/, "");
}

function sicherungHtml() {
  return '<p class="hinweis">Deine Daten liegen nur auf diesem Gerät. Sichere sie ab und zu als Datei, bevor du den Browser-Speicher leerst.</p>' +
    '<div class="formular-knoepfe"><button type="button" class="knopf" data-aktion="exportieren">Datei sichern</button>' +
    '<label class="knopf knopf-zweit">Datei laden<input type="file" accept="application/json,.json" class="versteckt" data-datei="importieren"></label></div>' +
    '<p class="fehler" data-fehler hidden></p>' +
    '<h3 class="teilen-titel">App weitergeben</h3>' +
    '<p class="hinweis">Mit diesem Link öffnet man die App im Browser und kann sie über „Zum Startbildschirm hinzufügen“ installieren. Deine Daten werden dabei nicht mitgeschickt.</p>' +
    '<div class="app-link">' + esc(appAdresse()) + '</div>' +
    '<div class="formular-knoepfe"><button type="button" class="knopf knopf-zweit" data-aktion="link-kopieren">Link kopieren</button>' +
    (navigator.share ? '<button type="button" class="knopf knopf-zweit" data-aktion="link-teilen">Teilen …</button>' : '') +
    '</div>';
}

function exportiere() {
  var blob = new Blob([JSON.stringify(daten, null, 2)], { type: "application/json" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "stick-to-the-plan-" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

function importiere(datei) {
  var leser = new FileReader();
  leser.onload = function () {
    var neu = null;
    try {
      neu = saeubereDaten(JSON.parse(leser.result));
    } catch (e) {
      neu = null;
    }
    if (!neu) {
      var p = document.querySelector("#sheet [data-fehler]");
      if (p) { p.textContent = "Diese Datei passt nicht zu Stick to the plan."; p.hidden = false; }
      return;
    }
    if (!confirm("Alle aktuellen Projekte durch den Inhalt dieser Datei ersetzen?")) return;
    daten = neu;
    ui.aktivesProjekt = "";
    speichereUi();
    schliesseSheet();
    aktualisiere();
  };
  leser.readAsText(datei);
}

/* ---------- Fenster (Sheets) ---------- */

function oeffneSheet(titel, inhalt, art) {
  var s = document.getElementById("sheet");
  s.innerHTML = '<div class="sheet-hinter" data-aktion="sheet-zu"></div>' +
    '<section class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(titel) + '">' +
    '<header class="sheet-kopf"><h2>' + esc(titel) + '</h2>' +
    '<button type="button" class="rund" data-aktion="sheet-zu" aria-label="Schließen">' + ICON.kreuz + "</button></header>" +
    '<div class="sheet-body">' + inhalt + "</div></section>";
  s.hidden = false;
  offenerSheet = art;
  document.body.style.overflow = "hidden";
}

function schliesseSheet() {
  var s = document.getElementById("sheet");
  s.hidden = true;
  s.innerHTML = "";
  offenerSheet = null;
  document.body.style.overflow = "";
}

/* ---------- Zeichnen ---------- */

function zeichne() {
  var ans = ui.ansicht;
  document.getElementById("projekte-leiste").innerHTML = projektLeisteHtml();
  document.getElementById("kopf-titel").textContent = ANSICHT_TITEL[ans][0];
  document.getElementById("kopf-unter").textContent = ANSICHT_TITEL[ans][1];
  document.getElementById("btn-zurueck").hidden = ans === "notizen";
  document.getElementById("app").innerHTML = ans === "doings" ? doingsHtml() : ans === "notizen" ? notizenSeiteHtml() : zeitSeiteHtml();
  document.querySelectorAll('[data-aktion="ansicht"]').forEach(function (b) {
    var aktiv = b.getAttribute("data-wert") === ans;
    b.classList.toggle("aktiv", aktiv);
    if (aktiv) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
}

/* ---------- Wischen und Langdruck ---------- */

var wisch = null;
var langdruck = null;

document.addEventListener("touchstart", function (e) {
  if (e.touches.length !== 1 || offenerSheet) { wisch = null; return; }
  var t = e.touches[0];
  wisch = { x: t.clientX, y: t.clientY, zeit: Date.now(), ziel: e.target };
}, { passive: true });

/* Wisch nach links: nächste Ansicht, nach rechts: vorige Ansicht */
document.addEventListener("touchend", function (e) {
  if (!wisch) return;
  var t = e.changedTouches[0];
  var dx = t.clientX - wisch.x;
  var dy = t.clientY - wisch.y;
  var dauer = Date.now() - wisch.zeit;
  var ziel = wisch.ziel;
  wisch = null;
  if (Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 0.6 || dauer > 700) return;
  if (ziel.closest && ziel.closest("input, textarea, select, .projekte, .zeit-strahl")) return;
  var i = ANSICHTEN.indexOf(ui.ansicht);
  var j = dx < 0 ? i + 1 : i - 1;
  if (j >= 0 && j < ANSICHTEN.length) setzeAnsicht(ANSICHTEN[j]);
}, { passive: true });

/* Langdruck auf den Strahl der Zeitleiste (nicht auf Einträge und Knöpfe) */
document.addEventListener("pointerdown", function (e) {
  if (ui.ansicht !== "zeit" || e.target.closest("button, input, select")) return;
  if (!e.target.closest("[data-langdruck]")) return;
  clearTimeout(langdruck);
  langdruck = setTimeout(function () {
    langdruck = null;
    langdruckAusgeloest = true;
    if (navigator.vibrate) navigator.vibrate(20);
    oeffneSheet("Zieldatum", zielDatumHtml(), "formular");
  }, LANGDRUCK_MS);
});

["pointerup", "pointercancel", "pointerleave"].forEach(function (ereignis) {
  document.addEventListener(ereignis, function () {
    clearTimeout(langdruck);
    langdruck = null;
  });
});

/* ---------- Klicks, Absenden, Dateiwahl, Tastatur ---------- */

document.addEventListener("click", function (e) {
  var el = e.target.closest("[data-aktion]");
  if (!el) return;
  var id = el.getAttribute("data-id");
  switch (el.getAttribute("data-aktion")) {
    case "ansicht":
      setzeAnsicht(el.getAttribute("data-wert"));
      break;
    case "zurueck":
      setzeAnsicht("notizen");
      break;
    case "thema":
      ui.thema = NAECHSTES_THEMA[ui.thema];
      speichereUi();
      wendeThemaAn();
      break;
    case "sichern":
      oeffneSheet("Sichern und teilen", sicherungHtml(), "formular");
      break;
    case "exportieren":
      exportiere();
      break;
    case "installieren":
      installiere();
      break;
    case "link-kopieren":
      kopiere(appAdresse(), el);
      break;
    case "link-teilen":
      navigator.share({ title: "Stick to the plan", url: appAdresse() }).catch(function (fehler) {
        if (!fehler || fehler.name !== "AbortError") kopiere(appAdresse(), el);
      });
      break;
    case "projekt-wechseln":
      ui.aktivesProjekt = id;
      speichereUi();
      zeichne();
      break;
    case "projekt-neu":
      oeffneSheet("Neues Projekt", projektFormular(null), "formular");
      break;
    case "projekt-bearbeiten":
      oeffneSheet("Projekt bearbeiten", projektFormular(P()), "formular");
      break;
    case "projekt-loeschen":
      if (confirm("Projekt mit allen Doings, Rubriken, Notizen und Meilensteinen löschen?")) {
        daten.projekte = daten.projekte.filter(function (p) { return p.id !== id; });
        ui.aktivesProjekt = "";
        speichereUi();
        schliesseSheet();
        aktualisiere();
      }
      break;
    case "zeit-form":
      if (langdruckAusgeloest) {
        langdruckAusgeloest = false;
        break;
      }
      zeitFormOffen = !zeitFormOffen;
      zeichne();
      break;
    case "zeit-modus":
      P().zeitModus = el.getAttribute("data-wert");
      aktualisiere();
      break;
    case "zeit-neu":
      speichereZeitNeu(el.getAttribute("data-typ"), el.closest("form"));
      break;
    case "zeit-hoch":
    case "zeit-runter":
      zeitSchiebe(P(), id, el.getAttribute("data-aktion") === "zeit-hoch" ? -1 : 1);
      aktualisiere();
      break;
    case "meilenstein-bearbeiten": {
      var m = findeMeilenstein(id);
      if (m) oeffneSheet("Meilenstein bearbeiten", meilensteinFormular(m), "formular");
      break;
    }
    case "meilenstein-loeschen":
      if (confirm("Diesen Meilenstein löschen?")) {
        P().meilensteine = P().meilensteine.filter(function (x) { return x.id !== id; });
        schliesseSheet();
        aktualisiere();
      }
      break;
    case "promt-liste-auf": {
      var auswahl = el.parentElement.querySelector(".promt-auswahl");
      if (auswahl) auswahl.hidden = !auswahl.hidden;
      break;
    }
    case "promt-einfuegen": {
      var formular = el.closest("form");
      var feldZiel = formular.querySelector('[name="' + el.getAttribute("data-feld") + '"]');
      var vorlage = findeVorlage(id);
      if (feldZiel && vorlage) {
        var bisher = feldZiel.value.trim();
        feldZiel.value = bisher ? bisher + "\n\n" + vorlage.text : vorlage.text;
      }
      var marke = formular.querySelector("[data-label]");
      if (marke && vorlage) marke.textContent = "Promt: " + vorlage.titel;
      formular.querySelector(".promt-auswahl").hidden = true;
      break;
    }
    case "doings-auf":
      ui.doingsOffen = !ui.doingsOffen;
      speichereUi();
      zeichne();
      break;
    case "nur-offene":
      ui.nurOffene = !ui.nurOffene;
      speichereUi();
      zeichne();
      break;
    case "rubrik-dicht":
      ui.rubrikDicht[id] = !ui.rubrikDicht[id];
      speichereUi();
      zeichne();
      break;
    case "rubrik-neu":
      oeffneSheet("Neue Rubrik", rubrikFormular(null), "formular");
      break;
    case "rubrik-bearbeiten":
      oeffneSheet("Rubrik bearbeiten", rubrikFormular(findeRubrik(id)), "formular");
      break;
    case "rubrik-loeschen":
      if (confirm("Rubrik löschen? Doings und Notizen bleiben erhalten.")) {
        rubrikLoeschen(P(), id);
        schliesseSheet();
        aktualisiere();
      }
      break;
    case "doing-haken": {
      var d = findeDoing(id);
      if (d) {
        d.erledigt = !d.erledigt;
        aktualisiere();
      }
      break;
    }
    case "doing-bearbeiten":
      oeffneSheet("Doing bearbeiten", doingFormular(findeDoing(id)), "formular");
      break;
    case "doing-loeschen":
      if (confirm("Dieses Doing löschen?")) {
        P().doings = P().doings.filter(function (x) { return x.id !== id; });
        schliesseSheet();
        aktualisiere();
      }
      break;
    case "text-kopieren":
      kopiere(feld(el.closest("form"), el.getAttribute("data-feld")), el);
      break;
    case "notiz-filter":
      ui.notizFilter = el.getAttribute("data-wert");
      speichereUi();
      zeichne();
      break;
    case "notiz-bearbeiten": {
      var n = findeNotiz(id);
      if (n) oeffneSheet("Notiz bearbeiten", notizFormular(n), "formular");
      break;
    }
    case "notiz-loeschen":
      if (confirm("Diese Notiz löschen?")) {
        P().notizen = P().notizen.filter(function (x) { return x.id !== id; });
        schliesseSheet();
        aktualisiere();
      }
      break;
    case "sheet-zu":
      schliesseSheet();
      break;
  }
});

document.addEventListener("submit", function (e) {
  var f = e.target;
  var art = f.getAttribute("data-form");
  if (!art) return;
  e.preventDefault();
  if (art === "doing-neu") speichereNeuesDoing(f);
  else if (art === "doing-speichern") speichereDoing(f);
  else if (art === "rubrik-speichern") speichereRubrik(f);
  else if (art === "projekt-speichern") speichereProjekt(f);
  else if (art === "meilenstein-speichern") speichereMeilenstein(f);
  else if (art === "notiz-neu" || art === "notiz-speichern") speichereNotiz(f);
  else if (art === "zeit-ziel") speichereZeitNeu("doing", f);
});

document.addEventListener("change", function (e) {
  var t = e.target;
  if (t.getAttribute && t.getAttribute("data-datei") === "importieren" && t.files && t.files[0]) {
    importiere(t.files[0]);
  }
});

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && offenerSheet) schliesseSheet();
});

if (dunkelAbfrage && dunkelAbfrage.addEventListener) {
  dunkelAbfrage.addEventListener("change", function () {
    if (ui.thema === "system") wendeThemaAn();
  });
}

/* ---------- Als App installieren ----------
 * Android/Chrome: der Browser meldet „beforeinstallprompt“, dann öffnet der Knopf den echten Installationsdialog.
 * iPhone/iPad: Safari hat keinen solchen Dialog, der Knopf erklärt den Weg über „Teilen › Zum Home-Bildschirm“.
 * Läuft die App schon installiert (eigenes Fenster), bleibt der Knopf verborgen. */
var installAngebot = null;

function laeuftAlsApp() {
  return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
}
function istIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
function zeigeInstallKnopf() {
  var k = document.getElementById("btn-installieren");
  if (k) k.hidden = laeuftAlsApp() || !(installAngebot || istIos());
}
function installiere() {
  if (installAngebot) {
    installAngebot.prompt();
    installAngebot.userChoice.then(function () { installAngebot = null; zeigeInstallKnopf(); }, function () {});
    return;
  }
  oeffneSheet("Als App installieren",
    '<p class="hinweis">So kommt „Stick to the plan“ als App auf deinen Startbildschirm:</p>' +
    '<ol class="install-schritte">' +
    (istIos()
      ? '<li>Die Seite in <b>Safari</b> öffnen.</li><li>Unten auf <b>Teilen</b> tippen (Quadrat mit Pfeil nach oben).</li><li><b>Zum Home-Bildschirm</b> wählen und mit <b>Hinzufügen</b> bestätigen.</li>'
      : '<li>Das Browser-Menü öffnen (⋮ oben rechts).</li><li><b>App installieren</b> oder <b>Zum Startbildschirm hinzufügen</b> wählen.</li>') +
    '</ol><p class="hinweis">Danach startet die App ohne Adressleiste und funktioniert auch offline. Deine Daten bleiben auf dem Gerät.</p>',
    "info");
}
window.addEventListener("beforeinstallprompt", function (e) {
  e.preventDefault();
  installAngebot = e;
  zeigeInstallKnopf();
});
window.addEventListener("appinstalled", function () {
  installAngebot = null;
  zeigeInstallKnopf();
});

document.getElementById("btn-installieren").innerHTML = ICON.installieren;
zeigeInstallKnopf();
document.querySelector('[data-aktion="sichern"]').innerHTML = ICON.sichern;
document.getElementById("btn-zurueck").innerHTML = ICON.zurueck;
wendeThemaAn();
zeichne();
if ("serviceWorker" in navigator && /^https?:/.test(location.protocol)) {
  navigator.serviceWorker.register("./sw.js").catch(function () {});
}

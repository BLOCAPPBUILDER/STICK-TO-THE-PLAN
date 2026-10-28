/* Stick to the plan – Oberfläche. Die Datenfunktionen stehen in kern.js, die Vorlagen in daten.js,
   Fotos und Dateien in dateien.js. Drei Ansichten unten in der Leiste: Notizen, Doings, Zeitleiste.
   Alle Texte aus Daten laufen über esc(). */

var UI_SCHLUESSEL = "doings-ui-v1";
var LANGDRUCK_MS = 600;
var BILD_MAX = 1600;                             // lange Seite in Pixeln; größere Fotos werden verkleinert
var ANSICHTEN = ["notizen", "doings", "zeit"];   // Notizen ist die Startseite
var ANSICHT_TITEL = {
  doings: ["Doings", "Aufgaben mit Datum, Notiz und Dateien"],
  notizen: ["Notizen", "Gedanken, Lieder, Links, Fotos – schnell festhalten"],
  zeit: ["Zeitleiste", "Doings und Meilensteine auf dem Strahl"]
};
var ICON = {
  chev: '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  kreuz: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  zurueck: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  stift: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  teilen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4M5 13v6h14v-6"/></svg>',
  muell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  kalender: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
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
var offenerSheet = null;            // "aktion", "formular" oder null
var zeitFormOffen = false;          // Eingabe auf der Zeitleiste: erst nach Tipp auf den Strahl sichtbar
var langdruck = null;               // Zeitgeber für den Langdruck
var langdruckAusgeloest = false;    // der Tipp nach einem Langdruck zählt nicht
var speichertGerade = false;        // verhindert doppeltes Absenden beim Speichern mit Dateien
var wartend = { notiz: [], doing: [] };   // ausgewählte Dateien, die noch nicht gespeichert sind
var vorschauUrls = {};              // Dateikennung -> Adresse zur Anzeige (je Datei nur einmal)
var wisch = null;
var dunkelAbfrage = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

/* ---------- Einstellungen der Oberfläche (eigener Speicherschlüssel) ---------- */

function ladeUi() {
  var u = {
    thema: "system",
    ansicht: "notizen",
    aktivesProjekt: "",
    doingsOffen: true,
    notizFormOffen: true,
    nurOffene: false,
    eingeklappt: {}                 // Doings und Notizen, die eingeklappt sind: { kennung: true }
  };
  try {
    var gespeichert = JSON.parse(window.localStorage.getItem(UI_SCHLUESSEL) || "null");
    if (gespeichert && typeof gespeichert === "object") Object.assign(u, gespeichert);
  } catch (e) {
    /* kaputte Einstellungen: Standard bleibt */
  }
  if (ANSICHTEN.indexOf(u.ansicht) === -1) u.ansicht = "notizen";
  if (!u.eingeklappt || typeof u.eingeklappt !== "object") u.eingeklappt = {};
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
function findeNotiz(id) { return P().notizen.find(function (n) { return n.id === id; }); }
function findeMeilenstein(id) { return P().meilensteine.find(function (m) { return m.id === id; }); }
function findeVorlage(id) { return PROMT_VORLAGEN.find(function (p) { return p.id === id; }); }
function findeProjekt(id) { return daten.projekte.find(function (p) { return p.id === id; }); }

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

function dateiFehler() {
  alert("Die Datei konnte nicht gespeichert werden. Vielleicht ist der Speicher des Geräts voll.");
}

function aktualisiere() {
  if (!speichereDaten(daten, window.localStorage)) {
    alert("Konnte nicht speichern. Bitte sichere deine Daten über das Symbol oben rechts.");
  }
  zeichne(false);
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
    h += '<button type="button" class="projekt-chip" data-aktion="projekt-wechseln" data-lang="projekt" data-id="' + esc(p.id) + '" aria-pressed="' + aktiv + '">' + esc(p.name) + "</button>";
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
    (p ? '<p class="hinweis">Beim Löschen verschwinden alle Doings, Notizen, Meilensteine und Dateien dieses Projekts. Tipp: Langes Drücken auf den Projektnamen öffnet ein Menü zum Umbenennen und Löschen.</p>' : "") +
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

function projektLoeschenAbfrage(id) {
  var p = findeProjekt(id);
  if (!p) return;
  if (daten.projekte.length < 2) return alert("Das letzte Projekt kann nicht gelöscht werden.");
  if (confirm("Projekt „" + p.name + "“ mit allen Doings, Notizen, Meilensteinen und Dateien löschen?")) projektLoeschen(id);
}

function projektLoeschen(id) {
  var p = findeProjekt(id);
  if (!p) return;
  dateienLoeschen(anhangIdsVon(p)).catch(function () {});
  daten.projekte = daten.projekte.filter(function (x) { return x.id !== id; });
  ui.aktivesProjekt = "";
  speichereUi();
  schliesseSheet();
  aktualisiere();
}

/* Langdruck auf ein Projekt: Umbenennen oder Löschen. Wirkt auf das gedrückte Projekt, nicht auf das aktive. */
function oeffneProjektMenue(id) {
  var p = findeProjekt(id);
  if (!p) return;
  var stelle = daten.projekte.indexOf(p);
  var letzte = daten.projekte.length - 1;
  var knopf = function (aktion, text, extra) {
    return '<button type="button"' + (extra || "") + ' data-aktion="' + aktion + '" data-id="' + esc(id) + '">' + text + "</button>";
  };
  var h = '<div class="aktion-liste">';
  if (stelle > 0) {
    h += knopf("projekt-nach-vorn", ICON.hoch + "Nach vorn (zuerst anzeigen)");
    h += knopf("projekt-verschieben", ICON.hoch + "Nach links", ' data-richtung="-1"');
  }
  if (stelle < letzte) h += knopf("projekt-verschieben", ICON.runter + "Nach rechts", ' data-richtung="1"');
  h += knopf("projekt-teilen", ICON.teilen + "Teilen");
  h += knopf("projekt-umbenennen", ICON.stift + "Umbenennen");
  h += '<button type="button" class="gefahr" data-aktion="projekt-loeschen" data-id="' + esc(id) + '">' + ICON.muell + "Löschen</button>";
  oeffneSheet(p.name.slice(0, 60), h + "</div>", "aktion");
}

/* Projekt-Reihenfolge: die Reihenfolge der Projektleiste zeigt die Priorität. */
function projektVerschieben(id, richtung) {
  var i = daten.projekte.findIndex(function (p) { return p.id === id; });
  var j = i + richtung;
  if (i < 0 || j < 0 || j >= daten.projekte.length) return;
  var tmp = daten.projekte[i];
  daten.projekte[i] = daten.projekte[j];
  daten.projekte[j] = tmp;
  schliesseSheet();
  aktualisiere();
}

function projektNachVorn(id) {
  var i = daten.projekte.findIndex(function (p) { return p.id === id; });
  if (i <= 0) return;
  var p = daten.projekte.splice(i, 1)[0];
  daten.projekte.unshift(p);
  schliesseSheet();
  aktualisiere();
}

/* Teilt den Stand eines Projekts als Text: offene Doings, Notizen, Meilensteine. */
function teileProjekt(id) {
  var p = findeProjekt(id);
  if (!p) return;
  var zeilen = [p.name, "", "Offene Doings:"];
  var offene = p.doings.filter(function (d) { return !d.erledigt; });
  offene.forEach(function (d) {
    zeilen.push("- " + d.text + (d.faellig ? " (fällig " + datumText(d.faellig) + ")" : ""));
  });
  if (!offene.length) zeilen.push("(keine)");
  if (p.notizen.length) {
    zeilen.push("", "Notizen:");
    p.notizen.forEach(function (n) { zeilen.push("- " + (n.text || n.link || "Foto")); });
  }
  var text = zeilen.join("\n");
  schliesseSheet();
  if (!navigator.share) return kopiere(text, document.createElement("span"));
  navigator.share({ title: p.name, text: text }).catch(function (fehler) {
    if (!fehler || fehler.name !== "AbortError") kopiere(text, document.createElement("span"));
  });
}

/* ---------- Dateien an Doings und Notizen ---------- */

/* Große Fotos werden vor dem Speichern verkleinert und als JPEG abgelegt. Andere Dateien bleiben unverändert. */
function verkleinereBild(datei) {
  if (!/^image\/(jpeg|png|webp)$/.test(datei.type)) return Promise.resolve(datei);
  return new Promise(function (ok) {
    var adresse = URL.createObjectURL(datei);
    var bild = new Image();
    bild.onload = function () {
      var lang = Math.max(bild.naturalWidth, bild.naturalHeight);
      if (lang <= BILD_MAX && datei.size <= 1500000) {
        URL.revokeObjectURL(adresse);
        return ok(datei);
      }
      var f = Math.min(1, BILD_MAX / lang);
      var c = document.createElement("canvas");
      c.width = Math.round(bild.naturalWidth * f);
      c.height = Math.round(bild.naturalHeight * f);
      var zeichnung = c.getContext("2d");
      zeichnung.fillStyle = "#fff";
      zeichnung.fillRect(0, 0, c.width, c.height);
      zeichnung.drawImage(bild, 0, 0, c.width, c.height);
      URL.revokeObjectURL(adresse);
      c.toBlob(function (b) { ok(b || datei); }, "image/jpeg", 0.85);
    };
    bild.onerror = function () {
      URL.revokeObjectURL(adresse);
      ok(datei);
    };
    bild.src = adresse;
  });
}

/* Liest die Vorschau-Adressen aus dem Speicher und setzt sie an die Anhänge in wurzel. */
function ladeAnhaenge(wurzel) {
  wurzel.querySelectorAll("a[data-anhang-id]").forEach(function (a) {
    var id = a.getAttribute("data-anhang-id");
    function fertig(adresse) {
      a.href = adresse;
      a.setAttribute("download", a.getAttribute("data-name") || "Datei");
      var bild = a.querySelector("img");
      if (bild) bild.src = adresse;
    }
    if (vorschauUrls[id]) return fertig(vorschauUrls[id]);
    dateiHolen(id).then(function (satz) {
      if (!satz) return;
      vorschauUrls[id] = URL.createObjectURL(satz.blob);
      fertig(vorschauUrls[id]);
    }).catch(function () {});
  });
}

/* Anzeige der Anhänge in Doings und Notizen. */
function anhangHtml(liste) {
  if (!liste || !liste.length) return "";
  return '<ul class="anhang-galerie">' + liste.map(function (a) {
    var bild = /^image\//.test(a.typ);
    return '<li><a class="anhang' + (bild ? " bild" : "") + '" data-anhang-id="' + esc(a.id) + '" data-name="' + esc(a.name) + '">' +
      (bild ? '<img class="anhang-bild" alt="' + esc(a.name) + '">' : '<span class="anhang-name">' + esc(a.name) + "</span>") +
      "</a></li>";
  }).join("") + "</ul>";
}

/* Verwaltung der Anhänge im Bearbeiten-Fenster: entfernen und neue hinzufügen. */
function anhangBereichHtml(art, eintrag) {
  var liste = eintrag.anhaenge || [];
  var h = '<div class="anhang-bereich" data-anhang-bereich data-art="' + art + '" data-id="' + esc(eintrag.id) + '">' +
    '<span class="bereich-titel">Fotos und Dateien</span>';
  if (liste.length) {
    h += '<ul class="anhang-verwaltung">' + liste.map(function (a) {
      return '<li class="anhang-zeile"><span class="anhang-name">' + esc(a.name) + "</span>" +
        '<button type="button" class="klein gefahr" data-aktion="anhang-loeschen" data-art="' + art + '" data-id="' + esc(eintrag.id) + '" data-anhang="' + esc(a.id) + '">Entfernen</button></li>';
    }).join("") + "</ul>";
  }
  return h + '<label class="knopf knopf-zweit datei-knopf">+ Foto oder Datei<input type="file" multiple class="versteckt" data-datei="direkt" data-art="' + art + '" data-id="' + esc(eintrag.id) + '"></label></div>';
}

function aktualisiereAnhangBereich(id) {
  var bereich = document.querySelector('[data-anhang-bereich][data-id="' + id + '"]');
  var art = bereich ? bereich.getAttribute("data-art") : "";
  var eintrag = art === "doing" ? findeDoing(id) : findeNotiz(id);
  if (!bereich || !eintrag) return;
  bereich.outerHTML = anhangBereichHtml(art, eintrag);
}

/* Dateien an ein bestehendes Doing oder eine Notiz hängen. Wirkt sofort. */
function anhangHinzufuegen(art, id, dateiListe) {
  var eintrag = art === "doing" ? findeDoing(id) : findeNotiz(id);
  var neu = Array.from(dateiListe);
  if (!eintrag || !neu.length) return;
  /* Wie bei der Auswahl oben: Bilder erst verkleinern, dann speichern */
  Promise.all(neu.map(function (f) {
    return verkleinereBild(f).then(function (b) { return { name: f.name, blob: b }; });
  })).then(function (liste) {
    mitDateien(liste, function (anhaenge) {
      eintrag.anhaenge = (eintrag.anhaenge || []).concat(anhaenge);
      aktualisiere();
      aktualisiereAnhangBereich(id);
    });
  }, dateiFehler);
}

/* Ausgewählte Dateien für das Formular oben (noch nicht gespeichert). */
function wartendBereichHtml(kontext) {
  return '<div class="wartend-liste" data-wartend-liste="' + kontext + '">' + wartendHtml(kontext) + "</div>" +
    '<label class="knopf knopf-zweit datei-knopf">+ Foto oder Datei<input type="file" multiple class="versteckt" data-datei="wartend" data-kontext="' + kontext + '"></label>' +
    '<button type="button" class="knopf knopf-zweit datei-knopf" data-aktion="archiv-auf" data-kontext="' + kontext + '">Aus Archiv</button>' +
    (kontext === "notiz" ? '<button type="button" class="knopf knopf-zweit datei-knopf" data-aktion="zeichnen-auf">Skizze</button>' : "");
}

function wartendHtml(kontext) {
  return wartend[kontext].map(function (d, i) {
    return '<span class="anhang-chip">' + esc(d.name) +
      '<button type="button" class="klein" data-aktion="wartend-entfernen" data-kontext="' + kontext + '" data-index="' + i + '" aria-label="Entfernen">✕</button></span>';
  }).join("");
}

function aktualisiereWartend(kontext) {
  var b = document.querySelector('[data-wartend-liste="' + kontext + '"]');
  if (b) b.innerHTML = wartendHtml(kontext);
}

function wartendHinzufuegen(kontext, dateiListe) {
  var neu = Array.from(dateiListe);
  if (!neu.length) return;
  Promise.all(neu.map(function (f) {
    return verkleinereBild(f).then(function (b) { return { name: f.name, blob: b }; });
  })).then(function (liste) {
    wartend[kontext] = wartend[kontext].concat(liste);
    aktualisiereWartend(kontext);
  }, dateiFehler);
}

/* Kurzer Hinweis unten mit „Rückgängig“. Verschwindet nach fünf Sekunden. */
var rueckgaengigTimer = null;
function zeigeRueckgaengig(text, zurueck) {
  var alt = document.getElementById("toast");
  if (alt) alt.remove();
  clearTimeout(rueckgaengigTimer);
  var t = document.createElement("div");
  t.id = "toast";
  t.className = "toast";
  t.setAttribute("role", "status");
  t.innerHTML = '<span>' + esc(text) + '</span><button type="button" class="klein" data-toast="rueckgaengig">Rückgängig</button>';
  t.querySelector("[data-toast]").addEventListener("click", function () {
    t.remove();
    clearTimeout(rueckgaengigTimer);
    zurueck();
  });
  document.body.appendChild(t);
  rueckgaengigTimer = setTimeout(function () { t.remove(); }, 5000);
}

/* Mischt eine Farbe mit Weiß (anteil 0 bis 1): ergibt die helle Deckfarbe des Markers. */
function heller(hex, anteil) {
  var n = parseInt(hex.slice(1), 16);
  var kanal = function (x) { return Math.round(x + (255 - x) * anteil); };
  return "rgb(" + kanal(n >> 16) + "," + kanal((n >> 8) & 255) + "," + kanal(n & 255) + ")";
}

/* Skizze: einfache Zeichenfläche im Notizen-Formular. Das Ergebnis wird als Bild an die Notiz gehängt. */
var ZEICHEN_FARBEN = ["#1c1c1e", "#ff5a36", "#2f8f5b", "#2d6cdf", "#8a4fd6", "#f2c12e"];
var ZEICHEN_BREITEN = [{ name: "fein", px: 2 }, { name: "mittel", px: 6 }, { name: "dick", px: 14 }];
var zeichnung = { werkzeug: "stift", farbe: ZEICHEN_FARBEN[0], breite: 6, verlauf: [] };

function oeffneZeichnen() {
  zeichnung = { werkzeug: "stift", farbe: ZEICHEN_FARBEN[0], breite: 6, verlauf: [] };
  var werkzeuge = [["stift", "Stift"], ["marker", "Marker"], ["radierer", "Radierer"]].map(function (w) {
    return '<button type="button" class="chip" data-aktion="zeichen-werkzeug" data-wert="' + w[0] + '" aria-pressed="' + (w[0] === "stift") + '">' + w[1] + "</button>";
  }).join("");
  var farben = ZEICHEN_FARBEN.map(function (f, i) {
    return '<button type="button" class="farbe" data-aktion="zeichen-farbe" data-wert="' + f + '" style="background:' + f + '" aria-label="Farbe ' + (i + 1) + '" aria-pressed="' + (i === 0) + '"></button>';
  }).join("");
  var breiten = ZEICHEN_BREITEN.map(function (b, i) {
    return '<button type="button" class="chip" data-aktion="zeichen-breite" data-wert="' + i + '" aria-pressed="' + (b.px === zeichnung.breite) + '">' + b.name + "</button>";
  }).join("");
  oeffneSheet("Skizze",
    '<div class="zeichen-leiste">' + werkzeuge + '</div>' +
    '<div class="zeichen-leiste"><span class="zeichen-farben">' + farben + "</span></div>" +
    '<div class="zeichen-leiste">' + breiten + "</div>" +
    '<canvas class="zeichen-flaeche" width="800" height="1000" aria-label="Zeichenfläche"></canvas>' +
    '<div class="formular-knoepfe">' +
      '<button type="button" class="klein" data-aktion="zeichen-zurueck">Rückgängig</button>' +
      '<button type="button" class="klein" data-aktion="zeichen-leeren">Leeren</button>' +
      '<span class="spacer"></span>' +
      '<button type="button" class="knopf" data-aktion="zeichen-uebernehmen">In Notiz übernehmen</button>' +
    "</div>",
    "zeichnen");
  var c = document.querySelector("#sheet .zeichen-flaeche");
  var ctx = c.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, c.width, c.height);
  var letzter = null;
  function punkt(e) {
    var r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * c.width / r.width, y: (e.clientY - r.top) * c.height / r.height };
  }
  function stil() {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = 1;
    ctx.strokeStyle = zeichnung.werkzeug === "radierer" ? "#ffffff" : zeichnung.werkzeug === "marker" ? heller(zeichnung.farbe, 0.6) : zeichnung.farbe;
    ctx.lineWidth = zeichnung.werkzeug === "radierer" ? zeichnung.breite * 3 : zeichnung.werkzeug === "marker" ? zeichnung.breite * 2.5 : zeichnung.breite;
  }
  c.addEventListener("pointerdown", function (e) {
    if (!e.isPrimary) return;          /* nur ein Finger oder der Stift, ein Handballen zeichnet nicht mit */
    if (zeichnung.verlauf.length >= 8) zeichnung.verlauf.shift();
    zeichnung.verlauf.push(ctx.getImageData(0, 0, c.width, c.height));
    letzter = punkt(e);
    c.setPointerCapture(e.pointerId);
    stil();
    ctx.beginPath();
    ctx.moveTo(letzter.x, letzter.y);
    ctx.lineTo(letzter.x + 0.1, letzter.y + 0.1);
    ctx.stroke();
  });
  c.addEventListener("pointermove", function (e) {
    if (!letzter || !e.isPrimary) return;
    var p = punkt(e);
    /* Jedes Teilstück wird deckend gezeichnet. Der Marker ist eine helle Deckfarbe, daher gibt es keine dunklen Gelenke
       und kein Neuzeichnen des ganzen Strichs. */
    stil();
    ctx.beginPath();
    ctx.moveTo(letzter.x, letzter.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    letzter = p;
  });
  ["pointerup", "pointercancel"].forEach(function (ereignis) {
    c.addEventListener(ereignis, function () { letzter = null; });
  });
}

function zeichnungWerkzeuge(attr, wert) {
  document.querySelectorAll('#sheet [data-aktion="' + attr + '"]').forEach(function (b) {
    b.setAttribute("aria-pressed", b.getAttribute("data-wert") === wert);
  });
}

/* Ist die Zeichenfläche komplett weiß? Dann gilt die Skizze als leer. */
function skizzeLeer(c) {
  var d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
  for (var i = 0; i < d.length; i += 4) {
    /* Kanten des Radierers sind nicht exakt weiß, daher eine kleine Toleranz */
    if (d[i] < 250 || d[i + 1] < 250 || d[i + 2] < 250) return false;
  }
  return true;
}

function zeichnungUebernehmen() {
  var c = document.querySelector("#sheet .zeichen-flaeche");
  if (!c) return;
  if (skizzeLeer(c)) return alert("Die Skizze ist noch leer.");
  c.toBlob(function (blob) {
    if (!blob) return dateiFehler();
    var jetzt = new Date();
    var zwei = function (n) { return String(n).padStart(2, "0"); };
    var name = "Skizze-" + datumVon(jetzt.getTime()) + "-" + zwei(jetzt.getHours()) + zwei(jetzt.getMinutes()) + ".png";
    /* Skizzen kommen nicht ins Bilderarchiv, nur an die Notiz */
    wartend.notiz.push({ name: name, blob: blob, ausArchiv: true });
    schliesseSheet();
    aktualisiereWartend("notiz");
  }, "image/png");
}

/* Bilderarchiv: alle Bilder, die gesammelt wurden (geteilt oder hochgeladen). Aus dem Archiv werden Kopien an Notizen gehängt. */
function oeffneArchiv(kontext) {
  archivHolen().then(function (liste) {
    var zusatz = kontext ? ' data-kontext="' + kontext + '"' : "";
    var h = '<div class="formular-knoepfe"><label class="knopf knopf-zweit datei-knopf">+ Bild ins Archiv<input type="file" accept="image/*" multiple class="versteckt" data-datei="archiv"' + zusatz + "></label></div>";
    if (!liste.length) {
      h += '<p class="leer">Noch keine Bilder im Archiv. Screenshots, die du aus einer anderen App an Stick to the plan teilst, landen hier.</p>';
    } else {
      h += '<ul class="archiv-raster">' + liste.map(function (s) {
        return '<li class="archiv-kachel"><a class="anhang bild" data-anhang-id="' + esc(s.id) + '" data-name="' + esc(s.name) + '"><img class="anhang-bild" alt="' + esc(s.name) + '"></a>' +
          '<div class="archiv-knoepfe">' +
          (kontext ? '<button type="button" class="klein" data-aktion="archiv-waehlen" data-id="' + esc(s.id) + '" data-kontext="' + kontext + '">Hinzufügen</button>' : "") +
          '<button type="button" class="klein gefahr" data-aktion="archiv-loeschen" data-id="' + esc(s.id) + '"' + zusatz + ">Entfernen</button></div></li>";
      }).join("") + "</ul>";
    }
    oeffneSheet(kontext ? "Bild aus dem Archiv" : "Bilderarchiv", h, "archiv");
  }).catch(dateiFehler);
}

/* Ein Bild aus dem Archiv löschen. Es verschwindet auch aus allen Notizen und Doings, die es verwenden. */
function archivBildEntfernen(id, kontext) {
  var nutzer = [];
  daten.projekte.forEach(function (p) {
    p.doings.concat(p.notizen).forEach(function (x) {
      if ((x.anhaenge || []).some(function (a) { return a.id === id; })) nutzer.push(x);
    });
  });
  var hinweis = nutzer.length ? "\n\nEs wird auch aus " + nutzer.length + " Notiz(en) oder Doing(s) entfernt, die es verwenden." : "";
  if (!confirm("Dieses Bild aus dem Archiv löschen?" + hinweis)) return;
  nutzer.forEach(function (x) {
    x.anhaenge = x.anhaenge.filter(function (a) { return a.id !== id; });
  });
  dateienLoeschen([id]).then(function () {
    if (nutzer.length) aktualisiere();
    oeffneArchiv(kontext);
  }, dateiFehler);
}

/* Bilder ins Archiv hochladen (ohne Notiz). Verkleinerte Kopien, wie bei Notizen. */
function archivHinzufuegen(dateiListe, kontext) {
  var neu = Array.from(dateiListe);
  if (!neu.length) return;
  Promise.all(neu.map(function (f) {
    return verkleinereBild(f).then(function (b) { return dateiSpeichern(b, f.name, true); });
  })).then(function () {
    oeffneArchiv(kontext || null);
  }, dateiFehler);
}

/* Speichert die Dateien und ruft dann auf. Verhindert doppeltes Absenden. */
function mitDateien(liste, dann) {
  if (speichertGerade) return alert("Bitte warte kurz, bis die letzten Dateien gespeichert sind.");
  speichertGerade = true;
  var geschrieben = [];   /* Kennungen aller Kopien dieses Vorgangs, damit bei Fehler nichts übrig bleibt */
  /* Jedes Bild liegt nur einmal, im Bilderarchiv. Notizen und Doings verweisen darauf.
     Skizzen (ausArchiv) bleiben an der Notiz. Bilder aus dem Archiv (vorhanden) werden nur verwiesen. */
  Promise.all(liste.map(function (d) {
    if (d.vorhanden) return Promise.resolve({ id: d.id, name: d.name, typ: d.typ, groesse: d.groesse, archiv: true });
    var blob = d.blob || d;
    var archiv = /^image\//.test(blob.type) && !d.ausArchiv;
    return dateiSpeichern(blob, d.name, archiv).then(function (m) {
      geschrieben.push(m.id);
      return m;
    });
  }))
    .then(dann, function () {
      dateienLoeschen(geschrieben).catch(function () {});
      dateiFehler();
    })
    .then(function () { speichertGerade = false; }, function () { speichertGerade = false; });
}

/* ---------- Ansicht Doings ---------- */

function doingHtml(d) {
  var offen = !ui.eingeklappt[d.id];
  return '<li class="doing' + (d.erledigt ? " fertig" : "") + (offen ? "" : " eingeklappt") + '" data-lang="doing" data-id="' + esc(d.id) + '">' +
    '<button type="button" class="haken" data-aktion="doing-haken" data-id="' + esc(d.id) + '" aria-pressed="' + !!d.erledigt + '" aria-label="' +
      (d.erledigt ? "Wieder öffnen: " : "Erledigt: ") + esc(d.text) + '">' + (d.erledigt ? ICON.check : "") + "</button>" +
    '<div class="doing-mitte">' +
      '<button type="button" class="doing-text" data-aktion="doing-bearbeiten" data-id="' + esc(d.id) + '">' +
        "<span>" + esc(d.text) + "</span>" +
        (d.faellig ? '<small class="faellig' + (!d.erledigt && d.faellig < heuteIso() ? " ueberfaellig" : "") + '">' + ICON.kalender + "fällig " + esc(datumText(d.faellig)) + "</small>" : "") +
        (offen && d.notiz ? "<small>" + esc(d.notiz) + "</small>" : "") +
        (offen && d.prompt ? '<em class="marke">Promt</em>' : "") +
      "</button>" +
      (offen ? anhangHtml(d.anhaenge) : "") +
    "</div>" +
    '<button type="button" class="falt" data-aktion="falten" data-id="' + esc(d.id) + '" aria-expanded="' + offen + '" aria-label="' + (offen ? "Einklappen" : "Ausklappen") + '">' + ICON.chev + "</button>" +
  "</li>";
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
    '<div class="promt-auswahl" hidden>' + promtAuswahlHtml("prompt") + "</div>" +
    wartendBereichHtml("doing") + "</form>";
  h += '<div class="werkzeug">' +
    '<button type="button" class="chip" data-aktion="nur-offene" aria-pressed="' + ui.nurOffene + '">Erledigte ausblenden</button></div>';

  var liste = pr.doings.filter(function (d) { return !(ui.nurOffene && d.erledigt); });
  if (!pr.doings.length) h += '<p class="leer">Noch nichts zu tun. Neues Doing oben eintragen.</p>';
  else if (!liste.length) h += '<p class="leer">Alles erledigt.</p>';
  /* Erledigte wandern nach unten; innerhalb jeder Gruppe bleibt die Reihenfolge */
  else h += '<ul class="doings">' + liste.filter(function (d) { return !d.erledigt; })
    .concat(liste.filter(function (d) { return d.erledigt; })).map(doingHtml).join("") + "</ul>";

  return h + "</div></section>";
}

function doingFormular(d) {
  return '<form class="formular" data-form="doing-speichern" data-id="' + esc(d.id) + '">' +
    '<label>Doing<input name="text" maxlength="200" required value="' + esc(d.text) + '"></label>' +
    '<label>Fällig am<input name="faellig" type="date" value="' + esc(d.faellig) + '"></label>' +
    '<label>Notiz<textarea name="notiz" rows="2" maxlength="500">' + esc(d.notiz) + "</textarea></label>" +
    '<label>Promt (zum Kopieren)<textarea name="prompt" rows="5" maxlength="4000">' + esc(d.prompt) + "</textarea></label>" +
    '<button type="button" class="klein" data-aktion="promt-liste-auf">Promt einfügen</button>' +
    '<div class="promt-auswahl" hidden>' + promtAuswahlHtml("prompt") + "</div>" +
    anhangBereichHtml("doing", d) +
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

function speichereNeuesDoing(f) {
  var text = feld(f, "text").trim();
  if (!text) return;
  var prompt = feld(f, "prompt").trim();
  var faellig = gueltigesDatum(feld(f, "faellig")) ? feld(f, "faellig") : "";
  mitDateien(wartend.doing.slice(), function (anhaenge) {
    wartend.doing = [];
    var jetzt = Date.now();
    P().doings.push({ id: neueId(), text: text, notiz: "", prompt: prompt, faellig: faellig, anhaenge: anhaenge, erledigt: false, erstellt: jetzt, ordnung: jetzt });
    aktualisiere();
    var eingabe = document.querySelector('[data-form="doing-neu"] input[name="text"]');
    if (eingabe) eingabe.focus();
  });
}

function speichereDoing(f) {
  var d = findeDoing(f.getAttribute("data-id"));
  var text = feld(f, "text").trim();
  if (!d || !text) return;
  d.text = text;
  d.notiz = feld(f, "notiz").trim();
  d.prompt = feld(f, "prompt").trim();
  d.faellig = gueltigesDatum(feld(f, "faellig")) ? feld(f, "faellig") : "";
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
  h += '<div class="werkzeug"><button type="button" class="chip" data-aktion="zeit-form" aria-pressed="' + zeitFormOffen + '">+ Eintrag</button></div>';
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
  var art = e.typ === "doing" ? "Doing" : "Meilenstein";
  var text = e.typ === "doing" ? e.obj.text : e.obj.titel;
  var klasse = "ze " + (e.typ === "doing" ? "doing-ze" : "meilenstein-ze") + (e.obj.erledigt ? " fertig" : "");
  var knopf = e.typ === "doing" ? "doing-bearbeiten" : "meilenstein-bearbeiten";
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
    P().doings.push({ id: neueId(), text: titel, notiz: "", prompt: "", faellig: datum, anhaenge: [], erledigt: false, erstellt: jetzt, ordnung: jetzt });
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

function notizenSeiteHtml() {
  var pr = P();
  var h = '<section class="karte notiz-eingabe">' +
    '<button type="button" class="abschnitt-kopf" data-aktion="notiz-form-auf" aria-expanded="' + ui.notizFormOffen + '" aria-controls="notiz-form-body">' +
      '<span class="kopf-text"><h2>Neue Notiz</h2><small>Text, Link oder Foto</small></span>' + ICON.chev + "</button>" +
    '<div class="abschnitt-body" id="notiz-form-body"' + (ui.notizFormOffen ? "" : " hidden") + ">" +
    '<form class="notiz-form" data-form="notiz-neu" autocomplete="off">' +
      '<textarea name="text" rows="3" maxlength="2000" placeholder="Gedanke, Liedtitel, Idee …" aria-label="Notiz"></textarea>' +
      '<input name="link" type="text" maxlength="500" inputmode="url" placeholder="Link (Spotify, YouTube …), optional" aria-label="Link">' +
      wartendBereichHtml("notiz") +
      '<p class="fehler" data-fehler hidden></p>' +
      '<div class="formular-knoepfe"><span class="spacer"></span><button type="submit" class="knopf">Speichern</button></div>' +
    "</form></div></section>";


  if (!pr.notizen.length) return h + '<p class="leer">Noch keine Notizen. Gedanken, Lieder, Links und Fotos landen hier.</p>';
  return h + '<ul class="notiz-liste">' + pr.notizen.map(notizKarte).join("") + "</ul>";
}

function notizKarte(n) {
  var offen = !ui.eingeklappt[n.id];
  var kurz = n.text || n.link || (n.anhaenge && n.anhaenge.length ? n.anhaenge[0].name : "Notiz");
  var h = '<li class="notiz-karte' + (offen ? "" : " eingeklappt") + '" data-lang="notiz" data-id="' + esc(n.id) + '">' +
    '<div class="karte-kopf"><div class="karte-text">' +
      (offen ? (n.text ? "<p>" + esc(n.text) + "</p>" : "") : '<p class="kurz">' + esc(kurz) + "</p>") +
    "</div>" +
    '<button type="button" class="falt" data-aktion="falten" data-id="' + esc(n.id) + '" aria-expanded="' + offen + '" aria-label="' + (offen ? "Einklappen" : "Ausklappen") + '">' + ICON.chev + "</button></div>";
  if (offen) {
    h += anhangHtml(n.anhaenge);
    h += '<div class="notiz-fuss">';
    if (n.link) {
      var art = linkArt(n.link);
      h += '<a class="linkmarke ' + art.toLowerCase() + '" href="' + esc(n.link) + '" target="_blank" rel="noopener noreferrer" title="' + esc(n.link) + '">' + esc(art) + " ↗</a>";
    }
    h += '<span class="spacer"></span>' +
      '<button type="button" class="klein" data-aktion="notiz-bearbeiten" data-id="' + esc(n.id) + '">Bearbeiten</button>' +
      "</div>";
  }
  return h + "</li>";
}

function notizFormular(n) {
  return '<form class="formular" data-form="notiz-speichern" data-id="' + esc(n.id) + '">' +
    '<label>Notiz<textarea name="text" rows="4" maxlength="2000">' + esc(n.text) + "</textarea></label>" +
    '<label>Link<input name="link" type="text" maxlength="500" inputmode="url" value="' + esc(n.link) + '"></label>' +
    anhangBereichHtml("notiz", n) +
    '<p class="fehler" data-fehler hidden></p>' +
    '<div class="formular-knoepfe">' +
      '<button type="button" class="klein gefahr" data-aktion="notiz-loeschen" data-id="' + esc(n.id) + '">Löschen</button>' +
      '<span class="spacer"></span><button type="submit" class="knopf">Speichern</button>' +
    "</div></form>";
}

/* Neue Notiz aus dem Formular oben (auch nur mit Foto möglich). */
function speichereNeueNotiz(f) {
  var text = feld(f, "text").trim();
  var eingabe = feld(f, "link").trim();
  var link = sichererLink(eingabe);
  if (eingabe && !link) return zeigeFehler(f, "Das ist kein gültiger Link.");
  var dateien = wartend.notiz.slice();
  if (!text && !link && !dateien.length) return zeigeFehler(f, "Bitte Text, einen Link oder eine Datei angeben.");
  mitDateien(dateien, function (anhaenge) {
    wartend.notiz = [];
    var jetzt = Date.now();
    P().notizen.unshift({ id: neueId(), text: text, link: link, anhaenge: anhaenge, erstellt: jetzt, ordnung: jetzt });
    aktualisiere();
  });
}

function speichereNotiz(f) {
  var n = findeNotiz(f.getAttribute("data-id"));
  if (!n) return;
  var text = feld(f, "text").trim();
  var eingabe = feld(f, "link").trim();
  var link = sichererLink(eingabe);
  if (eingabe && !link) return zeigeFehler(f, "Das ist kein gültiger Link.");
  if (!text && !link && !n.anhaenge.length) return zeigeFehler(f, "Bitte Text, einen Link oder eine Datei angeben.");
  n.text = text;
  n.link = link;
  schliesseSheet();
  aktualisiere();
}

/* ---------- Langdruck-Menü und Teilen ---------- */

/* Langdruck auf einen Eintrag: Bearbeiten, Teilen, Löschen. */
function oeffneAktionen(art, id) {
  var eintrag = art === "doing" ? findeDoing(id) : findeNotiz(id);
  if (!eintrag) return;
  var titel = (eintrag.text || eintrag.link || "Eintrag").slice(0, 60);
  oeffneSheet(titel,
    '<div class="aktion-liste">' +
      '<button type="button" data-aktion="' + art + '-bearbeiten" data-id="' + esc(id) + '">' + ICON.stift + "Bearbeiten</button>" +
      '<button type="button" data-aktion="teilen" data-art="' + art + '" data-id="' + esc(id) + '">' + ICON.teilen + "Teilen</button>" +
      '<button type="button" class="gefahr" data-aktion="' + art + '-loeschen" data-id="' + esc(id) + '">' + ICON.muell + "Löschen</button>" +
    "</div>",
    "aktion");
}

/* Teilt Text und Dateien über das System. Ohne Teilen-Funktion wird der Text kopiert. */
function teileEintrag(art, id, knopf) {
  var eintrag = art === "doing" ? findeDoing(id) : findeNotiz(id);
  if (!eintrag) return;
  var zeilen = art === "doing"
    ? [eintrag.text, eintrag.faellig ? "fällig " + datumText(eintrag.faellig) : "", eintrag.notiz, eintrag.prompt]
    : [eintrag.text, eintrag.link];
  var text = zeilen.filter(Boolean).join("\n\n");
  schliesseSheet();
  Promise.all((eintrag.anhaenge || []).map(function (a) {
    return dateiHolen(a.id).then(function (satz) {
      return satz ? new File([satz.blob], a.name, { type: a.typ }) : null;
    });
  })).then(function (dateien) {
    dateien = dateien.filter(Boolean);
    if (!navigator.share) return kopiere(text, knopf);
    var sende = { title: "Stick to the plan", text: text };
    if (dateien.length && navigator.canShare && navigator.canShare({ files: dateien })) sende.files = dateien;
    return navigator.share(sende).catch(function (fehler) {
      if (!fehler || fehler.name !== "AbortError") kopiere(text, knopf);
    });
  }).catch(function () {
    alert("Teilen hat nicht geklappt.");
  });
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
  return '<p class="hinweis">Deine Daten liegen nur auf diesem Gerät. Sichere sie ab und zu als Datei, bevor du den Browser-Speicher leerst. Die Sicherung enthält auch Fotos und Dateien und kann daher groß werden.</p>' +
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

function blobZuDatenUrl(blob) {
  return new Promise(function (ok, nein) {
    var leser = new FileReader();
    leser.onload = function () { ok(leser.result); };
    leser.onerror = function () { nein(leser.error); };
    leser.readAsDataURL(blob);
  });
}

/* Die Sicherung enthält die Daten und alle Dateien (als Datenadresse). */
function exportiere() {
  dateienAlle().then(function (alle) {
    /* Base64 macht die Datei rund ein Drittel größer. Ab einer großen Menge vorher fragen. */
    var mb = Math.round(alle.reduce(function (summe, s) { return summe + (s.groesse || 0); }, 0) / 1e6);
    if (mb > 150 && !confirm("Die Sicherung wird rund " + Math.round(mb * 1.4) + " MB groß. Das kann auf dem Handy lange dauern oder fehlschlagen. Trotzdem sichern?")) return null;
    /* Dateien nacheinander lesen, damit nicht alle gleichzeitig im Speicher liegen */
    var teile = [];
    return alle.reduce(function (kette, satz) {
      return kette.then(function () {
        return blobZuDatenUrl(satz.blob).then(function (url) {
          teile.push({ id: satz.id, name: satz.name, typ: satz.typ, groesse: satz.groesse, archiv: !!satz.archiv, erstellt: satz.erstellt || 0, daten: url });
        });
      });
    }, Promise.resolve()).then(function () { return teile; });
  }).then(function (dateien) {
    if (!dateien) return;
    var sicherung = { fassung: daten.fassung, projekte: daten.projekte, dateien: dateien };
    var blob = new Blob([JSON.stringify(sicherung)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "stick-to-the-plan-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }).catch(function () {
    alert("Die Sicherung konnte nicht erstellt werden.");
  });
}

function importiere(datei) {
  var leser = new FileReader();
  leser.onload = function () {
    var roh = null;
    var neu = null;
    try {
      roh = JSON.parse(leser.result);
      neu = saeubereDaten(roh);
    } catch (e) {
      neu = null;
    }
    if (!neu) {
      var p = document.querySelector("#sheet [data-fehler]");
      if (p) { p.textContent = "Diese Datei passt nicht zu Stick to the plan."; p.hidden = false; }
      return;
    }
    if (!confirm("Alle aktuellen Projekte und Dateien durch den Inhalt dieser Datei ersetzen?")) return;

    /* Nur wenn die Sicherung Dateien mitbringt, werden die vorhandenen ersetzt. Sonst blieben Fotos ungetroffen. */
    var roheDateien = Array.isArray(roh.dateien) ? roh.dateien : null;
    var dateienFertig = roheDateien
      ? Promise.all(roheDateien.filter(function (d) {
          /* Nur eingebettete Daten (data:), keine Adressen aus dem Netz */
          return d && typeof d.id === "string" && typeof d.daten === "string" && /^data:/i.test(d.daten);
        }).map(function (d) {
          return fetch(d.daten).then(function (antwort) { return antwort.blob(); }).then(function (blob) {
            return { id: d.id, name: String(d.name || "Datei"), typ: String(d.typ || blob.type), groesse: blob.size, archiv: !!d.archiv, erstellt: Number(d.erstellt) || Date.now(), blob: blob };
          });
        })).then(dateienErsetzen)
      : Promise.resolve();
    dateienFertig.then(function () {
      /* Vorschaubilder des alten Standes verwerfen, sonst zeigen gleiche Kennungen das alte Bild */
      Object.keys(vorschauUrls).forEach(function (k) { URL.revokeObjectURL(vorschauUrls[k]); });
      vorschauUrls = {};
      daten = neu;
      ui.aktivesProjekt = "";
      speichereUi();
      schliesseSheet();
      aktualisiere();
    }, function () {
      alert("Die Dateien aus der Sicherung konnten nicht übernommen werden. Bisherige Daten bleiben erhalten.");
    });
  };
  leser.readAsText(datei);
}

/* Geteilte Inhalte (siehe sw.js) bleiben gespeichert, bis man sie einem Projekt zuordnet oder verwirft.
   Beim Start fragt ein Fenster, wohin die Notiz soll. */
var geteilteSchlange = [];

function uebernehmeGeteilte() {
  var suche = location.search;
  if (/[?&]geteilt=/.test(suche)) history.replaceState(null, "", location.pathname);
  if (/geteilt=fehler/.test(suche)) alert("Das Geteilte konnte nicht gespeichert werden.");
  geteilteHolen().then(function (liste) {
    geteilteSchlange = liste.filter(function (t) {
      return t.text || t.titel || t.link || (t.anhaenge && t.anhaenge.length);
    });
    zeigeGeteilte();
  }).catch(function () {
    alert("Das Geteilte konnte nicht geladen werden.");
  });
}

function zeigeGeteilte() {
  if (!geteilteSchlange.length) return;
  var t = geteilteSchlange[0];
  var titel = (t.titel || t.text || t.link || (t.anhaenge[0] ? t.anhaenge[0].name : "Geteiltes")).slice(0, 60);
  /* Das aktuelle Projekt steht oben */
  var projekte = daten.projekte.slice().sort(function (a, b) {
    return (a.id === P().id ? -1 : 0) - (b.id === P().id ? -1 : 0);
  });
  var h = '<p class="hinweis">Wohin soll diese Notiz?</p>' +
    anhangHtml(t.anhaenge) +
    '<div class="aktion-liste">' +
    projekte.map(function (p) {
      return '<button type="button" data-aktion="geteilt-zuordnen" data-id="' + esc(p.id) + '">' + esc(p.name) + "</button>";
    }).join("") +
    '<button type="button" class="gefahr" data-aktion="geteilt-verwerfen">Verwerfen</button></div>';
  oeffneSheet(titel, h, "geteilt");
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
  ladeAnhaenge(s);
  fensterStart = art === "formular" ? fensterWerte(s) : "";
}

function schliesseSheet() {
  var s = document.getElementById("sheet");
  s.hidden = true;
  s.innerHTML = "";
  offenerSheet = null;
  zeichnung.verlauf = [];   /* Rückgängig-Schritte der Skizze freigeben */
  document.body.style.overflow = "";
}

/* Fragt nach, wenn in einem Bearbeiten-Fenster Text geändert, aber nicht gespeichert wurde.
   Gilt nur für Tipps neben das Fenster, Schließen-Knopf und Escape. */
function fensterWerte(s) {
  return Array.prototype.map.call(s.querySelectorAll("input:not([type=file]):not([type=hidden]), textarea, select"), function (el) {
    return el.name + "=" + el.value;
  }).join("\n");
}

var fensterStart = "";

function schliesseSheetNachFrage() {
  var s = document.getElementById("sheet");
  if (offenerSheet === "formular" && fensterWerte(s) !== fensterStart && !confirm("Änderungen verwerfen?")) return;
  var zc = s.querySelector(".zeichen-flaeche");
  if (offenerSheet === "zeichnen" && zc && !skizzeLeer(zc) && !confirm("Skizze verwerfen?")) return;
  schliesseSheet();
}

/* ---------- Zeichnen ---------- */

/* Gerade getippte Texte in den Formularen bleiben beim Neuzeichnen erhalten (z. B. beim Einklappen). */
function merkeEingaben() {
  var werte = [];
  document.querySelectorAll("#app [data-form] [name]").forEach(function (el) {
    if (el.type === "hidden" || el.type === "file") return;
    werte.push({ form: el.closest("[data-form]").getAttribute("data-form"), name: el.name, wert: el.value });
  });
  return werte;
}

function stelleEingabenHer(werte) {
  werte.forEach(function (w) {
    var el = document.querySelector('#app [data-form="' + w.form + '"] [name="' + w.name + '"]');
    if (el && w.wert) el.value = w.wert;
  });
}

function zeichne(eingabenMerken) {
  var ans = ui.ansicht;
  var merk = eingabenMerken === false ? null : merkeEingaben();
  document.getElementById("projekte-leiste").innerHTML = projektLeisteHtml();
  document.getElementById("kopf-titel").textContent = ANSICHT_TITEL[ans][0];
  document.getElementById("kopf-unter").textContent = ANSICHT_TITEL[ans][1];
  document.getElementById("btn-zurueck").hidden = ans === "notizen";
  document.getElementById("app").innerHTML = ans === "doings" ? doingsHtml() : ans === "notizen" ? notizenSeiteHtml() : zeitSeiteHtml();
  if (merk) stelleEingabenHer(merk);
  ladeAnhaenge(document.getElementById("app"));
  document.querySelectorAll('[data-aktion="ansicht"]').forEach(function (b) {
    var aktiv = b.getAttribute("data-wert") === ans;
    b.classList.toggle("aktiv", aktiv);
    if (aktiv) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
}

/* ---------- Wischen und Langdruck ---------- */

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

/* Langdruck: auf den Strahl der Zeitleiste (Zieldatum), auf Doings und Notizen (Menü), auf Projekte (löschen).
   Eingaben, Häkchen, Klappknöpfe und Anhänge reagieren nicht darauf. */
document.addEventListener("pointerdown", function (e) {
  /* Jedes neue Drücken beginnt ohne Langdruck-Sperre. Sonst bliebe sie hängen, wenn das Loslassen
     auf einem inzwischen entfernten Element landet (z. B. nach dem Löschen eines Projekts). */
  langdruckAusgeloest = false;
  var t = e.target;
  if (t.closest("input, textarea, select, .haken, .falt, .anhang")) return;
  var ausfuehren = null;
  if (ui.ansicht === "zeit" && t.closest("[data-langdruck]") && !t.closest("button")) {
    ausfuehren = function () { oeffneSheet("Zieldatum", zielDatumHtml(), "formular"); };
  } else {
    var el = t.closest("[data-lang]");
    if (!el) return;
    var art = el.getAttribute("data-lang");
    var id = el.getAttribute("data-id");
    ausfuehren = function () {
      if (art === "projekt") oeffneProjektMenue(id);
      else oeffneAktionen(art, id);
    };
  }
  clearTimeout(langdruck);
  langdruck = setTimeout(function () {
    langdruck = null;
    langdruckAusgeloest = true;
    if (navigator.vibrate) navigator.vibrate(20);
    ausfuehren();
  }, LANGDRUCK_MS);
});

["pointerup", "pointercancel"].forEach(function (ereignis) {
  document.addEventListener(ereignis, function () {
    clearTimeout(langdruck);
    langdruck = null;
    if (langdruckAusgeloest) setTimeout(function () { langdruckAusgeloest = false; }, 350);
  });
});

/* Auf dem Handy öffnet langes Drücken sonst das Kontextmenü des Systems. */
document.addEventListener("contextmenu", function (e) {
  if (e.target.closest && e.target.closest("[data-lang], [data-langdruck]")) e.preventDefault();
});

/* ---------- Klicks, Absenden, Dateiwahl, Tastatur ---------- */

document.addEventListener("click", function (e) {
  /* Der Tipp, der auf einen Langdruck folgt, öffnet nichts. */
  if (langdruckAusgeloest) {
    e.preventDefault();
    return;
  }
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
    case "projekt-nach-vorn":
      projektNachVorn(id);
      break;
    case "projekt-verschieben":
      projektVerschieben(id, Number(el.getAttribute("data-richtung")));
      break;
    case "projekt-teilen":
      teileProjekt(id);
      break;
    case "projekt-umbenennen":
      oeffneSheet("Projekt bearbeiten", projektFormular(findeProjekt(id)), "formular");
      break;
    case "projekt-loeschen":
      projektLoeschenAbfrage(id);
      break;
    case "zeit-form":
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
      var auswahl = el.closest("form").querySelector(".promt-auswahl");
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
    case "notiz-form-auf":
      ui.notizFormOffen = !ui.notizFormOffen;
      speichereUi();
      zeichne();
      break;
    case "falten":
      ui.eingeklappt[id] = !ui.eingeklappt[id];
      speichereUi();
      zeichne();
      break;
    case "doing-haken": {
      var d = findeDoing(id);
      if (d) {
        d.erledigt = !d.erledigt;
        aktualisiere();
        /* Abhaken ist schnell passiert: kurz anbieten, es rückgängig zu machen */
        zeigeRueckgaengig(d.erledigt ? "Erledigt: " + d.text : "Wieder offen: " + d.text, function () {
          var zurueck = findeDoing(id);
          if (zurueck) {
            zurueck.erledigt = !zurueck.erledigt;
            aktualisiere();
          }
        });
      }
      break;
    }
    case "doing-bearbeiten":
      oeffneSheet("Doing bearbeiten", doingFormular(findeDoing(id)), "formular");
      break;
    case "doing-loeschen":
      if (confirm("Dieses Doing löschen?")) {
        var geloescht = findeDoing(id);
        if (geloescht) dateienLoeschen(anhangIds(geloescht)).catch(function () {});
        P().doings = P().doings.filter(function (x) { return x.id !== id; });
        schliesseSheet();
        aktualisiere();
      }
      break;
    case "text-kopieren":
      kopiere(feld(el.closest("form"), el.getAttribute("data-feld")), el);
      break;
    case "notiz-bearbeiten": {
      var n = findeNotiz(id);
      if (n) oeffneSheet("Notiz bearbeiten", notizFormular(n), "formular");
      break;
    }
    case "notiz-loeschen":
      if (confirm("Diese Notiz löschen?")) {
        var entfernt = findeNotiz(id);
        if (entfernt) dateienLoeschen(anhangIds(entfernt)).catch(function () {});
        P().notizen = P().notizen.filter(function (x) { return x.id !== id; });
        schliesseSheet();
        aktualisiere();
      }
      break;
    case "teilen":
      teileEintrag(el.getAttribute("data-art"), id, el);
      break;
    case "geteilt-zuordnen": {
      var zielProjekt = findeProjekt(id);
      var geteilt = geteilteSchlange.shift();
      if (!zielProjekt || !geteilt) break;
      var jetztGeteilt = Date.now();
      zielProjekt.notizen.unshift({
        id: neueId(),
        text: [geteilt.titel, geteilt.text].filter(Boolean).join("\n"),
        link: geteilt.link || "",
        anhaenge: geteilt.anhaenge || [],
        erstellt: jetztGeteilt,
        ordnung: jetztGeteilt
      });
      ui.aktivesProjekt = zielProjekt.id;
      ui.ansicht = "notizen";
      speichereUi();
      geteilteLoeschen([geteilt.id]).catch(function () {});
      schliesseSheet();
      aktualisiere();
      zeigeGeteilte();
      break;
    }
    case "geteilt-verwerfen": {
      if (!geteilteSchlange.length || !confirm("Dieses Geteilte verwerfen? Die Dateien dazu werden gelöscht.")) break;
      var verworfen = geteilteSchlange.shift();
      dateienLoeschen(anhangIds(verworfen)).catch(function () {});
      geteilteLoeschen([verworfen.id]).catch(function () {});
      schliesseSheet();
      zeigeGeteilte();
      break;
    }
    case "zeichnen-auf":
      oeffneZeichnen();
      break;
    case "zeichen-werkzeug":
      zeichnung.werkzeug = el.getAttribute("data-wert");
      zeichnungWerkzeuge("zeichen-werkzeug", zeichnung.werkzeug);
      break;
    case "zeichen-farbe":
      zeichnung.farbe = el.getAttribute("data-wert");
      zeichnung.werkzeug = "stift";
      zeichnungWerkzeuge("zeichen-werkzeug", "stift");
      zeichnungWerkzeuge("zeichen-farbe", zeichnung.farbe);
      break;
    case "zeichen-breite":
      zeichnung.breite = ZEICHEN_BREITEN[Number(el.getAttribute("data-wert"))].px;
      zeichnungWerkzeuge("zeichen-breite", el.getAttribute("data-wert"));
      break;
    case "zeichen-zurueck": {
      var zc = document.querySelector("#sheet .zeichen-flaeche");
      var vorher = zeichnung.verlauf.pop();
      if (zc && vorher) zc.getContext("2d").putImageData(vorher, 0, 0);
      break;
    }
    case "zeichen-leeren": {
      var lc = document.querySelector("#sheet .zeichen-flaeche");
      if (lc) {
        var lctx = lc.getContext("2d");
        zeichnung.verlauf.push(lctx.getImageData(0, 0, lc.width, lc.height));
        lctx.fillStyle = "#ffffff";
        lctx.fillRect(0, 0, lc.width, lc.height);
      }
      break;
    }
    case "zeichen-uebernehmen":
      zeichnungUebernehmen();
      break;
    case "archiv-auf":
      oeffneArchiv(el.getAttribute("data-kontext") || null);
      break;
    case "archiv-waehlen": {
      var wk = el.getAttribute("data-kontext");
      dateiHolen(id).then(function (satz) {
        if (!satz) return;
        wartend[wk].push({ id: satz.id, name: satz.name, typ: satz.typ, groesse: satz.groesse, vorhanden: true });
        schliesseSheet();
        aktualisiereWartend(wk);
      }).catch(dateiFehler);
      break;
    }
    case "archiv-loeschen":
      archivBildEntfernen(id, el.getAttribute("data-kontext") || null);
      break;
    case "wartend-entfernen": {
      var kontext = el.getAttribute("data-kontext");
      wartend[kontext].splice(Number(el.getAttribute("data-index")), 1);
      aktualisiereWartend(kontext);
      break;
    }
    case "anhang-loeschen": {
      var art = el.getAttribute("data-art");
      var eintrag = art === "doing" ? findeDoing(id) : findeNotiz(id);
      var aid = el.getAttribute("data-anhang");
      if (eintrag && confirm("Diese Datei entfernen?")) {
        var weg = eintrag.anhaenge.find(function (a) { return a.id === aid; });
        eintrag.anhaenge = eintrag.anhaenge.filter(function (a) { return a.id !== aid; });
        /* Bilder aus dem Archiv bleiben im Archiv, nur der Verweis fällt weg */
        if (weg && !weg.archiv) dateienLoeschen([aid]).catch(function () {});
        aktualisiere();
        aktualisiereAnhangBereich(id);
      }
      break;
    }
    case "sheet-zu":
      schliesseSheetNachFrage();
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
  else if (art === "projekt-speichern") speichereProjekt(f);
  else if (art === "meilenstein-speichern") speichereMeilenstein(f);
  else if (art === "notiz-neu") speichereNeueNotiz(f);
  else if (art === "notiz-speichern") speichereNotiz(f);
  else if (art === "zeit-ziel") speichereZeitNeu("doing", f);
});

document.addEventListener("change", function (e) {
  var t = e.target;
  if (!t.getAttribute || !t.files || !t.files.length) return;
  var datei = t.getAttribute("data-datei");
  if (datei === "importieren") {
    importiere(t.files[0]);
  } else if (datei === "wartend") {
    wartendHinzufuegen(t.getAttribute("data-kontext"), t.files);
    t.value = "";
  } else if (datei === "archiv") {
    archivHinzufuegen(t.files, t.getAttribute("data-kontext"));
    t.value = "";
  } else if (datei === "direkt") {
    anhangHinzufuegen(t.getAttribute("data-art"), t.getAttribute("data-id"), t.files);
    t.value = "";
  }
});

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && offenerSheet) schliesseSheetNachFrage();
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
uebernehmeGeteilte();
/* Dauerhaften Speicher anfordern, damit der Browser Fotos und Notizen nicht ohne Rückfrage löscht */
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
if ("serviceWorker" in navigator && /^https?:/.test(location.protocol)) {
  navigator.serviceWorker.register("./sw.js").catch(function () {});
}

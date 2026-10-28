/* Stick to the plan – Datenkern: Speichern, Prüfen, Hilfsfunktionen. Ohne Oberfläche,
   damit der Einheitstest (einheitstest.html) diese Funktionen direkt prüfen kann.
   Alles bleibt im Browser (localStorage, Dateien in IndexedDB). Nichts wird ins Netz geschickt.

   Aufbau: { fassung: 3, projekte: [ { id, name, zeitModus, doings, notizen, meilensteine } ] }
   doings und notizen haben „anhaenge“: Angaben zu Fotos und Dateien (den Inhalt liefert dateien.js).
   zeitModus: "datum" (Zeitleiste mit Datum) oder "generisch" (nur Reihenfolge).
   Ältere Stände werden beim Laden übernommen; Rubriken aus Fassung 2 entfallen. */

var DOINGS_SCHLUESSEL = "doings-daten-v1";
var STANDARD_PROJEKT_NAME = "Mein Projekt";
var DATUM_MUSTER = /^\d{4}-\d{2}-\d{2}$/;

/* Prüft Form und Gültigkeit (z. B. kein 13. Monat). */
function gueltigesDatum(s) {
  if (!DATUM_MUSTER.test(s || "")) return false;
  var d = new Date(s + "T12:00:00");
  return !isNaN(d.getTime()) && datumVon(d.getTime()) === s;
}

function neueId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function leerProjekt(name) {
  return { id: neueId(), name: name, zeitModus: "generisch", doings: [], notizen: [], meilensteine: [] };
}

/* Beim ersten Start: ein leeres Projekt ohne Inhalte. */
function startDaten() {
  return { fassung: 3, projekte: [leerProjekt(STANDARD_PROJEKT_NAME)] };
}

/* Reihenfolge der Zeitleiste. Fehlt sie, zählt der Zeitpunkt der Erstellung. */
function ordnungVon(x) {
  var n = Number(x.ordnung);
  return isFinite(n) && n !== 0 ? n : (Number(x.erstellt) || Date.now());
}

/* Nur saubere Angaben zu Dateien übernehmen. */
function saeubereAnhaenge(roh) {
  return (Array.isArray(roh) ? roh : []).filter(function (a) {
    return a && typeof a.id === "string" && typeof a.name === "string";
  }).map(function (a) {
    return {
      id: a.id,
      name: a.name.slice(0, 200),
      typ: String(a.typ || "application/octet-stream"),
      groesse: Number(a.groesse) || 0,
      archiv: !!a.archiv
    };
  });
}

function saeubereProjekt(roh) {
  if (!roh || typeof roh !== "object" || typeof roh.id !== "string") return null;
  var name = typeof roh.name === "string" && roh.name.trim() !== "" ? roh.name.trim() : STANDARD_PROJEKT_NAME;
  var p = {
    id: roh.id,
    name: name,
    zeitModus: roh.zeitModus === "datum" ? "datum" : "generisch",
    doings: [], notizen: [], meilensteine: []
  };

  p.doings = (Array.isArray(roh.doings) ? roh.doings : []).filter(function (x) {
    return x && typeof x.id === "string" && typeof x.text === "string";
  }).map(function (x) {
    return {
      id: x.id,
      text: x.text,
      notiz: String(x.notiz || ""),
      prompt: String(x.prompt || ""),
      faellig: gueltigesDatum(x.faellig) ? x.faellig : "",
      anhaenge: saeubereAnhaenge(x.anhaenge),
      erledigt: !!x.erledigt,
      erstellt: Number(x.erstellt) || Date.now(),
      ordnung: ordnungVon(x)
    };
  });

  p.notizen = (Array.isArray(roh.notizen) ? roh.notizen : []).filter(function (x) {
    return x && typeof x.id === "string" && typeof x.text === "string";
  }).map(function (x) {
    return {
      id: x.id,
      text: x.text,
      link: sichererLink(String(x.link || "")),
      anhaenge: saeubereAnhaenge(x.anhaenge),
      erstellt: Number(x.erstellt) || Date.now(),
      ordnung: ordnungVon(x)
    };
  });

  p.meilensteine = (Array.isArray(roh.meilensteine) ? roh.meilensteine : []).filter(function (x) {
    return x && typeof x.id === "string" && typeof x.titel === "string" && x.titel.trim() !== "";
  }).map(function (x) {
    return {
      id: x.id,
      titel: x.titel.trim(),
      datum: gueltigesDatum(x.datum) ? x.datum : "",
      erstellt: Number(x.erstellt) || Date.now(),
      ordnung: ordnungVon(x)
    };
  });
  return p;
}

/* Macht aus beliebigem (auch importiertem) JSON einen sauberen Stand oder null. */
function saeubereDaten(roh) {
  if (!roh || typeof roh !== "object") return null;

  var projekte = null;
  if (Array.isArray(roh.projekte)) {
    projekte = roh.projekte.map(saeubereProjekt).filter(function (p) { return p; });
  } else if (Array.isArray(roh.doings) || Array.isArray(roh.notizen)) {
    /* Fassung 1: alles lag auf der obersten Ebene - wird ein Projekt */
    var alt = saeubereProjekt({ id: neueId(), name: STANDARD_PROJEKT_NAME, doings: roh.doings, notizen: roh.notizen });
    projekte = alt ? [alt] : null;
  }
  if (!projekte) return null;
  if (!projekte.length) projekte = [leerProjekt(STANDARD_PROJEKT_NAME)];
  return { fassung: 3, projekte: projekte };
}

/* Liest den Stand aus dem Speicher. Ist er kaputt, bleibt eine Sicherheitskopie erhalten. */
function ladeDaten(speicher) {
  var roh = null;
  try {
    roh = speicher.getItem(DOINGS_SCHLUESSEL);
  } catch (e) {
    return startDaten();
  }
  if (!roh) return startDaten();

  var d = null;
  try {
    d = saeubereDaten(JSON.parse(roh));
  } catch (e) {
    d = null;
  }
  if (d) return d;

  try {
    speicher.setItem(DOINGS_SCHLUESSEL + "-defekt", roh);
  } catch (e) {
    /* Speicher nicht beschreibbar - dann bleibt nur der Start-Stand */
  }
  return startDaten();
}

function speichereDaten(daten, speicher) {
  try {
    speicher.setItem(DOINGS_SCHLUESSEL, JSON.stringify(daten));
    return true;
  } catch (e) {
    return false;
  }
}

/* Nur http(s)-Links sind erlaubt. Ohne Schema wird https:// davor gesetzt. Sonst "". */
function sichererLink(text) {
  var t = String(text || "").trim();
  if (!t) return "";
  if (!/^https?:\/\//i.test(t)) t = "https://" + t;
  try {
    var u = new URL(t);
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    return u.href;
  } catch (e) {
    return "";
  }
}

/* Erkennt Spotify und YouTube am Domainnamen. Alles andere heißt einfach „Link“. */
function linkArt(url) {
  var host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch (e) {
    return "Link";
  }
  if (host === "spotify.com" || host.slice(-12) === ".spotify.com" || host === "spotify.link") return "Spotify";
  if (host === "youtube.com" || host === "youtu.be" || host.slice(-12) === ".youtube.com") return "YouTube";
  return "Link";
}

/* Lokales Datum als JJJJ-MM-TT (ohne UTC-Verschiebung). */
function datumVon(ms) {
  var d = new Date(ms);
  var mm = String(d.getMonth() + 1);
  var tt = String(d.getDate());
  return d.getFullYear() + "-" + (mm.length < 2 ? "0" + mm : mm) + "-" + (tt.length < 2 ? "0" + tt : tt);
}

/* Alle Einträge der Zeitleiste.
   Modus „datum“: nach Datum, ohne Datum ganz hinten. Notizen gehören nicht auf die Zeitleiste.
   Modus „generisch“: nur die Reihenfolge, das Datum spielt keine Rolle. */
function zeitleisteEintraege(projekt) {
  var liste = [];
  projekt.doings.forEach(function (d) {
    liste.push({ typ: "doing", datum: d.faellig || "", ordnung: d.ordnung, obj: d });
  });
  projekt.meilensteine.forEach(function (m) {
    liste.push({ typ: "meilenstein", datum: m.datum, ordnung: m.ordnung, obj: m });
  });

  if (projekt.zeitModus !== "datum") {
    liste.forEach(function (e) { e.datum = ""; });
    return liste.sort(function (a, b) { return a.ordnung - b.ordnung; });
  }
  return liste.sort(function (a, b) {
    if (a.datum !== b.datum) {
      if (a.datum === "") return 1;
      if (b.datum === "") return -1;
      return a.datum < b.datum ? -1 : 1;
    }
    return a.ordnung - b.ordnung;
  });
}

/* Tauscht die Reihenfolge eines Eintrags mit dem Nachbarn (richtung: -1 oben, +1 unten). */
function zeitSchiebe(projekt, id, richtung) {
  var liste = zeitleisteEintraege(projekt);
  var i = liste.findIndex(function (e) { return e.obj.id === id; });
  var j = i + richtung;
  if (i < 0 || j < 0 || j >= liste.length) return false;
  var a = liste[i].obj;
  var b = liste[j].obj;
  var tmp = a.ordnung;
  a.ordnung = b.ordnung;
  b.ordnung = tmp;
  return true;
}

/* Kennungen der Dateien an einem Doing oder einer Notiz, die beim Löschen mit weg sollen.
   Bilder aus dem Bilderarchiv bleiben erhalten, auch wenn die Notiz gelöscht wird. */
function anhangIds(eintrag) {
  return (eintrag.anhaenge || []).filter(function (a) { return !a.archiv; }).map(function (a) { return a.id; });
}

/* Kennungen aller Dateien eines Projekts (für das Löschen). */
function anhangIdsVon(projekt) {
  var ids = [];
  projekt.doings.concat(projekt.notizen).forEach(function (x) {
    ids = ids.concat(anhangIds(x));
  });
  return ids;
}

/* Kennungen aller Dateien in allen Projekten (für die Sicherung). */
function alleAnhangIds(stand) {
  var ids = [];
  stand.projekte.forEach(function (p) { ids = ids.concat(anhangIdsVon(p)); });
  return ids;
}

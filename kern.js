/* Stick to the plan – Datenkern: Speichern, Prüfen, Hilfsfunktionen. Ohne Oberfläche,
   damit der Einheitstest (einheitstest.html) diese Funktionen direkt prüfen kann.
   Alles bleibt im Browser (localStorage). Nichts wird ins Netz geschickt.

   Aufbau: { fassung: 2, projekte: [ { id, name, zeitModus, rubriken, doings, notizen, meilensteine } ] }
   zeitModus: "datum" (Zeitleiste mit Datum) oder "generisch" (nur Reihenfolge).
   Ältere Stände (Fassung 1, ohne Projekte) werden beim Laden als ein Projekt übernommen. */

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
  return { id: neueId(), name: name, zeitModus: "generisch", rubriken: [], doings: [], notizen: [], meilensteine: [] };
}

/* Beim ersten Start: ein leeres Projekt, keine Rubriken, keine Inhalte. */
function startDaten() {
  var d = { fassung: 2, projekte: [leerProjekt(STANDARD_PROJEKT_NAME)] };
  STARTRUBRIKEN.forEach(function (name) {
    d.projekte[0].rubriken.push({ id: neueId(), name: name });
  });
  return d;
}

/* Reihenfolge der Zeitleiste. Fehlt sie, zählt der Zeitpunkt der Erstellung. */
function ordnungVon(x) {
  var n = Number(x.ordnung);
  return isFinite(n) && n !== 0 ? n : (Number(x.erstellt) || Date.now());
}

function saeubereProjekt(roh) {
  if (!roh || typeof roh !== "object" || typeof roh.id !== "string") return null;
  var name = typeof roh.name === "string" && roh.name.trim() !== "" ? roh.name.trim() : STANDARD_PROJEKT_NAME;
  var p = {
    id: roh.id,
    name: name,
    zeitModus: roh.zeitModus === "datum" ? "datum" : "generisch",
    rubriken: [], doings: [], notizen: [], meilensteine: []
  };

  p.rubriken = (Array.isArray(roh.rubriken) ? roh.rubriken : []).filter(function (r) {
    return r && typeof r.id === "string" && typeof r.name === "string" && r.name.trim() !== "";
  }).map(function (r) {
    return { id: r.id, name: r.name.trim() };
  });
  var rubrikIds = p.rubriken.map(function (r) { return r.id; });
  function rubrikVorhanden(id) {
    return rubrikIds.indexOf(id) !== -1 ? id : null;
  }

  p.doings = (Array.isArray(roh.doings) ? roh.doings : []).filter(function (x) {
    return x && typeof x.id === "string" && typeof x.text === "string";
  }).map(function (x) {
    return {
      id: x.id,
      rubrikId: rubrikVorhanden(x.rubrikId),
      text: x.text,
      notiz: String(x.notiz || ""),
      prompt: String(x.prompt || ""),
      faellig: gueltigesDatum(x.faellig) ? x.faellig : "",
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
      rubrikId: rubrikVorhanden(x.rubrikId),
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
  } else if (Array.isArray(roh.rubriken) || Array.isArray(roh.doings) || Array.isArray(roh.notizen)) {
    /* Fassung 1: alles lag auf der obersten Ebene - wird ein Projekt */
    var alt = saeubereProjekt({ id: neueId(), name: STANDARD_PROJEKT_NAME, rubriken: roh.rubriken, doings: roh.doings, notizen: roh.notizen });
    projekte = alt ? [alt] : null;
  }
  if (!projekte) return null;
  if (!projekte.length) projekte = [leerProjekt(STANDARD_PROJEKT_NAME)];
  return { fassung: 2, projekte: projekte };
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

function rubrikName(projekt, id) {
  var r = projekt.rubriken.find(function (x) { return x.id === id; });
  return r ? r.name : "";
}

/* Löscht eine Rubrik. Ihre Doings und Notizen bleiben und landen in „Ohne Rubrik“. */
function rubrikLoeschen(projekt, id) {
  projekt.rubriken = projekt.rubriken.filter(function (r) { return r.id !== id; });
  projekt.doings.forEach(function (d) { if (d.rubrikId === id) d.rubrikId = null; });
  projekt.notizen.forEach(function (n) { if (n.rubrikId === id) n.rubrikId = null; });
  return projekt;
}

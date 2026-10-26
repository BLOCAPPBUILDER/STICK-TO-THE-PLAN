/* Stick to the plan – Dateien: Fotos und Anhänge liegen in IndexedDB auf dem Gerät.
   Ohne Oberfläche, damit auch der Service Worker sie nutzen kann (Teilen aus anderen Apps).
   Die Einträge in den Daten merken nur die Angaben (Kennung, Name, Art, Größe), nicht den Inhalt. */

var DATEI_DB = "stick-to-the-plan-dateien";
var DATEI_STORE = "dateien";
var TEIL_STORE = "teilen";

function oeffneDateiDb() {
  return new Promise(function (ok, nein) {
    var anfrage = indexedDB.open(DATEI_DB, 1);
    anfrage.onupgradeneeded = function () {
      var db = anfrage.result;
      if (!db.objectStoreNames.contains(DATEI_STORE)) db.createObjectStore(DATEI_STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(TEIL_STORE)) db.createObjectStore(TEIL_STORE, { keyPath: "id" });
    };
    anfrage.onsuccess = function () { ok(anfrage.result); };
    anfrage.onerror = function () { nein(anfrage.error); };
  });
}

/* Ein Vorgang in einer Transaktion. Liefert das Ergebnis der Anfrage, wenn alles gespeichert ist. */
function dbVorgang(speicher, modus, vorgang) {
  return oeffneDateiDb().then(function (db) {
    return new Promise(function (ok, nein) {
      var tx = db.transaction(speicher, modus);
      var anfrage = vorgang(tx.objectStore(speicher));
      tx.oncomplete = function () { db.close(); ok(anfrage ? anfrage.result : undefined); };
      tx.onerror = tx.onabort = function () { db.close(); nein(tx.error); };
    });
  });
}

/* Das, was im Eintrag steht: ohne den Inhalt der Datei. */
function anhangVon(satz) {
  return { id: satz.id, name: satz.name, typ: satz.typ, groesse: satz.groesse };
}

/* archiv: true für Bilder im Bilderarchiv. Notizen bekommen eigene Kopien, damit Löschen im Archiv nichts kaputt macht. */
function dateiSpeichern(blob, name, archiv) {
  var satz = {
    id: neueId(),
    blob: blob,
    name: name || "Datei",
    typ: blob.type || "application/octet-stream",
    groesse: blob.size,
    archiv: !!archiv,
    erstellt: Date.now()
  };
  return dbVorgang(DATEI_STORE, "readwrite", function (s) { return s.put(satz); }).then(function () {
    return anhangVon(satz);
  });
}

function dateiHolen(id) {
  return dbVorgang(DATEI_STORE, "readonly", function (s) { return s.get(id); });
}

/* Alle gespeicherten Dateien (für die Sicherung). */
function dateienAlle() {
  return dbVorgang(DATEI_STORE, "readonly", function (s) { return s.getAll(); }).then(function (liste) {
    return liste || [];
  });
}

/* Das Bilderarchiv: alle Bilder, die man für Notizen auswählen kann. Neueste zuerst. */
function archivHolen() {
  return dateienAlle().then(function (liste) {
    return liste.filter(function (s) { return s.archiv; }).sort(function (a, b) { return (b.erstellt || 0) - (a.erstellt || 0); });
  });
}

function dateienLoeschen(ids) {
  if (!ids.length) return Promise.resolve();
  return dbVorgang(DATEI_STORE, "readwrite", function (s) {
    ids.forEach(function (id) { s.delete(id); });
  });
}

/* Ersetzt alle gespeicherten Dateien, z. B. beim Laden einer Sicherung. */
function dateienErsetzen(liste) {
  return oeffneDateiDb().then(function (db) {
    return new Promise(function (ok, nein) {
      var tx = db.transaction(DATEI_STORE, "readwrite");
      var s = tx.objectStore(DATEI_STORE);
      s.clear();
      liste.forEach(function (satz) { s.put(satz); });
      tx.oncomplete = function () { db.close(); ok(); };
      tx.onerror = tx.onabort = function () { db.close(); nein(tx.error); };
    });
  });
}

/* Geteiltes aus anderen Apps: der Service Worker legt Dateien und Eintrag ab, die App macht daraus Notizen. */
/* Geteiltes wird nur als Notiz vorgemerkt, nicht ins Bilderarchiv. Die App fragt nach dem Projekt. */
function teilenAblegen(titel, text, link, dateien) {
  return Promise.all(dateien.map(function (d) { return dateiSpeichern(d, d.name, false); })).then(function (anhaenge) {
    var satz = { id: neueId(), erstellt: Date.now(), titel: titel, text: text, link: link, anhaenge: anhaenge };
    return dbVorgang(TEIL_STORE, "readwrite", function (s) { return s.put(satz); });
  });
}

function geteilteHolen() {
  return dbVorgang(TEIL_STORE, "readonly", function (s) { return s.getAll(); }).then(function (liste) {
    return liste || [];
  });
}

function geteilteLoeschen(ids) {
  if (!ids.length) return Promise.resolve();
  return dbVorgang(TEIL_STORE, "readwrite", function (s) {
    ids.forEach(function (id) { s.delete(id); });
  });
}

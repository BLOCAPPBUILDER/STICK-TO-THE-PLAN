/* Stick to the plan – Offline-Unterstützung und Teilen aus anderen Apps.
 * Netz zuerst, bei Verbindungsfehler der Zwischenspeicher. Lädt nichts von fremden Servern.
 * Geteilte Fotos und Texte (POST an ./teilen-ziel) landen auf dem Gerät; die App macht daraus eine neue Notiz.
 * Bei jeder neuen Fassung FASSUNG hier und ?v= in index.html ändern.
 */

importScripts("./kern.js", "./dateien.js");

var FASSUNG = "2026-10-28-7";
var NETZ_FRIST = 5000;   /* ms: danach gilt das Netz als nicht erreichbar, die Seite kommt aus dem Zwischenspeicher */
var SPEICHER = "stick-to-the-plan-" + FASSUNG;
var GRUNDGERUEST = [
  "./", "./index.html", "./app.css", "./daten.js", "./kern.js", "./dateien.js", "./app.js",
  "./manifest.json", "./icon.svg", "./icon-180.png", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png",
  "./img/dunkel-hintergrund.jpg", "./img/hell-hintergrund.jpg", "./privacy.html"
];
var TEIL_ZIEL = /\/teilen-ziel$/;

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(SPEICHER)
      /* Jede Datei einzeln: fehlt eine, bleiben die übrigen im Zwischenspeicher (bei addAll ginge alles verloren) */
      .then(function (c) {
        return Promise.all(GRUNDGERUEST.map(function (adresse) {
          return c.add(adresse).catch(function () {});
        }));
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (namen) {
        return Promise.all(namen.map(function (n) {
          if (n !== SPEICHER) return caches.delete(n);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

/* Geteiltes aus einer anderen App: Text, Link und Dateien ablegen, dann zurück in die App. */
function nimmTeilenAn(anfrage) {
  var ziel = new URL("./?geteilt=", self.registration.scope).href;
  return anfrage.formData().then(function (formular) {
    var titel = String(formular.get("titel") || "").trim();
    var text = String(formular.get("text") || "").trim();
    var treffer = text.match(/https?:\/\/\S+/);
    var link = sichererLink(String(formular.get("link") || "")) || (treffer ? sichererLink(treffer[0]) : "");
    if (treffer) text = text.replace(treffer[0], "").trim();
    var dateien = formular.getAll("datei").filter(function (d) { return d && d.size > 0; });
    return teilenAblegen(titel, text, link, dateien);
  }).then(function () {
    return Response.redirect(ziel + "ok", 303);
  }, function () {
    return Response.redirect(ziel + "fehler", 303);
  });
}

self.addEventListener("fetch", function (e) {
  var adresse = new URL(e.request.url);
  if (e.request.method === "POST" && adresse.origin === self.location.origin && TEIL_ZIEL.test(adresse.pathname)) {
    e.respondWith(nimmTeilenAn(e.request));
    return;
  }
  if (e.request.method !== "GET" || adresse.origin !== self.location.origin) return;
  /* Netz zuerst, aber nicht endlos: ein hängendes Netz (Funkloch, schwaches WLAN) zählt nach NETZ_FRIST als offline */
  var frist = new Promise(function (ok, nein) { setTimeout(function () { nein(new Error("Zeitlimit")); }, NETZ_FRIST); });
  e.respondWith(
    Promise.race([fetch(e.request), frist])
      .then(function (antwort) {
        /* Nur gültige Antworten in den Zwischenspeicher (kein 404, keine Teilantwort) */
        if (antwort.ok && antwort.status === 200) {
          var kopie = antwort.clone();
          caches.open(SPEICHER).then(function (c) { c.put(e.request, kopie); }).catch(function () {});
        }
        return antwort;
      })
      .catch(function () {
        /* Offline: Adresse ohne Suchteil (z. B. ?geteilt=ok) und sonst die Startseite */
        return caches.match(e.request, { ignoreSearch: true }).then(function (treffer) {
          /* Nur Seitenaufrufe bekommen die Startseite, fehlende Skripte und Bilder nicht */
          return treffer || (e.request.mode === "navigate" ? caches.match("./index.html") : Response.error());
        });
      })
  );
});

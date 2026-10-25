/* Stick to the plan – Offline-Unterstützung.
 * Netz zuerst, bei Verbindungsfehler der Zwischenspeicher. Lädt nichts von fremden Servern.
 * Bei jeder neuen Fassung FASSUNG hier und ?v= in index.html ändern.
 */

var FASSUNG = "2026-10-25-2";
var SPEICHER = "stick-to-the-plan-" + FASSUNG;
var GRUNDGERUEST = [
  "./", "./index.html", "./app.css", "./daten.js", "./kern.js", "./app.js",
  "./manifest.json", "./icon.svg", "./privacy.html"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(SPEICHER)
      .then(function (c) { return c.addAll(GRUNDGERUEST); })
      .then(function () { return self.skipWaiting(); })
      .catch(function () { return self.skipWaiting(); })
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

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(function (antwort) {
        var kopie = antwort.clone();
        caches.open(SPEICHER).then(function (c) { c.put(e.request, kopie); });
        return antwort;
      })
      .catch(function () { return caches.match(e.request); })
  );
});


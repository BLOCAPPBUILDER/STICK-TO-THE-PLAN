# Stick to the plan

Lokales Denkbrett mit Projekten, Aufgaben, Zeitleiste. Keine Konten, kein Server, kein Tracking: alles liegt im Browser auf diesem Gerät.

## Aufbau

| Datei | Inhalt |
|---|---|
| `index.html` | Startseite (Doings oben, Notizen rechts bzw. über die untere Leiste) |
| `app.css` | Aussehen, Dunkel und Hell, Glas-Optik wie BLOC |
| `app.js` | Oberfläche: Doings, Rubriken, Notizen, Promts, Sichern |
| `kern.js` | Daten: Speichern, Prüfen, Links, Rubriken löschen |
| `daten.js` | Start-Rubriken und die vorgefertigten Promts (`PROMT_VORLAGEN`) |
| `sw.js` | Offline-Zwischenspeicher (nur bei Aufruf über http/https) |
| `einheitstest.html` | Prüfungen der Datenfunktionen |
| `privacy.html` | Datenschutz |

## Funktionen

- **Doings** oben auf der Startseite, einklappbar. Rubriken gruppieren sie (einklappbar), „Ohne Rubrik“ für den Rest.
- **Erledigte ausblenden**, Doing bearbeiten (Notiz, Promt, Rubrik), Promt kopieren.
- **Promts**: vorgefertigte Vorlagen zum Kopieren oder als Doing anlegen.
- **Notizen** (Denkbrett): Gedanken, Liedtitel, Links. Spotify- und YouTube-Links werden erkannt. Filter nach Rubrik.
- **Sichern und laden**: Export als JSON-Datei und Wiederherstellung.
- **Design**: System, Hell oder Dunkel (Symbol oben rechts).

## Ändern

- Neue Promts in `daten.js` an `PROMT_VORLAGEN` anhängen (Kennung ohne Leerzeichen).
- Bei jeder neuen Fassung `FASSUNG` in `sw.js` und `?v=` in `index.html` gemeinsam ändern.
- Nach Änderungen `einheitstest.html` öffnen und prüfen, dass alle Prüfungen grün sind.


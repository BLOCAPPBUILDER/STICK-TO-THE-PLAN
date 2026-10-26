# Stick to the plan

Lokales Denkbrett mit Projekten, Aufgaben, Zeitleiste. Keine Konten, kein Server, kein Tracking: alles liegt im Browser auf diesem Gerät.

## Aufbau

| Datei | Inhalt |
|---|---|
| `index.html` | Startseite (Notizen, Doings, Zeitleiste über die untere Leiste) |
| `app.css` | Aussehen, Dunkel und Hell, Glas-Optik wie BLOC |
| `app.js` | Oberfläche: Doings, Notizen, Promts, Langdruck-Menü, Sichern |
| `kern.js` | Daten: Speichern, Prüfen, Links, Anhang-Angaben |
| `dateien.js` | Fotos und Dateien in IndexedDB auf dem Gerät |
| `daten.js` | Die vorgefertigten Promts (`PROMT_VORLAGEN`) |
| `sw.js` | Offline-Zwischenspeicher und Empfang geteilter Fotos (`./teilen-ziel`) |
| `einheitstest.html` | Prüfungen der Datenfunktionen |
| `privacy.html` | Datenschutz |

## Funktionen

- **Doings**: einklappbar (ganze Liste und jedes Doing einzeln), Fälligkeit, Notiz, Promt, Fotos und Dateien. „Erledigte ausblenden“.
- **Notizen** (Denkbrett): Gedanken, Liedtitel, Links, Fotos und Dateien. Spotify- und YouTube-Links werden erkannt. Jede Notiz ist einklappbar.
- **Fotos und Dateien**: an Doings und Notizen anhängen. Große Fotos werden beim Speichern verkleinert. Die Dateien liegen in IndexedDB auf dem Gerät.
- **Teilen aus anderen Apps**: Auf Android kann man in der installierten App ein Foto oder eine Datei teilen; daraus entsteht eine neue Notiz. iOS unterstützt das nicht.
- **Langes Drücken** auf ein Doing oder eine Notiz öffnet Bearbeiten, Teilen und Löschen. Langes Drücken auf einen Projektnamen löscht das Projekt.
- **Promts**: vorgefertigte Vorlagen zum Kopieren oder als Doing anlegen.
- **Sichern und laden**: Export als JSON-Datei (mit Fotos und Dateien) und Wiederherstellung.
- **Design**: System, Hell oder Dunkel (Symbol oben rechts).

## Ändern

- Neue Promts in `daten.js` an `PROMT_VORLAGEN` anhängen (Kennung ohne Leerzeichen).
- Bei jeder neuen Fassung `FASSUNG` in `sw.js` und `?v=` in `index.html` gemeinsam ändern.
- Nach Änderungen `einheitstest.html` öffnen und prüfen, dass alle Prüfungen grün sind.


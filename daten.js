/* Doings – feste Angaben: Start-Rubriken und die vorgefertigten Promts.
   Neue Promts einfach unten anhängen (id eindeutig, ohne Leerzeichen). */

/* Bewusst leer: die App legt beim Start keine Rubriken und keine Inhalte aus anderen Projekten an. */
var STARTRUBRIKEN = [];

var PROMT_VORLAGEN = [
  {
    id: "umbau",
    titel: "Umbau, Funktionen bleiben",
    text: "Bitte umbauen, aber alle bestehenden Funktionen genau so lassen. Nicht 1:1 übernehmen: die Darstellung darf klarer und didaktischer werden. Sonst nichts verändern."
  },
  {
    id: "hell-dunkel",
    titel: "Dunkel und Hell gleich gut",
    text: "Bitte prüfen, dass Dunkel und Hell gleich sauber aussehen. Texte bleiben hoch kontrastreich. Farben nur dort, wo sie eine Funktion haben."
  },
  {
    id: "ruhiger-hintergrund",
    titel: "Ruhigerer Hintergrund",
    text: "Den Hintergrund etwas dunkler machen, damit die App ruhiger wirkt und besser lesbar ist. Bitte nicht übertreiben. Ausnahme: laufende Übungen oder Timer behalten ihren Hintergrund."
  },
  {
    id: "glas-stil",
    titel: "Stil: Glasmorphismus",
    text: "Modern, edel, minimalistisch. Dark Mode bevorzugt, Glasmorphismus mit sanftem Blur, weiche Verläufe und Schatten, räumliche Tiefe durch Schichten. Texte schweben leicht über dem Glas, der Kontrast bleibt hoch."
  },
  {
    id: "bild-tauschen",
    titel: "Bild austauschen",
    text: "Bitte das Bild an dieser Stelle durch [Bildname] ersetzen. Das alte Bild danach entfernen, wenn es nirgends mehr gebraucht wird."
  },
  {
    id: "rechtlich-sauber",
    titel: "Rechtlich sauber texten",
    text: "Texte in eigenen Worten formulieren, Quellen nur nennen, keine Heil- oder Garantieversprechen. Alle neuen Texte bitte so prüfen."
  },
  {
    id: "pruefen",
    titel: "Vor dem Abschluss prüfen",
    text: "Bitte alle Bereiche in Hell und Dunkel durchklicken, die Funktionen prüfen und Fehler mit Schritten melden. Am Ende kurz schreiben, was geprüft wurde und was nicht."
  },
  {
    id: "einfach-machen",
    titel: "Bei Unklarheit selbst entscheiden",
    text: "Bitte entscheide bei Unklarheiten begründet selbst und setze um. Schreibe mir danach kurz, was du entschieden hast und warum."
  }
];

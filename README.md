# Räddel 3.3

Tägliches deutsches Worträtsel von Bergelmirsenpai.

Spiel: https://bergelmirsenpai.github.io/raeddel/  
Editor: https://bergelmirsenpai.github.io/raeddel/editor.html  
Testmodus: https://bergelmirsenpai.github.io/raeddel/?admin=sesamraeddel

## Architektur und Regeln

Statische Website ohne Framework oder Backend: `index.html`, `style.css`, `app.js`; getrennte Daten in `puzzles.js`; Editor in `editor.html` und `editor.js`. 30 Rätsel, 120 Verbindungen, 240 Richtungshinweise. Termine: 14.11.–13.12.2026. Danach bleibt das letzte Rätsel verfügbar, bis neue ergänzt werden.

Alle offenen Hinweise verwenden dasselbe bekannte Wort in Blau und bleiben gemischt. Beide Spielrichtungen und beliebige Wechsel sind möglich. Auch die letzte Verbindung muss eingegeben oder aufgedeckt werden. Punkte: 5 ohne Zusatzhilfe, 2 mit Zusatzhilfe, 0 aufgedeckt. Tagesgrenzen gelten in Europe/Berlin; Archivabschlüsse zählen nur am jeweiligen Veröffentlichungstag zur Serie.

## Neue Rätsel und Updates

1. Editor öffnen, Datum und Wortkette eingeben; pro Verbindung Vorwärts- und Rückwärtshinweis mit genau einem `_` formulieren.
2. Formal prüfen und redaktionell testen, dann `puzzles.js` exportieren.
3. Die Datei auf GitHub ersetzen und Änderung in `main` übernehmen. Actions testet vor der Veröffentlichung.

Der Editor exportiert eine vollständige Datei und schreibt nicht direkt auf GitHub. Bestehende IDs, Termine und Schrittfolge erhalten. `id` ist stabil (`rd-YYYY-MM-DD`), `legacyId` die Anzeigenummer, `schemaVersion` das Format und `editorialVersion` die Textversion. `steps[].answer` ist das nächste Wort; die letzte Antwort entspricht `end`. Textkorrekturen erhöhen `editorialVersion`. Redaktionelle Überarbeitung ist noch offen.

## Lokale Daten

`raeddel-v2` (Schema 2) speichert Datensätze nach Veröffentlichungsdatum: `solvedEdges`, Punkte, Hilfen, Aufdeckungen, Abschlusszeit. Deshalb auch Termine stabil halten. Kleine Oberflächen- und Hinweisupdates löschen keine Daten. Strukturelle Kettenänderungen benötigen künftig ein Migrationskonzept. Vorhandene V1-Leselogik bleibt erhalten; umfassende Altdatenmigration und Netlify-Datenumzug sind nicht Teil dieses Auftrags.

Export und Import bleiben als vorhandene Zusatzfunktion erhalten. Import bevorzugt den weiter fortgeschrittenen Datensatz und ist kein vollständiger Konfliktabgleich. Browserdatenlöschung, Geräte- oder Domainwechsel können Fortschritt verlieren.

## Testmodus

`?admin=sesamraeddel` zeigt alle Rätsel. Fortschritte bleiben im Arbeitsspeicher; reguläre Daten werden weder geschrieben noch migriert. Kein echter Passwortschutz: Lösungen sind im statischen Quellcode zugänglich.

## Tests und Deployment

Node.js 22 und Python 3 vorausgesetzt: `npm ci`, `npx playwright install chromium`, `npm test`. Isolierte Chromium-Kontexte testen unter `/raeddel/`. GitHub Pages verwendet GitHub Actions. Der Workflow veröffentlicht bei erfolgreichen Tests auf `main` ausschließlich Website-Dateien. Fehler verhindern das neue Deployment. Netlify erst nach Prüfung der neuen Website abschalten.

## Lizenz

Programmcode: MIT (`LICENSE`). Rätseltexte: CC BY 4.0 (`LICENSE-CONTENT.txt`), Namensnennung Bergelmirsenpai.

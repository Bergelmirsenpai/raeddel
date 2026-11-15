# Räddel 3.4

Tägliches deutsches Worträtsel von Bergelmirsenpai.

Spiel: https://bergelmirsenpai.github.io/raeddel/  
Editor: https://bergelmirsenpai.github.io/raeddel/editor.html  
Testmodus: https://bergelmirsenpai.github.io/raeddel/?admin=sesamraeddel

## Architektur und Spielregeln

Statische Website ohne Framework oder Backend: `index.html`, `style.css`, `app.js`; getrennte Daten in `puzzles.js`; Editor in `editor.html` und `editor.js`. **30 redaktionell überarbeitete Rätsel**, 8–12 Wörter einschließlich Start und Ziel, also 7–11 Verbindungen je Kette. Insgesamt 269 Verbindungen und 538 Richtungshinweise. Veröffentlichungen: 14.11.–13.12.2026. Danach bleibt das letzte Rätsel verfügbar, bis neue ergänzt werden.

Alle offenen Hinweise verwenden denselben aktuell bekannten Begriff in Blau und bleiben stabil gemischt. Kein aktiver Hinweis wird ohne verwendete Zusatzhilfe besonders markiert. Beide Spielrichtungen und beliebige Wechsel sind möglich. Auch die letzte Verbindung muss eingegeben oder aufgedeckt werden. Punkte: 5 ohne Zusatzhilfe, 2 mit Zusatzhilfe, 0 aufgedeckt. Tagesgrenzen gelten in Europe/Berlin; Archivabschlüsse zählen nur am jeweiligen Veröffentlichungstag zur Serie.

Die sprachliche Einzelprüfung aller Verbindungen, der vollständige Altbestandsbefund, Gesamtbewertungen aller 30 Ketten und Inspirationsquellen stehen in [docs/REDAKTION.md](docs/REDAKTION.md). Das ersetzt keinen unabhängigen Test mit Jugendlichen.

## Neue Rätsel und Textkorrekturen

1. Editor öffnen, Datum und Startwort eingeben; 7–11 Verbindungen anlegen. Standard: acht Verbindungen, neun Wörter. Verbindungen lassen sich entfernen.
2. Pro Verbindung Vorwärts- und Rückwärtshinweis mit jeweils genau einem `_` formulieren. Beide Hinweise mit dem jeweils bekannten Wort lesen; Wortart, Kasus, Operation und alternative Lösungen prüfen. Auch die gemischte Liste muss eindeutig bleiben.
3. Formal prüfen und redaktionell durchspielen, dann `puzzles.js` exportieren. Der Editor ergänzt ein neues Rätsel und exportiert die vollständige Datei; er ändert bestehende Rätsel nicht und schreibt nicht auf GitHub.
4. Für vorhandene Rätsel IDs und Termine beibehalten. Kleine Textkorrekturen erhöhen nur `editorialVersion`. Bei geänderten Wörtern, Reihenfolge, Länge oder anderer Bedeutung einer Kante `structureVersion` erhöhen. Die gespeicherte Wortfolge ist eine zusätzliche Sicherung gegen einen vergessenen Versionssprung.
5. Daten-/Browserprüfungen und Dokumentation aktualisieren; Änderung nach `main` übernehmen. Actions testet vor der Veröffentlichung.

Datenmodell: `id` ist stabil (`rd-YYYY-MM-DD`), `legacyId` die Anzeigenummer, `schemaVersion` das Format, `editorialVersion` die Textfassung, `structureVersion` die Identität der Kanten. `steps[].answer` ist das nächste Wort; die letzte Antwort entspricht `end`. `kind` ist `letter` oder `meaning`; `hint` entspricht `clues.forward`. `explanation` dokumentiert die Lösung, zählt aber nicht als Zusatzhilfe im Spiel. Neue Editor-Rätsel beginnen mit Struktur- und Textversion 1; die einmalig umgebauten 30 Rätsel haben Strukturversion 2 und Textversion 4.

## Stabile Speicherung und einmaliger Reset

Der Schlüssel **`raeddel-v2` und Speicherschema 2 bleiben bestehen**. Datensätze werden weiterhin nach Veröffentlichungstag abgelegt. Zusätzlich speichern sie `puzzleId`, `structureVersion` und `chainSignature`: die vollständige, normalisierte Wortfolge einschließlich Start. Die Signatur verwendet keinen kollisionsanfälligen Kurz-Hash und enthält keine Hinweistexte.

Vor Anzeige von Archiv oder Statistik werden **alle vorhandenen Datensätze der bekannten Rätsel** abgeglichen, auch noch nicht erneut geöffnete. Stimmen ID, Strukturversion oder Wortfolge nicht überein, beginnt nur dieses Rätsel neu: Kanten, Punkte, Hilfen, Reihenfolge und Abschlusszeit werden nicht auf andere Inhalte übertragen. Ein sichtbarer Hinweis im betroffenen Rätsel erklärt den Reset. Bereits zurückgesetzte neue Fortschritte bleiben beim Wiederladen erhalten. Unveränderte Datensätze einschließlich ihrer echten Abschlusszeit bleiben erhalten; nur gültige tägliche Abschlüsse tragen zur Serie bei.

Unversionierte V1/V2-Kanten können keiner aktuellen Wortfolge zuverlässig zugeordnet werden. Beim autorisierten einmaligen Umbau werden sie deshalb bei den 30 neu gefassten Ketten zurückgesetzt. Auch neue Rätsel mit Strukturversion 1 verlangen vollständige Strukturmetadaten. Reine Formulierungs- und Oberflächenkorrekturen ändern weder Strukturversion noch Wortsignatur und löschen keinen Fortschritt. Es gibt keine aufwendige V1/V2-Inhaltsmigration und keinen Domain-/Netlify-Datentransfer.

Export und Import bleiben erhalten. Der Import übernimmt ausschließlich passende Strukturen und bevorzugt den weiter fortgeschrittenen Datensatz; unpassende Sicherungen werden mit einer Meldung übersprungen. Das ist kein vollständiger Konfliktabgleich und prüft nicht die Ehrlichkeit selbst bearbeiteter Sicherungen. Browserdatenlöschung, Geräte- oder Domainwechsel können Fortschritt verlieren.

## Testmodus

`?admin=sesamraeddel` zeigt alle Rätsel. Fortschritte bleiben im Arbeitsspeicher; reguläre V1-/V2-Daten werden weder geschrieben noch migriert. Kein echter Passwortschutz: Lösungen sind im statischen Quellcode zugänglich.

## Tests und Deployment

Node.js 22 und Python 3: `npm ci`, `npx playwright install --with-deps chromium`, `npm test`. Die Chromium-Tests laufen unter dem relativen Pfad `/raeddel/`, lokal auf Port 8187. Die Datenprüfung erfasst alle Ketten; alle 30 werden im Browser jeweils vollständig vorwärts und rückwärts gespielt. Weitere Tests decken Richtungswechsel, 5/2/0 Punkte, letzte Kante, Speicherabgleich, Textupdates, Import/Export, Europe/Berlin, mobile Breiten 320/390 und Editor-Export ab.

GitHub Pages wird ausschließlich durch `.github/workflows/pages.yml` auf **ubuntu-24.04** veröffentlicht. Playwright 1.56.1 unterstützt Ubuntu 26.04 nicht offiziell. Der Workflow veröffentlicht nach erfolgreichen Tests ausschließlich Website-Dateien. Tests, Dokumentation, `node_modules` und Sicherungsdateien kommen nicht ins Website-Artefakt. Bei Aktualisierungen die Asset-Versionsparameter in beiden HTML-Dateien anpassen. Netlify wurde bei dieser Überarbeitung nicht verändert.

## Lizenz

Programmcode: MIT (`LICENSE`). Rätseltexte: CC BY 4.0 (`LICENSE-CONTENT.txt`), Namensnennung Bergelmirsenpai.

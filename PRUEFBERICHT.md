# Prüfung Räddel 3.4 · 15.11.2026

## Ausgangspunkt und Umfang

Remote `main` vor Änderungen: `35cdc6688935e84b5fe55009b0ff7bd267b37279`. README, vorheriger Prüfbericht, Datenmodell und der gesamte Bestand wurden gelesen. Alle 30 Rätsel wurden redaktionell neu gefasst. IDs, Anzeigenummern und Termine sind erhalten. 8–12 Wörter einschließlich Start/Ziel ergeben 269 Verbindungen und 538 Richtungshinweise.

[Das vollständige Redaktionsprotokoll](docs/REDAKTION.md) enthält Befunde zu allen 30 alten Rätseln, Gesamtbewertungen aller neuen Ketten, Quellen und die Einzelprüfung jeder neuen Verbindung in beiden Richtungen. Es dokumentiert konkrete Entscheidungen zu Grammatik, Operation, Sachrichtigkeit, Mehrdeutigkeit und Schwierigkeit. Es ist keine automatisch erzeugte sprachliche Freigabe aus bloßen Strukturtests und kein unabhängiger Jugendtest.

## Automatisierte Prüfung

**57 Playwright-Chromium-Tests bestanden**, letzter lokaler vollständiger Lauf: **52,4 Sekunden**. Lokal: Node.js 24.22.1, Python 3.14.4, Playwright 1.56.1, Chromium 141.0.7390.37 (Build 1194), zwei Worker. Der Workflow verwendet Node.js 22. Zuvor `npm ci --ignore-scripts` erfolgreich: zwei Pakete, keine gemeldeten Schwachstellen.

- Alle 30 Ketten jeweils vollständig vorwärts und rückwärts: 60 vollständige Browserdurchläufe; zusätzlich drei längere Ketten mit Wechsel nach jeder Antwort und ein tatsächlicher Tagesabschluss bei unterschiedlichem UTC-/Berlin-Datum.
- Alle offenen Kontextbegriffe sind exakt gleich, einschließlich Anführungszeichen und Großschreibung; blaue Farbe geprüft. Keine aktive Sondermarkierung, bevor eine Zusatzhilfe verwendet wurde. Reihenfolge ist gemischt und bleibt beim Wechsel stabil.
- 5/2/0 Punkte, verwendete Hilfen und gelöste Hinweise, kein doppeltes Punkten. Letzte Verbindung muss eingegeben oder ausdrücklich aufgedeckt werden.
- Wiederladen, gezielter einmaliger Reset alter Kanten, Abgleich auch ungeöffneter Archivdatensätze, unveränderte Abschlusszeiten, reine Textkorrekturen ohne Reset, veränderte ID/Strukturversion/Wortfolge (auch bei gleicher Länge), ungültige Hinweisreihenfolgen.
- Unpassende Sicherung kann keinen passenden Spielstand überschreiben; passender Import und Export mit Strukturmetadaten funktionieren. Admin-Modus lässt vorhandene V1-/V2-Daten unverändert und schreibt keine regulären Fortschritte.
- Archiv ohne nachträgliche Tages-Serie; vier Berliner Sommer-/Winterzeitgrenzen; automatischer Tageswechsel; echter Abschluss nach Berliner Mitternacht bei UTC am Vortag. Die Saison-Grenztests verwenden injizierte Veröffentlichungstermine.
- Relative Pfade unter `/raeddel/`, Teilen-Link ohne Admin-Parameter, Editorgrenzen 7–11 Verbindungen, Entfernen, Platzhalterfehler und vollständiger Export mit unveränderten Bestandsrätseln.
- Mobile Überlaufprüfung bei 320 und 390 Pixeln für lange Endwörter, längste Kette, Richtungswechsel und Editor.
- Datenprüfung über sämtliche Ketten: Anzahl, eindeutige/stabile IDs und Termine, Längen, keine Wortwiederholung innerhalb einer Kette, kein wiederholtes Wortpaar im Bestand, letzter Schritt = Ziel, 538 Platzhalter, keine ausgeschriebene Zielantwort im jeweiligen Hinweis, Abgleich mit den dokumentierten Hinweisen und Buchstabenprüfungen nach Mechanik. Kombinierte Operationen und Bedeutungsbeziehungen sind zusätzlich redaktionell erklärt und gelesen.

Die lokale Maschine läuft auf Ubuntu 26.04, das diese Playwright-Version nicht offiziell unterstützt. Für die lokale Prüfung wurde der Ubuntu-24.04-Chromium-Build mit `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64` verwendet. Der GitHub-Workflow verwendet weiterhin das offiziell unterstützte **ubuntu-24.04**, installiert mit `npx playwright install --with-deps chromium` und führt `npm test` vor dem Deployment aus.

## Sichtprüfung und behobene Befunde

Im In-App-Browser wurden lokale Spielansicht und Editor angesehen, außerdem die schmale 320-Pixel-Ansicht und die Umbrüche der Hinweise. Die anfänglichen Überläufe von Kopfzeile, Endwörtern und Editorfeldern wurden korrigiert. Bedeutungshinweise verwenden ein Wortetikett vor dem Doppelpunkt, damit auch ein anderer aktuell bekannter Begriff die Grammatik einer offenen Zeile nicht zerstört. Unabhängig davon wurde jede Verbindung mit dem sachlich passenden Kontextwort geprüft.

Redaktionell wurden unter anderem falsche Zählungen, unpassende Rückfragen, fehlerhafte Gleichsetzungen, ungenaue Stoff-/Körperbeschreibungen und triviale Zahlenabfragen entfernt. Mögliche vorzeitige Treffer in der gemischten Liste werden durch konkrete Ausgangsbedeutungen eingegrenzt. Details stehen im Einzelprotokoll.

## Veröffentlichung und Speicherdaten

Der Workflow und seine Website-Dateiliste wurden geprüft. Veröffentlichung ausschließlich über GitHub Actions; Tests, Dokumentation und `node_modules` werden nicht in das Pages-Artefakt kopiert. Asset-Versionsparameter verhindern die Weiterverwendung der bisherigen Skriptadressen beim Laden der neuen HTML-Fassung. Netlify bleibt unverändert.

Speicherschlüssel und Schema bleiben stabil. Die Strukturprüfung vergleicht Rätsel-ID, Strukturversion und vollständige normalisierte Wortfolge. Unpassende Datensätze verlieren ihre Kanten, Punkte, Hilfen und Abschlusszeit; nur betroffene Rätsel zeigen einen Reset-Hinweis. Kleinere Textkorrekturen behalten Spielstände. Ausführliche Strategie im README. Der Actions-Lauf und die anschließende Live-Prüfung werden im Übergabebericht mit konkreten Links festgehalten.

## Verbleibende Grenzen

Keine unabhängigen Lösungsversuche mit durchschnittlichen 14-Jährigen und keine gemessenen Schwierigkeits- oder Abbruchquoten. Auch nach der Einzelprüfung kann natürliche Sprache seltene Alternativdeutungen enthalten. Keine Prüfung mit Safari, Firefox oder echten Mobilgeräten. Keine umfassende V1/V2-Inhaltsmigration oder Übernahme einer anderen Domain. Import bleibt ein Fortschrittsvergleich, kein vollständiger Konfliktabgleich und keine Manipulationssicherung. Der Vorrat endet am 13.12.2026. Der Testzugang ist absichtlich kein sicherer Passwortschutz; die Lösungen bleiben im statischen Quelltext zugänglich.

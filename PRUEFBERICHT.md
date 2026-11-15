# Technische Prüfung – 15.11.2026

## Durchgeführt

14 automatisierte Chromium-Tests bestanden (Playwright 1.56.1): Vorwärts, rückwärts, Richtungswechsel nach mehreren Antworten, letzte Verbindung manuell, 5/2/0-Punkte, Hinweiskennzeichnung und blaue Platzhalter, stabile Mischung beim Richtungswechsel, Wiederladen gespeicherter Fortschritte, Archiv ohne nachträgliche Serie, Berliner Abschlussdatum trotz UTC-Datumsunterschied, vier Tagesgrenzen bei Sommer-/Winterzeit, automatischer Tageswechsel, mobile Breite 390px und Editor-Erreichbarkeit, formale Datenprüfung sowie Testmodus ohne Schreibzugriff auf regulären Speicher.

Die Sommer-/Winterzeit-Tests injizieren Test-Veröffentlichungstermine und prüfen die Auswahl durch die Anwendung. Rätseldaten wurden gegen das Original verglichen: alle Inhalte und IDs unverändert (nur Formatierung geändert).

## Korrigiert

- Erfolgsserie wertet Abschlusszeit in Europe/Berlin aus.
- Tageswechsel erkennt auch mehrere Tage seit der letzten Prüfung.
- Teilen-Link verwendet die aktuelle Website-Adresse.
- Testmodus führt keine reguläre Datenmigration aus.
- Ungültige Hinweisreihenfolgen außerhalb des Indexbereichs werden verworfen.
- Alte destruktive HTML-Testseiten und nicht verwendete Hinweis-Overrides entfernt; Tests laufen in isolierten Kontexten.
- Quellen lesbar formatiert, Dokumentation aktualisiert.

## Grenzen

Keine redaktionelle Abnahme oder Grammatikgarantie. Keine vollständige Altdatenmigration oder Netlify-Datenübernahme. Vorhandener Import ist kein vollständiger Konfliktabgleich. Safari/Firefox und echte Mobilgeräte wurden nicht getestet. Kleinere Updates auf derselben Origin erhalten den Speicher; strukturelle Änderungen an Ketten brauchen ein künftiges Migrationskonzept. IDs und Termine müssen stabil bleiben. Der Rätselvorrat endet am 13.12.2026. Der Testzugang ist kein sicherer Passwortschutz.

Lokale Tests prüfen das Verhalten unter /raeddel/. Der öffentliche Actions-Lauf und die Live-Prüfung werden bei der Übergabe separat bestätigt.

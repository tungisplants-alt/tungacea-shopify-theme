# Unternehmer-OS – Projektvision

## Arbeitstitel

**Unternehmer-OS** – eine KI-gestützte Unternehmenszentrale für Einzelunternehmer und Kleingewerbe.

Der endgültige Produktname ist noch offen. Mögliche Arbeitstitel sind außerdem **SoloOS**, **UnternehmerPilot**, **OneDesk AI** oder **Project Atlas**.

## Ausgangsidee

Einzelunternehmer arbeiten häufig mit vielen voneinander getrennten Werkzeugen für Kunden, Aufgaben, Projekte, Angebote, Rechnungen, Dokumente, Termine, E-Mails, Buchhaltung, Website und Marketing.

Das Ziel ist nicht, jedes Spezialwerkzeug vollständig nachzubauen. Stattdessen soll eine zentrale Anwendung entstehen, die die wichtigsten Abläufe bündelt, vorhandene Dienste intelligent verbindet und den gesamten Geschäftskontext versteht.

Die Anwendung soll sich nicht wie ein einfacher Chatbot verhalten, sondern wie ein verlässlicher digitaler Geschäftspartner.

## Zielgruppe

- Einzelunternehmer
- Kleingewerbetreibende
- Solo-Selbstständige
- Freelancer
- kleine Dienstleistungsbetriebe
- Gründer ohne eigene Verwaltungsabteilung

## Zentrales Nutzenversprechen

Die Anwendung führt den Nutzer sicher durch den geschäftlichen Alltag, macht offene Aufgaben sichtbar, erinnert an wichtige Fristen und schlägt sinnvolle nächste Schritte vor.

Beispiele:

- „Das Angebot an Kunde Müller wurde vor sieben Tagen versendet. Soll eine freundliche Nachfrage vorbereitet werden?“
- „Für Projekt X fehlt noch die Schlussrechnung.“
- „In fünf Tagen steht eine steuerliche Frist an.“
- „Drei Kundenanfragen wurden noch nicht beantwortet.“
- „Aus diesem angenommenen Angebot kann jetzt eine Rechnung erstellt werden.“

## Grundprinzipien

1. **Schrittweise entwickeln** – zuerst ein kleiner, stabiler MVP.
2. **Proaktiv statt nur reaktiv** – die KI erkennt Handlungsbedarf.
3. **Ein gemeinsamer Geschäftskontext** – Kunden, Projekte, Aufgaben und Dokumente sind miteinander verbunden.
4. **Sicherheit und Nachvollziehbarkeit** – wichtige Aktionen werden erklärt und bestätigt.
5. **Modularität** – Funktionen können später ergänzt oder ausgetauscht werden.
6. **Spezialsoftware integrieren statt blind ersetzen** – zum Beispiel Buchhaltung, Banking oder E-Mail-Dienste.
7. **Alltagstauglichkeit zuerst** – die App muss dem Ersteller selbst täglich Zeit sparen.

## MVP – Version 0.1

Die erste nutzbare Version soll bewusst klein bleiben.

### Dashboard

- heutige Aufgaben
- anstehende Termine
- offene Kundenanfragen
- laufende Projekte
- wichtige Hinweise
- KI-gestützte nächste Schritte

### Kundenverwaltung

- Stammdaten
- Ansprechpartner
- Notizen
- Kommunikationshistorie
- zugehörige Projekte und Aufgaben

### Projekte

- Projektstatus
- Aufgaben
- Meilensteine
- Dateien und Notizen
- Verknüpfung mit Kunden

### Aufgaben

- Titel und Beschreibung
- Fälligkeit
- Priorität
- Status
- Verknüpfung mit Kunde oder Projekt

### KI-Assistent

- Fragen zum vorhandenen Unternehmenskontext beantworten
- Tagesübersicht erstellen
- Aufgaben und nächste Schritte vorschlagen
- Texte und Antworten vorbereiten
- noch keine kritischen Aktionen ohne Bestätigung ausführen

## Spätere Ausbaustufen

### Version 0.5

- Angebote
- Rechnungen
- PDF-Erstellung
- Dokumentenablage
- Kalenderanbindung
- Erinnerungen
- einfache Zeiterfassung

### Version 1.0

- proaktive Hinweise
- intelligente Follow-ups
- automatische Zuordnung von Dokumenten
- Auswertungen zu Umsatz, Projekten und Kunden
- nachvollziehbare Unternehmenshistorie
- rollenbasierte Sicherheits- und Freigabemechanismen

### Version 2.0

Mögliche Integrationen:

- Gmail
- Google Kalender
- GitHub
- Cloudspeicher
- Buchhaltungssoftware
- Banking-Schnittstellen
- Website und Shop
- Social-Media-Plattformen
- Automatisierungen über n8n oder vergleichbare Systeme

## Langfristige Module

- CRM
- Projektmanagement
- Aufgabenmanagement
- Angebote und Rechnungen
- Beleg- und Dokumentenverwaltung
- Fristen und Erinnerungen
- E-Mail-Zentrale
- Kalender
- Zeiterfassung
- Wissensdatenbank
- Website- und Content-Verwaltung
- Social-Media-Planung
- Kennzahlen und Berichte
- KI-gestützte Geschäftsentscheidungen

## Technische Leitidee

Die genaue Architektur wird erst nach der MVP-Definition festgelegt. Eine mögliche Ausgangsbasis:

- Frontend: React / Next.js
- Backend und Datenbank: Supabase oder eine vergleichbare Plattform
- Authentifizierung und Dateispeicher: Supabase oder spezialisierte Dienste
- KI-Modelle: je nach Aufgabe OpenAI, Claude und gegebenenfalls weitere Modelle
- Automatisierung: n8n
- Versionsverwaltung: GitHub
- Deployment: beispielsweise Vercel und Supabase
- Projektdokumentation: Markdown im Repository, später optional mit Obsidian

Die Architektur soll Anbieterabhängigkeiten begrenzen und einzelne Komponenten austauschbar halten.

## Sicherheits- und Rechtsgrundsätze

Da die Anwendung geschäftliche und teilweise sensible Daten verarbeitet, müssen früh berücksichtigt werden:

- Datenschutz und DSGVO
- sichere Authentifizierung
- Verschlüsselung und Zugriffskontrollen
- Backups und Wiederherstellung
- Protokollierung kritischer Aktionen
- klare Freigaben vor dem Versand von E-Mails, Rechnungen oder Zahlungen
- keine unkontrollierten steuerlichen oder rechtlichen Aussagen
- Exportierbarkeit der eigenen Daten

Die App soll bei Verwaltungsaufgaben unterstützen, aber Steuerberater, Rechtsberatung oder verbindliche Behördenauskünfte nicht vortäuschen.

## Entwicklungsansatz

Das Projekt wird **nebenbei und schrittweise** aufgebaut.

Der erste Maßstab ist nicht die Anzahl der Funktionen, sondern ob eine kleine Version zuverlässig im eigenen Alltag hilft.

Vorgesehener Ablauf:

1. konkrete Probleme und tägliche Abläufe sammeln
2. Zielgruppe und Hauptnutzen schärfen
3. MVP-Funktionen priorisieren
4. Datenmodell und Benutzerabläufe entwerfen
5. klickbaren Prototyp erstellen
6. erste funktionsfähige Version bauen
7. selbst täglich testen
8. erst danach weitere Module ergänzen

## Nicht-Ziele der ersten Version

- vollständiger Ersatz für DATEV, Lexoffice oder Steuerberatung
- vollständiges ERP-System
- vollautomatische Bankgeschäfte
- unkontrolliertes Versenden geschäftlicher Nachrichten
- alle denkbaren Integrationen gleichzeitig
- Entwicklung für große Unternehmen

## Erste offene Entscheidungen

- endgültiger Projektname
- exakte Hauptzielgruppe
- wichtigster täglicher Anwendungsfall
- Web-App oder zusätzlich mobile App
- Eigenentwicklung, Emergent, Claude Code oder eine Kombination
- Datenhaltung und Hosting
- welche bestehenden Dienste zuerst integriert werden
- welche Aktionen die KI selbstständig ausführen darf

## Nächster sinnvoller Schritt

Eine separate MVP-Spezifikation erstellen, die beantwortet:

- Wer ist der erste konkrete Nutzer?
- Welche fünf Probleme treten jede Woche auf?
- Welche drei Funktionen würden sofort Zeit sparen?
- Welche Daten benötigt die App dafür?
- Wie sieht ein typischer Arbeitstag innerhalb der App aus?

---

**Projektstatus:** Idee dokumentiert – Konzeptphase  
**Arbeitsweise:** Nebenprojekt, iterativ und ohne unnötigen Zeitdruck  
**Erstellt:** 24. Juli 2026

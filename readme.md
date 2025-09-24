# Daily Doc App

Deine persönliche Webanwendung für tägliche Dokumentation, Aufgabenmanagement und Analyse. Erfasse deine Aktivitäten, verwalte To-Dos und visualisiere deinen Fortschritt – alles lokal auf deinem Rechner.

---

## Key-Features

- **Multi-Kontext-System:** Führe separate Dokumentationen für verschiedene Lebensbereiche (z.B. "Arbeit", "Privat", "Studium"). Jeder Kontext hat seine eigenen Daten und Projekte.
- **Detaillierte Zeiterfassung:** Dokumentiere deine täglichen Einträge mit anpassbaren Tags, Notizen und der exakten aufgewendeten Zeit.
- **Integriertes To-Do-Management:** Organisiere deine Aufgaben in Projekten, setze Prioritäten (Dringend, Wichtig, Optional) und verfolge Fälligkeitsdaten.
- **Visuelle Analyse:** Gewinne Einblicke in deine Zeitnutzung durch interaktive Balken- und Radardiagramme in der Übersichtsseite.
- **Lokale Datenspeicherung:** Deine Daten gehören dir. Alles wird in einfachen JSON-Dateien im `data`-Verzeichnis gespeichert.
- **Einfaches Setup:** Starte schnell und unkompliziert mit den mitgelieferten Installationsskripten für Windows und Linux/macOS.

---

## Setup & Installation

**Voraussetzungen:**

- **Python 3** muss auf deinem System installiert sein.
- **Node.js und npm** werden für das Styling mit Tailwind CSS benötigt.

### Für Windows

1.  Klone das Repository oder lade es als ZIP-Datei herunter.
2.  Führe die `install.bat`-Datei per Doppelklick aus. Das Skript richtet alles Notwendige ein.

### Für Linux / macOS

1.  Klone das Repository.
2.  Öffne ein Terminal im Projektverzeichnis und führe das Installationsskript aus:
    ```bash
    bash install.sh
    ```

---

## Anwendung starten

### Windows

Der einfachste Weg ist, die `start-doku.bat` per Doppelklick auszuführen. Es gibt auch eine `start-doku-silent.vbs`, die das schwarze Konsolenfenster im Hintergrund ausführt.

### Linux / macOS

1.  Aktiviere die virtuelle Umgebung:
    ```bash
    source venv/bin/activate
    ```
2.  Starte den Flask-Server:
    ```bash
    python app.py
    ```

### Im Browser öffnen

Nach dem Start ist die Anwendung unter folgender Adresse in deinem Browser erreichbar:
**[http://127.0.0.1:5050](http://127.0.0.1:5050)**

---

## 🛠️ Technologie-Stack

- **Backend:** Python mit Flask
- **Frontend:** HTML, Tailwind CSS, Chart.js für die Diagramme
- **Datenbank:** Lokale JSON-Dateien

# 🗂️ Tägliche Dokumentation & Analyse

**Eine einfache, selbst gehostete Webanwendung zur strukturierten Dokumentation des Alltags.**

Die Anwendung wird lokal über ein Python-Flask-Skript ausgeführt und ermöglicht die Erfassung von Tätigkeiten, Notizen sowie die Erstellung visueller Berichte.

> 📷 *Hier könntest du einen Screenshot deiner fertigen Anwendung einfügen.*

---

## ✨ Features

* 🗓️ **Kalenderfunktion**
  Wähle einen beliebigen Tag zur Dokumentation aus.

* 🏷️ **Dynamische Tags**
  Erfasse Tätigkeiten als Tags mit prozentualer Gewichtung und ordne sie Kategorien zu.

* 📝 **Notizen pro Tätigkeit**
  Füge zu jeder einzelnen Tätigkeit eine spezifische Notiz hinzu.

* 📊 **Diagramme & Auswertungen**

  * **Balkendiagramm**: Zeigt die Verteilung der Tätigkeiten über einen wählbaren Zeitraum.
  * **Spinnendiagramm**: Visualisiert die Schwerpunkte der Oberkategorien (Technik, Analyse, etc.).

* 🧾 **Berichtsgenerator**
  Erstelle auf Knopfdruck HTML-Berichte für Wochen, Monate oder den gesamten Zeitraum.

* 💾 **Automatisches Speichern**
  Alle Daten werden automatisch in einer lokalen `doku.json`-Datei im Projektverzeichnis gesichert.

---

## 📁 Projektstruktur

```
├── app.py              # Der Python-Flask-Server
├── doku.json           # Deine Datenbank (wird automatisch erstellt)
├── install.bat         # Installationsskript für Windows
├── install.sh          # Installationsskript für Linux/macOS
├── README.md           # Diese Datei
├── requirements.txt    # Python-Abhängigkeiten
└── templates/
    └── index.html      # Das Frontend der Anwendung
```

---

## 🚀 Setup & Installation

### Voraussetzung

* Python 3 muss auf deinem System installiert sein.

### Für Linux / macOS

1. Klone das Repository (oder lade es als ZIP herunter):

   ```bash
   git clone https://github.com/DEIN-BENUTZERNAME/DEIN-REPO-NAME.git
   cd DEIN-REPO-NAME
   ```

2. Führe das Installationsskript aus:

   ```bash
   bash install.sh
   ```

   Das Skript erstellt eine virtuelle Umgebung und installiert die notwendigen Pakete.

### Für Windows

1. Klone das Repository (oder lade es als ZIP herunter).

2. Führe das Installationsskript aus:

   * Doppelklick auf die `install.bat`-Datei.
   * Die Datei erstellt eine virtuelle Umgebung und installiert alle Abhängigkeiten.

---

## ▶️ Anwendung starten

### Virtuelle Umgebung aktivieren:

* **Linux/macOS**:

  ```bash
  source venv/bin/activate
  ```

* **Windows**:

  ```cmd
  .\venv\Scripts\activate
  ```

### Flask-Server starten:

```bash
python app.py
```

### Anwendung im Browser öffnen:

[http://127.0.0.1:5000](http://127.0.0.1:5000)

---

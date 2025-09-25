# Daily Doc App

Eine lokale Webanwendung zur täglichen Dokumentation von Aufgaben, Arbeitszeiten und To-Dos. Perfekt für Entwickler, Studenten und alle, die ihre täglichen Aktivitäten strukturiert erfassen und auswerten möchten.

## Features

- **Kontext-Management:** Trenne verschiedene Lebensbereiche (z.B. Arbeit, Studium, Privat) in eigenständigen Dokumentationen.
- **Tägliche Erfassung:** Protokolliere deine Aktivitäten mit Tags, Notizen und Zeiterfassung.
- **To-Do-Liste:** Verwalte deine Aufgaben mit Prioritäten, Projekten, Fälligkeitsdaten und Tags.
- **Dynamische Auswertungen:** Visualisiere deine erfassten Daten mit Diagrammen in der Übersichtsseite.
- **Flexible Datenhaltung:** Wähle selbst, wo deine Dokumentationsdateien gespeichert werden sollen – ideal für Cloud-Sync (z.B. via Nextcloud, Dropbox).

## Installation & Start

Die Einrichtung erfolgt über Skripte, die alle Abhängigkeiten (Python & Node.js) für dich verwalten.

### Für Windows-Benutzer

1.  **Einrichtung (einmalig):**

    - Führe die Datei `install.bat` aus.
    - Dieses Skript erstellt eine virtuelle Python-Umgebung, installiert alle nötigen Pakete aus `requirements.txt` und richtet Tailwind CSS ein.

2.  **Anwendung starten:**

    - **Normaler Start:** Führe `start-doku.bat` aus. Ein Konsolenfenster öffnet sich, das den Server-Log anzeigt.
    - **Stiller Start:** Führe `start-doku-silent.vbs` aus. Die Anwendung startet im Hintergrund ohne sichtbares Konsolenfenster.

    Die Anwendung ist anschließend in deinem Browser unter `http://127.0.0.1:5051` erreichbar.

### Für Linux-Benutzer (z.B. Arch / EndeavourOS)

1.  **Skripte ausführbar machen (einmalig):**

    ```
    chmod +x install.sh
    chmod +x start-doku.sh
    ```

2.  **Einrichtung (einmalig):**

    - Führe das Installationsskript aus:
      ```
      ./install.sh
      ```
    - Dieses Skript erledigt alles Notwendige, von der virtuellen Umgebung bis zur Einrichtung von Tailwind CSS.

3.  **Anwendung starten:**

    - Führe das Start-Skript aus:
      ```
      ./start-doku.sh
      ```
    - Die Anwendung ist anschließend in deinem Browser unter `http://127.0.0.1:5051` erreichbar.

## Datenhaltung

Die Anwendung trennt zwischen Konfiguration und Nutzerdaten, um Flexibilität zu gewährleisten.

- **Konfigurationsdatei (`config.json`):**

  - Diese Datei speichert den Pfad zu deinem Datenordner.
  - Sie wird an einem benutzerspezifischen Ort abgelegt, um Berechtigungsprobleme bei installierten Versionen zu vermeiden (`%APPDATA%\DailyDocApp` unter Windows).

- **Nutzerdaten (`doku_*.json`):**

  - Das sind deine eigentlichen Dokumentationsdateien.
  - Standardmäßig werden sie im Ordner `Dokumente/DailyDocApp` in deinem Benutzerverzeichnis gespeichert.
  - **Du kannst diesen Pfad jederzeit innerhalb der Anwendung über den "Datenpfad ändern"-Button anpassen\!**

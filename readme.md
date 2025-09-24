# Tägliche Dokumentation & Analyse

Eine einfache, selbst gehostete Webanwendung zur strukturierten Dokumentation des Alltags.

Die Anwendung wird lokal über ein Python-Flask-Skript ausgeführt und ermöglicht die Erfassung von Tätigkeiten, Notizen sowie die Erstellung visueller Berichte.

---

## Features

- **Kalenderfunktion**
  Wähle einen beliebigen Tag zur Dokumentation aus.

- **Dynamische Tags**
  Erfasse Tätigkeiten als Tags mit prozentualer Gewichtung und ordne sie Kategorien zu.

- **Notizen pro Tätigkeit**
  Füge zu jeder einzelnen Tätigkeit eine spezifische Notiz hinzu.

- **Diagramme & Auswertungen**

  - **Balkendiagramm**: Zeigt die Verteilung der Tätigkeiten über einen wählbaren Zeitraum.
  - **Spinnendiagramm**: Visualisiert die Schwerpunkte der Oberkategorien (Technik, Analyse, etc.).

- **Berichtsgenerator**
  Erstelle auf Knopfdruck HTML-Berichte für Wochen, Monate oder den gesamten Zeitraum.

- **Automatisches Speichern**
  Alle Daten werden automatisch in einer lokalen `doku.json`-Datei im Projektverzeichnis gesichert.

---

## Projektstruktur

├── app.py # Der Python-Flask-Server
├── doku.json # Deine Datenbank (wird automatisch erstellt)
├── install.bat # Installationsskript für Windows
├── install.sh # Installationsskript für Linux/macOS
├── README.md # Diese Datei
├── requirements.txt # Python-Abhängigkeiten
└── templates/
└── index.html # Das Frontend der Anwendung

---

## Setup & Installation

### Voraussetzung

- Python 3 muss auf deinem System installiert sein.

### Für Linux / macOS

1.  Klone das Repository oder lade es als ZIP-Datei herunter und entpacke es.
2.  Öffne ein Terminal im Projektverzeichnis.
3.  Führe das Installationsskript aus. Es erstellt eine virtuelle Umgebung und installiert alle notwendigen Pakete.

    ```bash
    bash install.sh
    ```

### Für Windows

1.  Klone das Repository oder lade es als ZIP-Datei herunter und entpacke es.
2.  Führe das Installationsskript aus, indem du auf die `install.bat`-Datei doppelklickst.
3.  Das Skript erstellt eine virtuelle Umgebung (`venv`) und installiert alle Abhängigkeiten automatisch.

---

## Anwendung starten

Um die Anwendung zu nutzen, musst du zuerst die virtuelle Umgebung aktivieren und dann den Server starten.

### 1. Virtuelle Umgebung aktivieren

- **Linux/macOS**:

  ```bash
  source venv/bin/activate
  ```

- **Windows (CMD/PowerShell)**:

  ```cmd
  .\venv\Scripts\activate
  ```

### 2. Flask-Server starten

Nachdem die virtuelle Umgebung aktiviert ist, starte die Anwendung mit folgendem Befehl:

````bash
python app.py

3. Anwendung im Browser öffnen

Öffne deinen Webbrowser und navigiere zu der folgenden Adresse:

http://127.0.0.1:5050


---

### `templates/` Verzeichnis

#### `base.html`
```html
<!DOCTYPE html>
<html lang="de">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{% block title %}Tägliche Dokumentation{% endblock %}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="{{ url_for('static', filename='css/style.css') }}">
    <link rel="icon" href="data:,">
</head>

<body class="text-gray-800">

    <div id="notification"
        class="fixed top-5 right-5 bg-green-500 text-white py-2 px-4 rounded-lg shadow-lg transform translate-x-full opacity-0 z-50">
    </div>

    <div class="container mx-auto p-4 md:p-6 lg:p-8">
        <header class="mb-8 text-center">
            <h1 class="text-4xl font-bold text-gray-900">Tägliche Dokumentation &amp; To-Do</h1>
            <p class="text-lg text-gray-600 mt-2">Erfasse und analysiere deine täglichen Aktivitäten und Aufgaben.</p>
        </header>

        <div class="mb-8 p-2 bg-white rounded-xl shadow-md max-w-lg mx-auto">
            <nav class="flex justify-center space-x-4">
                <a href="{{ url_for('index') }}"
                    class="px-4 py-2 rounded-lg font-semibold {% if request.path == '/' %}bg-indigo-600 text-white{% else %}text-gray-600 hover:bg-gray-200{% endif %}">Dokumentation</a>
                <a href="{{ url_for('todo') }}"
                    class="px-4 py-2 rounded-lg font-semibold {% if request.path == '/todo' %}bg-indigo-600 text-white{% else %}text-gray-600 hover:bg-gray-200{% endif %}">To-Do
                    Liste</a>
                <a href="{{ url_for('overview') }}"
                    class="px-4 py-2 rounded-lg font-semibold {% if request.path == '/overview' %}bg-indigo-600 text-white{% else %}text-gray-600 hover:bg-gray-200{% endif %}">Übersicht</a>
            </nav>
        </div>

        {% block content %}{% endblock %}
    </div>

    {% block scripts %}{% endblock %}
</body>

</html>
````

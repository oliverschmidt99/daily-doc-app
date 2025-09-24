"""
Haupt-Anwendung für die tägliche Dokumentation.
Verwaltet mehrere Dokumentations-Kontexte (z.B. Arbeit, Privat).
"""

import os
import json
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)
DATA_DIR = "data"  # Ein Ordner für alle JSON-Dateien


def get_context_file(context):
    """Gibt den Dateipfad für einen gegebenen Kontext zurück."""
    if not context or not context.strip():
        context = "default"
    # Erstellt eine sichere ID aus dem Kontextnamen
    safe_context = "".join(c for c in context if c.isalnum())
    return os.path.join(DATA_DIR, f"doku_{safe_context}.json")


def read_data(context="default"):
    """Liest die JSON-Daten für einen spezifischen Kontext."""
    data_file = get_context_file(context)
    default_data = {
        "contextName": context.capitalize(),
        "appData": {},
        "tagCategoryMap": {},
        "projects": [],
        "todos": [],
    }
    if not os.path.exists(data_file):
        if not os.path.exists(DATA_DIR):
            os.makedirs(DATA_DIR)
        return default_data
    try:
        with open(data_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            # Stellt sicher, dass alle Hauptschlüssel vorhanden sind
            data.setdefault("contextName", context.capitalize())
            data.setdefault("projects", [])
            data.setdefault("todos", [])
            data.setdefault("tagCategoryMap", {})
            data.setdefault("appData", {})
            return data
    except (IOError, json.JSONDecodeError):
        return default_data


def write_data(data, context="default"):
    """Schreibt die Daten für einen spezifischen Kontext."""
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
    data_file = get_context_file(context)
    try:
        with open(data_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        return True
    except IOError:
        return False


@app.route("/create_context", methods=["POST"])
def create_context():
    """Erstellt eine neue Kontext-JSON-Datei sofort."""
    data = request.get_json()
    context_id = data.get("id")
    context_name = data.get("name")

    if not context_id or not context_name:
        return (
            jsonify({"status": "error", "message": "ID und Name sind erforderlich"}),
            400,
        )

    data_file = get_context_file(context_id)
    if os.path.exists(data_file):
        return jsonify({"status": "error", "message": "Kontext existiert bereits"}), 409

    # Standard-Datenstruktur für eine neue Doku
    default_data = {
        "contextName": context_name,
        "appData": {},
        "tagCategoryMap": {},
        "projects": [],
        "todos": [],
    }
    if write_data(default_data, context_id):
        return jsonify({"status": "success", "message": "Kontext erstellt"})
    return (
        jsonify({"status": "error", "message": "Fehler beim Erstellen der Datei"}),
        500,
    )


@app.route("/")
def index():
    """Zeigt die To-Do-Listen-Seite als Hauptseite an."""
    return render_template("todo.html")


@app.route("/documentation")
def documentation():
    """Zeigt die Dokumentations-Seite an."""
    return render_template("documentation.html")


@app.route("/overview")
def overview():
    """Zeigt die Übersichts-Seite an."""
    return render_template("overview.html")


@app.route("/contexts", methods=["GET"])
def get_contexts():
    """Listet alle verfügbaren Kontexte mit ihren Anzeigenamen auf."""
    contexts_list = []
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)

    files = [
        f for f in os.listdir(DATA_DIR) if f.startswith("doku_") and f.endswith(".json")
    ]
    for f in files:
        context_id = f.replace("doku_", "").replace(".json", "")
        data = read_data(context_id)
        context_name = data.get("contextName", context_id.capitalize())
        contexts_list.append({"id": context_id, "name": context_name})

    if not contexts_list:
        # Erstellt eine Standard-Doku, falls keine existiert
        write_data({"contextName": "Default"}, "default")
        contexts_list.append({"id": "default", "name": "Default"})

    return jsonify(sorted(contexts_list, key=lambda x: x["name"]))


@app.route("/load/<context>", methods=["GET"])
def load_data(context):
    """Lädt alle Daten für einen spezifischen Kontext."""
    return jsonify(read_data(context))


@app.route("/save/<context>", methods=["POST"])
def save_data(context):
    """Speichert alle Daten für einen spezifischen Kontext."""
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "Keine Daten empfangen"}), 400

    # Stellt sicher, dass der Anzeigename beim Speichern erhalten bleibt
    data.setdefault("contextName", data.get("contextName", context.capitalize()))
    data.setdefault("projects", [])
    data.setdefault("todos", [])
    data.setdefault("tagCategoryMap", {})
    data.setdefault("appData", {})

    if write_data(data, context):
        return jsonify({"status": "success", "message": "Daten gespeichert"})
    return jsonify({"status": "error", "message": "Fehler beim Speichern"}), 500


if __name__ == "__main__":
    app.run(port=5050, debug=True)

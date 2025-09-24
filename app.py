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
    safe_context = "".join(c for c in context if c.isalnum())
    return os.path.join(DATA_DIR, f"doku_{safe_context}.json")


def read_data(context="default"):
    """Liest die JSON-Daten für einen spezifischen Kontext."""
    data_file = get_context_file(context)
    if not os.path.exists(data_file):
        if not os.path.exists(DATA_DIR):
            os.makedirs(DATA_DIR)
        return {"appData": {}, "tagCategoryMap": {}, "projects": [], "todos": []}
    try:
        with open(data_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            data.setdefault("projects", [])
            data.setdefault("todos", [])
            data.setdefault("tagCategoryMap", {})
            data.setdefault("appData", {})
            return data
    except (IOError, json.JSONDecodeError):
        return {"appData": {}, "tagCategoryMap": {}, "projects": [], "todos": []}


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
    """Listet alle verfügbaren Kontexte auf."""
    if not os.path.exists(DATA_DIR):
        return jsonify(["default"])
    files = [
        f for f in os.listdir(DATA_DIR) if f.startswith("doku_") and f.endswith(".json")
    ]
    contexts = [f.replace("doku_", "").replace(".json", "") for f in files]
    if not contexts:
        return jsonify(["default"])
    return jsonify(sorted(contexts))


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

    data.setdefault("projects", [])
    data.setdefault("todos", [])
    data.setdefault("tagCategoryMap", {})
    data.setdefault("appData", {})

    if write_data(data, context):
        return jsonify({"status": "success", "message": "Daten gespeichert"})

    return jsonify({"status": "error", "message": "Fehler beim Speichern"}), 500


if __name__ == "__main__":
    app.run(port=5050, debug=True)

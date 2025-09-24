"""
Haupt-Anwendung für die tägliche Dokumentation.

Diese Flask-Anwendung stellt die Endpunkte für das Frontend bereit,
um Daten zu laden und zu speichern.
"""

import os
import json
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)
DATA_FILE = "doku.json"


@app.route("/")
def index():
    """Zeigt die Hauptseite (Dokumentation) an."""
    return render_template("documentation.html")


@app.route("/todo")
def todo():
    """Zeigt die To-Do-Seite an."""
    return render_template("todo.html")


@app.route("/overview")
def overview():
    """Zeigt die Übersichts-Seite an."""
    return render_template("overview.html")


@app.route("/load", methods=["GET"])
def load_data():
    """Lädt alle Daten (Doku, Tags, Projekte, Todos) aus der JSON-Datei."""
    if not os.path.exists(DATA_FILE):
        # Erstellt eine leere Standardstruktur, falls die Datei nicht existiert
        return jsonify(
            {"appData": {}, "tagCategoryMap": {}, "projects": [], "todos": []}
        )
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        # Stellt sicher, dass alle Schlüssel vorhanden sind
        data.setdefault("projects", [])
        data.setdefault("todos", [])
        return jsonify(data)
    except (IOError, json.JSONDecodeError):
        return jsonify(
            {"appData": {}, "tagCategoryMap": {}, "projects": [], "todos": []}
        )


@app.route("/save", methods=["POST"])
def save_data():
    """Speichert alle Daten (Doku, Tags, Projekte, Todos)."""
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "Keine Daten empfangen"}), 400
    try:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        return jsonify({"status": "success", "message": "Daten gespeichert"})
    except IOError:
        return jsonify({"status": "error", "message": "Fehler beim Speichern"}), 500


if __name__ == "__main__":
    app.run(port=5050, debug=True)

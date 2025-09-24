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


def read_data():
    """Liest die JSON-Daten aus der Datei und stellt Standardwerte sicher."""
    if not os.path.exists(DATA_FILE):
        return {"appData": {}, "tagCategoryMap": {}, "projects": [], "todos": []}
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            data.setdefault("projects", [])
            data.setdefault("todos", [])
            data.setdefault("tagCategoryMap", {})
            data.setdefault("appData", {})
            return data
    except (IOError, json.JSONDecodeError):
        return {"appData": {}, "tagCategoryMap": {}, "projects": [], "todos": []}


def write_data(data):
    """Schreibt die übergebenen Daten in die JSON-Datei."""
    try:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        return True
    except IOError:
        return False


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
    return jsonify(read_data())


@app.route("/save", methods=["POST"])
def save_data():
    """Speichert alle Daten (Doku, Tags, Projekte, Todos)."""
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "Keine Daten empfangen"}), 400

    # Stelle sicher, dass alle Hauptschlüssel vorhanden sind, bevor gespeichert wird
    data.setdefault("projects", [])
    data.setdefault("todos", [])
    data.setdefault("tagCategoryMap", {})
    data.setdefault("appData", {})

    if write_data(data):
        return jsonify({"status": "success", "message": "Daten gespeichert"})

    return jsonify({"status": "error", "message": "Fehler beim Speichern"}), 500


if __name__ == "__main__":
    app.run(port=5050, debug=True)

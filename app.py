"""
Haupt-Anwendung für die tägliche Dokumentation.
Verwaltet mehrere Dokumentations-Kontexte (z.B. Arbeit, Privat).
"""

import os
import json
import tkinter as tk
from tkinter import messagebox
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# --- DATENORDNER IM BENUTZERVERZEICHNIS ---
USER_HOME = os.path.expanduser("~")
DATA_DIR = os.path.join(USER_HOME, "DailyDocApp", "data")


# --- FUNKTION FÜR DIE ERFOLGSMELDUNG ---
def show_first_run_message():
    """Zeigt eine Willkommensnachricht beim ersten Start an."""
    root = tk.Tk()
    root.withdraw()  # Versteckt das leere Hauptfenster von Tkinter
    messagebox.showinfo(
        "Einrichtung erfolgreich",
        f"Willkommen zur Daily Doc App!\n\nDeine Daten werden sicher im folgenden Ordner gespeichert:\n{DATA_DIR}",
    )
    root.destroy()


# Standard-Stile für Kategorien
DEFAULT_CATEGORY_STYLES = {
    "Technik": {"color": "#ef4444"},
    "Analyse": {"color": "#3b82f6"},
    "Dokumentation": {"color": "#f59e0b"},
    "Organisation": {"color": "#10b981"},
    "Soziales": {"color": "#8b5cf6"},
    "Sonstiges": {"color": "#6b7280"},
}


def get_context_file(context):
    if not context or not context.strip():
        context = "default"
    safe_context = "".join(c for c in context if c.isalnum())
    return os.path.join(DATA_DIR, f"doku_{safe_context}.json")


def read_data(context="default"):
    data_file = get_context_file(context)
    default_data = {
        "contextName": context.capitalize(),
        "appData": {},
        "tagCategoryMap": {},
        "projects": [],
        "todos": [],
        "categoryStyles": DEFAULT_CATEGORY_STYLES,
    }
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
        # Da der Ordner neu ist, ist dies der erste Start
        show_first_run_message()

    if not os.path.exists(data_file):
        return default_data
    try:
        with open(data_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            data.setdefault("contextName", context.capitalize())
            data.setdefault("projects", [])
            data.setdefault("todos", [])
            data.setdefault("tagCategoryMap", {})
            data.setdefault("appData", {})
            if "categoryStyles" not in data:
                data["categoryStyles"] = DEFAULT_CATEGORY_STYLES
            else:
                for cat, style in DEFAULT_CATEGORY_STYLES.items():
                    data["categoryStyles"].setdefault(cat, style)
            return data
    except (IOError, json.JSONDecodeError):
        return default_data


def write_data(data, context="default"):
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
    data_file = get_context_file(context)
    try:
        with open(data_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        return True
    except IOError:
        return False


# Alle @app.route(...) Funktionen bleiben unverändert
@app.route("/")
def index():
    return render_template("todo.html")


@app.route("/documentation")
def documentation():
    return render_template("documentation.html")


@app.route("/overview")
def overview():
    return render_template("overview.html")


@app.route("/contexts", methods=["GET"])
def get_contexts():
    contexts_list = []
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
    files = [
        f for f in os.listdir(DATA_DIR) if f.startswith("doku_") and f.endswith(".json")
    ]
    for f in files:
        context_id = f.replace("doku_", "").replace(".json", "")
        data = read_data(context_id)
        contexts_list.append(
            {"id": context_id, "name": data.get("contextName", context_id.capitalize())}
        )
    if not contexts_list:
        write_data(
            {"contextName": "Default", "categoryStyles": DEFAULT_CATEGORY_STYLES},
            "default",
        )
        contexts_list.append({"id": "default", "name": "Default"})
    return jsonify(sorted(contexts_list, key=lambda x: x["name"]))


@app.route("/create_context", methods=["POST"])
def create_context():
    data = request.get_json()
    context_id, context_name = data.get("id"), data.get("name")
    if not context_id or not context_name:
        return (
            jsonify({"status": "error", "message": "ID und Name sind erforderlich"}),
            400,
        )
    if os.path.exists(get_context_file(context_id)):
        return jsonify({"status": "error", "message": "Kontext existiert bereits"}), 409
    default_data = {
        "contextName": context_name,
        "appData": {},
        "tagCategoryMap": {},
        "projects": [],
        "todos": [],
        "categoryStyles": DEFAULT_CATEGORY_STYLES,
    }
    if write_data(default_data, context_id):
        return jsonify({"status": "success", "message": "Kontext erstellt"})
    return (
        jsonify({"status": "error", "message": "Fehler beim Erstellen der Datei"}),
        500,
    )


@app.route("/load/<context>", methods=["GET"])
def load_data(context):
    return jsonify(read_data(context))


@app.route("/save/<context>", methods=["POST"])
def save_data(context):
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "Keine Daten empfangen"}), 400
    data.setdefault("contextName", data.get("contextName", context.capitalize()))
    data.setdefault("categoryStyles", DEFAULT_CATEGORY_STYLES)
    if write_data(data, context):
        return jsonify({"status": "success", "message": "Daten gespeichert"})
    return jsonify({"status": "error", "message": "Fehler beim Speichern"}), 500


@app.route("/edit_tag/<context>", methods=["POST"])
def edit_tag(context):
    data = request.get_json()
    old_name, new_name, new_category = (
        data.get("oldName"),
        data.get("newName"),
        data.get("newCategory"),
    )
    if not all([old_name, new_name, new_category]):
        return jsonify({"status": "error", "message": "Fehlende Daten"}), 400
    doku_data = read_data(context)
    tag_map = doku_data.get("tagCategoryMap", {})
    if old_name in tag_map:
        if old_name != new_name:
            if new_name in tag_map:
                return (
                    jsonify(
                        {
                            "status": "error",
                            "message": "Neuer Tag-Name existiert bereits",
                        }
                    ),
                    409,
                )
            tag_map[new_name] = tag_map.pop(old_name)
        tag_map[new_name] = new_category
    for item_list in [
        doku_data.get("todos", []),
        *[d.get("entries", []) for d in doku_data.get("appData", {}).values()],
    ]:
        for item in item_list:
            key = "tags" if "tags" in item else "tagNames"
            if key in item and old_name in item[key]:
                item[key] = [new_name if t == old_name else t for t in item[key]]
    if write_data(doku_data, context):
        return jsonify({"status": "success", "message": "Tag erfolgreich aktualisiert"})
    return jsonify({"status": "error", "message": "Fehler beim Speichern"}), 500


@app.route("/delete_tag/<context>", methods=["POST"])
def delete_tag(context):
    tag_name = request.get_json().get("tagName")
    if not tag_name:
        return jsonify({"status": "error", "message": "Tag-Name fehlt"}), 400
    doku_data = read_data(context)
    if tag_name in doku_data.get("tagCategoryMap", {}):
        del doku_data["tagCategoryMap"][tag_name]
    for item_list in [
        doku_data.get("todos", []),
        *[d.get("entries", []) for d in doku_data.get("appData", {}).values()],
    ]:
        for item in item_list:
            key = "tags" if "tags" in item else "tagNames"
            if key in item and tag_name in item[key]:
                item[key] = [t for t in item[key] if t != tag_name]
    if write_data(doku_data, context):
        return jsonify({"status": "success", "message": "Tag erfolgreich gelöscht"})
    return jsonify({"status": "error", "message": "Fehler beim Speichern"}), 500


if __name__ == "__main__":
    from waitress import serve

    # Prüfen, ob dies der erste Start ist, BEVOR der Server startet
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
        show_first_run_message()

    serve(app, host="0.0.0.0", port=5050)

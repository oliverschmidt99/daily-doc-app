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

# --- DATENORDNER DYNAMISCH FESTLEGEN ---
# Standardpfad im Benutzerverzeichnis.
app.config["DATA_DIR"] = os.path.expanduser("~") + "/DailyDocApp/data"


# --- FUNKTION FÜR DIE ERFOLGSMELDUNG (nicht mehr für den Start) ---
def show_first_run_message():
    """Zeigt eine Willkommensnachricht beim ersten Start an."""
    root = tk.Tk()
    root.withdraw()  # Versteckt das leere Hauptfenster von Tkinter
    messagebox.showinfo(
        "Einrichtung erfolgreich",
        f"Willkommen zur Daily Doc App!\n\nDeine Daten werden sicher im folgenden Ordner gespeichert:\n"
        f"{app.config['DATA_DIR']}",
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
    """Gibt den vollständigen Pfad zur JSON-Datei eines Kontextes zurück."""
    if not context or not context.strip():
        context = "default"
    safe_context = "".join(c for c in context if c.isalnum())
    return os.path.join(app.config["DATA_DIR"], f"doku_{safe_context}.json")


def read_data(context="default"):
    """Liest Daten aus einer Kontext-Datei oder gibt Standarddaten zurück."""
    data_file = get_context_file(context)
    default_data = {
        "contextName": context.capitalize(),
        "appData": {},
        "tagCategoryMap": {},
        "projects": [],
        "todos": [],
        "categoryStyles": DEFAULT_CATEGORY_STYLES,
    }
    # Erstelle den Datenordner, falls er nicht existiert
    if not os.path.exists(app.config["DATA_DIR"]):
        os.makedirs(app.config["DATA_DIR"])

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
    """Schreibt Daten in eine Kontext-Datei."""
    if not os.path.exists(app.config["DATA_DIR"]):
        os.makedirs(app.config["DATA_DIR"])
    data_file = get_context_file(context)
    try:
        with open(data_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        return True
    except IOError:
        return False


@app.route("/set_data_path", methods=["POST"])
def set_data_path():
    """Setzt den Datenpfad basierend auf dem POST-Request."""
    data = request.get_json()
    new_path = data.get("path")
    if not new_path:
        return (
            jsonify({"status": "error", "message": "Pfad fehlt."}),
            400,
        )
    # Entferne alle Anführungszeichen, die in der Eingabe enthalten sein könnten.
    new_path = new_path.strip().replace('"', "")
    # Sicherstellen, dass der Pfad absolut ist
    new_path = os.path.abspath(os.path.expanduser(new_path))
    try:
        if not os.path.exists(new_path):
            os.makedirs(new_path)
        app.config["DATA_DIR"] = new_path
        print(f"Neuer Datenpfad: {app.config['DATA_DIR']}")
        return jsonify({"status": "success", "message": "Datenpfad aktualisiert"})
    except (IOError, OSError) as e:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": f"Fehler beim Festlegen des Pfades: {str(e)}",
                }
            ),
            500,
        )


@app.route("/")
def index():
    """Rendert die To-Do-Liste-Seite."""
    return render_template("todo.html")


@app.route("/documentation")
def documentation():
    """Rendert die Dokumentationsseite."""
    return render_template("documentation.html")


@app.route("/overview")
def overview():
    """Rendert die Übersichtsseite."""
    return render_template("overview.html")


@app.route("/contexts", methods=["GET"])
def get_contexts():
    """Gibt eine Liste aller vorhandenen Kontexte zurück."""
    contexts_list = []
    if not os.path.exists(app.config["DATA_DIR"]):
        os.makedirs(app.config["DATA_DIR"])
    files = [
        f
        for f in os.listdir(app.config["DATA_DIR"])
        if f.startswith("doku_") and f.endswith(".json")
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
    """Erstellt einen neuen Kontext."""
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
    """Lädt die Daten für einen bestimmten Kontext."""
    return jsonify(read_data(context))


@app.route("/save/<context>", methods=["POST"])
def save_data(context):
    """Speichert Daten für einen bestimmten Kontext."""
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
    """Bearbeitet einen Tag in einem Kontext."""
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
    """Löscht einen Tag aus einem Kontext."""
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


@app.route("/import_json/<context>", methods=["POST"])
def import_json(context):
    """Importiert eine JSON-Datei in einen Kontext."""
    if "file" not in request.files:
        return jsonify({"status": "error", "message": "Keine Datei gefunden"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"status": "error", "message": "Keine Datei ausgewählt"}), 400
    if file and file.filename.endswith(".json"):
        try:
            imported_data = json.load(file)

            # Überprüfen der grundlegenden Struktur
            if not isinstance(imported_data, dict):
                return (
                    jsonify({"status": "error", "message": "Ungültiges JSON-Format"}),
                    400,
                )

            # Lade die vorhandenen Daten
            current_data = read_data(context)

            # Mergen der Daten
            # Die importierten Daten haben Vorrang, außer bei 'contextName'
            if "contextName" in imported_data:
                del imported_data["contextName"]

            def merge_dicts(dict1, dict2):
                for key, value in dict2.items():
                    if (
                        key in dict1
                        and isinstance(dict1[key], dict)
                        and isinstance(value, dict)
                    ):
                        merge_dicts(dict1[key], value)
                    else:
                        dict1[key] = value

            merge_dicts(current_data, imported_data)

            if write_data(current_data, context):
                return jsonify(
                    {"status": "success", "message": "Daten erfolgreich importiert"}
                )
            else:
                return (
                    jsonify(
                        {
                            "status": "error",
                            "message": "Fehler beim Speichern der Daten",
                        }
                    ),
                    500,
                )
        except (IOError, json.JSONDecodeError):
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "Fehler beim Verarbeiten der JSON-Datei",
                    }
                ),
                400,
            )

    return jsonify({"status": "error", "message": "Ungültiger Dateityp"}), 400


if __name__ == "__main__":
    from waitress import serve

    # Prüfen, ob der Datenordner existiert, BEVOR der Server startet
    if not os.path.exists(app.config["DATA_DIR"]):
        os.makedirs(app.config["DATA_DIR"])

    serve(app, host="0.0.0.0", port=5051)

"""
Haupt-Anwendung für die tägliche Dokumentation.
Verwaltet mehrere Dokumentations-Kontexte (z.B. Arbeit, Privat).
"""

import os
import json
from flask import Flask, jsonify, render_template, request
from waitress import serve

app = Flask(__name__)

# --- Konfigurations-Management (vereinfacht für lokale Entwicklung) ---
# Die Konfigurationsdatei wird jetzt direkt im Projektordner gespeichert.
CONFIG_FILE = "config.json"


def load_config():
    """Lädt die Konfiguration aus der config.json."""
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return {}  # Fallback bei leerer oder korrupter Datei

    # Standard-Speicherort für die Doku-Dateien ist ein 'data'-Ordner im Projekt.
    default_data_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
    return {"data_path": default_data_path}


def save_config(app_config):
    """Speichert die Konfiguration in der config.json."""
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(app_config, f, indent=4)


config = load_config()


def get_data_path():
    """
    Gibt den aktuellen Datenpfad aus der Konfiguration zurück und stellt sicher,
    dass er existiert.
    """
    path = config.get("data_path")
    if not path:
        path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
        config["data_path"] = path
        save_config(config)
    os.makedirs(path, exist_ok=True)
    return path


# --- Standard-Daten ---
DEFAULT_CATEGORY_STYLES = {
    "Technik": {"color": "#ef4444"},
    "Analyse": {"color": "#3b82f6"},
    "Dokumentation": {"color": "#f59e0b"},
    "Organisation": {"color": "#10b981"},
    "Soziales": {"color": "#8b5cf6"},
    "Sonstiges": {"color": "#6b7280"},
}


# --- Hilfsfunktionen für Datenzugriff ---
def get_context_file(context):
    """Gibt den vollständigen Pfad zur JSON-Datei eines Kontextes zurück."""
    data_dir = get_data_path()
    safe_context = "".join(c for c in (context or "default") if c.isalnum())
    return os.path.join(data_dir, f"doku_{safe_context}.json")


def read_data(context="default"):
    """Liest Daten aus einer Kontext-Datei oder gibt Standarddaten zurück."""
    data_file = get_context_file(context)
    default_data = {
        "contextName": (context or "default").capitalize(),
        "appData": {},
        "tagCategoryMap": {},
        "projects": [],
        "todos": [],
        "categoryStyles": DEFAULT_CATEGORY_STYLES,
    }
    if not os.path.exists(os.path.dirname(data_file)):
        os.makedirs(os.path.dirname(data_file))
    if not os.path.exists(data_file):
        return default_data
    try:
        with open(data_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            data.setdefault("contextName", (context or "default").capitalize())
            data.setdefault("projects", [])
            data.setdefault("todos", [])
            data.setdefault("tagCategoryMap", {})
            data.setdefault("appData", {})
            data.setdefault("categoryStyles", DEFAULT_CATEGORY_STYLES)
            for cat, style in DEFAULT_CATEGORY_STYLES.items():
                data["categoryStyles"].setdefault(cat, style)
            return data
    except (IOError, json.JSONDecodeError):
        return default_data


def write_data(data, context="default"):
    """Schreibt Daten in eine Kontext-Datei."""
    data_file = get_context_file(context)
    try:
        with open(data_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        return True
    except IOError:
        return False


# --- Flask-Routen ---


@app.route("/set_data_path", methods=["POST"])
def set_data_path():
    """Setzt den Datenpfad in der Konfiguration."""
    data = request.get_json()
    new_path = data.get("path")
    if not new_path:
        return jsonify({"status": "error", "message": "Pfad fehlt."}), 400

    new_path = os.path.abspath(os.path.expanduser(new_path.strip().replace('"', "")))
    try:
        os.makedirs(new_path, exist_ok=True)
        current_config = load_config()
        current_config["data_path"] = new_path
        save_config(current_config)
        config.update(current_config)
        return jsonify({"status": "success", "message": "Datenpfad aktualisiert"})
    except (IOError, OSError) as e:
        return jsonify({"status": "error", "message": f"Fehler: {str(e)}"}), 500


@app.route("/")
def index():
    """Rendert die Hauptseite (To-Do Liste)."""
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
    data_dir = get_data_path()
    contexts_list = []
    files = [
        f for f in os.listdir(data_dir) if f.startswith("doku_") and f.endswith(".json")
    ]
    for f in files:
        context_id = f.replace("doku_", "").replace(".json", "")
        data = read_data(context_id)
        name = data.get("contextName", context_id.capitalize())
        contexts_list.append({"id": context_id, "name": name})
    if not contexts_list:
        default_data = {
            "contextName": "Default",
            "categoryStyles": DEFAULT_CATEGORY_STYLES,
        }
        write_data(default_data, "default")
        contexts_list.append({"id": "default", "name": "Default"})
    return jsonify(sorted(contexts_list, key=lambda x: x["name"]))


@app.route("/create_context", methods=["POST"])
def create_context():
    """Erstellt eine neue Kontextdatei."""
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
        return jsonify({"status": "success", "message": "Kontext erstellt"}), 201
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
    """Speichert die Daten für einen bestimmten Kontext."""
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
    """Bearbeitet einen Tag."""
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
        if old_name != new_name and new_name in tag_map:
            return (
                jsonify(
                    {"status": "error", "message": "Neuer Tag-Name existiert bereits"}
                ),
                409,
            )
        tag_map[new_name] = tag_map.pop(old_name)
        tag_map[new_name] = new_category
    item_lists = [
        doku_data.get("todos", []),
        *[d.get("entries", []) for d in doku_data.get("appData", {}).values()],
    ]
    for item_list in item_lists:
        for item in item_list:
            key = "tags" if "tags" in item else "tagNames"
            if key in item and old_name in item[key]:
                item[key] = [new_name if t == old_name else t for t in item[key]]
    if write_data(doku_data, context):
        return jsonify({"status": "success", "message": "Tag erfolgreich aktualisiert"})
    return jsonify({"status": "error", "message": "Fehler beim Speichern"}), 500


@app.route("/delete_tag/<context>", methods=["POST"])
def delete_tag(context):
    """Löscht einen Tag."""
    tag_name = request.get_json().get("tagName")
    if not tag_name:
        return jsonify({"status": "error", "message": "Tag-Name fehlt"}), 400
    doku_data = read_data(context)
    if tag_name in doku_data.get("tagCategoryMap", {}):
        del doku_data["tagCategoryMap"][tag_name]
    item_lists = [
        doku_data.get("todos", []),
        *[d.get("entries", []) for d in doku_data.get("appData", {}).values()],
    ]
    for item_list in item_lists:
        for item in item_list:
            key = "tags" if "tags" in item else "tagNames"
            if key in item and tag_name in item[key]:
                item[key] = [t for t in item[key] if t != tag_name]
    if write_data(doku_data, context):
        return jsonify({"status": "success", "message": "Tag erfolgreich gelöscht"})
    return jsonify({"status": "error", "message": "Fehler beim Speichern"}), 500


@app.route("/import_json/<context>", methods=["POST"])
def import_json(context):
    """Importiert eine JSON-Datei."""
    if "file" not in request.files:
        return jsonify({"status": "error", "message": "Keine Datei gefunden"}), 400
    file = request.files["file"]
    if not file or not file.filename.endswith(".json"):
        return jsonify({"status": "error", "message": "Ungültige Datei"}), 400
    try:
        imported_data = json.load(file)
        if not isinstance(imported_data, dict):
            return (
                jsonify({"status": "error", "message": "Ungültiges JSON-Format"}),
                400,
            )
        current_data = read_data(context)
        imported_data.pop("contextName", None)

        def merge_dicts(dict1, dict2):
            for key, value in dict2.items():
                is_nested = (
                    key in dict1
                    and isinstance(dict1.get(key), dict)
                    and isinstance(value, dict)
                )
                if is_nested:
                    merge_dicts(dict1[key], value)
                else:
                    dict1[key] = value

        merge_dicts(current_data, imported_data)
        if write_data(current_data, context):
            return jsonify({"status": "success", "message": "Daten importiert"})
        return jsonify({"status": "error", "message": "Fehler beim Speichern"}), 500
    except (IOError, json.JSONDecodeError):
        return jsonify({"status": "error", "message": "Fehler beim Verarbeiten"}), 400


# --- Serverstart ---
if __name__ == "__main__":
    get_data_path()
    serve(app, host="0.0.0.0", port=5051)

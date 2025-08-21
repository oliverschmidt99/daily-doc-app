import os
import json
import subprocess
from flask import Flask, request, jsonify, render_template

# Initialisiert die Flask-Anwendung
app = Flask(__name__, template_folder="templates")

# Der Dateiname für die JSON-Datenbank
DATA_FILE = "doku.json"

# ================================================================= #
#                         HTML & DATEN-ROUTEN
# ================================================================= #


@app.route("/")
def index():
    """Zeigt die Hauptseite (index.html) an."""
    return render_template("index.html")


@app.route("/load", methods=["GET"])
def load_data():
    """Lädt die Daten aus der JSON-Datei und sendet sie an die Webseite."""
    if not os.path.exists(DATA_FILE):
        return jsonify({"appData": {}, "tagCategoryMap": {}})
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return jsonify(data)
    except (IOError, json.JSONDecodeError) as e:
        print(f"Fehler beim Laden der Daten: {e}")
        return jsonify({"appData": {}, "tagCategoryMap": {}})


@app.route("/save", methods=["POST"])
def save_data():
    """Empfängt Daten im JSON-Format und speichert sie."""
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "Keine Daten empfangen"}), 400

    try:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        print("Daten erfolgreich gespeichert.")
        return jsonify({"status": "success", "message": "Daten gespeichert"})
    except IOError as e:
        print(f"Fehler beim Speichern der Daten: {e}")
        return (
            jsonify({"status": "error", "message": "Fehler beim Speichern der Datei"}),
            500,
        )


# ================================================================= #
#                         GIT-FUNKTIONEN
# ================================================================= #


def run_git_command(command):
    """Führt einen Git-Befehl aus und gibt das Ergebnis zurück."""
    try:
        # Führt den Befehl im aktuellen Verzeichnis aus
        result = subprocess.run(
            command, check=True, capture_output=True, text=True, shell=True
        )
        return {"success": True, "output": result.stdout.strip()}
    except subprocess.CalledProcessError as e:
        # Gibt bei einem Fehler die Fehlermeldung von Git zurück
        return {"success": False, "output": e.stderr.strip()}


@app.route("/git/status", methods=["GET"])
def git_status():
    """Prüft den Git-Status (lokal vs. remote)."""
    # Holt die neuesten Informationen vom Remote-Repository
    run_git_command("git fetch")

    # Prüft den Status des Branches
    status_result = run_git_command("git status -sb")
    if not status_result["success"]:
        return jsonify({"status": "error", "message": status_result["output"]}), 500

    status_output = status_result["output"]
    if "behind" in status_output:
        return jsonify({"status": "behind", "message": "Pull erforderlich"})
    elif "ahead" in status_output:
        return jsonify({"status": "ahead", "message": "Push erforderlich"})
    elif "diverged" in status_output:
        return jsonify(
            {
                "status": "diverged",
                "message": "Branches haben sich auseinanderentwickelt!",
            }
        )
    else:
        # Prüft, ob es ungetrackte oder geänderte Dateien gibt
        local_status = run_git_command("git status --porcelain")
        if local_status["output"]:
            return jsonify(
                {"status": "uncommitted", "message": "Lokale Änderungen vorhanden"}
            )
        return jsonify({"status": "up-to-date", "message": "Synchronisiert"})


@app.route("/git/pull", methods=["POST"])
def git_pull():
    """Führt 'git pull' aus."""
    result = run_git_command("git pull")
    if result["success"]:
        return jsonify({"status": "success", "message": "Pull erfolgreich!"})
    else:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": f"Pull fehlgeschlagen: {result['output']}",
                }
            ),
            500,
        )


@app.route("/git/push", methods=["POST"])
def git_push():
    """Führt 'git push' aus."""
    # Zuerst lokale Änderungen committen
    run_git_command("git add doku.json")
    # Commit nur, wenn es Änderungen gibt
    run_git_command('git commit -m "Daten-Update via App"')

    result = run_git_command("git push")
    if result["success"]:
        return jsonify({"status": "success", "message": "Push erfolgreich!"})
    else:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": f"Push fehlgeschlagen: {result['output']}",
                }
            ),
            500,
        )


# ================================================================= #
#                         SERVER START
# ================================================================= #

if __name__ == "__main__":
    app.run(debug=True)

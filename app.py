import os
import json
from flask import Flask, request, jsonify, render_template, send_from_directory

# Initialisiert die Flask-Anwendung
app = Flask(__name__, template_folder='templates')

# Der Dateiname für die JSON-Datenbank
DATA_FILE = "doku.json"

# Route für die Hauptseite ("/")
# Diese Funktion lädt und zeigt die index.html an.
@app.route('/')
def index():
    """Zeigt die Hauptseite (index.html) an."""
    return render_template('index.html')

# Route zum Laden der Daten ("/load")
# Wird von der Webseite aufgerufen, um die gespeicherten Daten zu holen.
@app.route('/load', methods=['GET'])
def load_data():
    """Lädt die Daten aus der JSON-Datei und sendet sie an die Webseite."""
    if not os.path.exists(DATA_FILE):
        # Wenn die Datei nicht existiert, leere Daten zurückgeben
        return jsonify({"appData": {}, "tagCategoryMap": {}})
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return jsonify(data)
    except (IOError, json.JSONDecodeError) as e:
        print(f"Fehler beim Laden der Daten: {e}")
        # Bei einem Fehler ebenfalls leere Daten zurückgeben
        return jsonify({"appData": {}, "tagCategoryMap": {}})

# Route zum Speichern der Daten ("/save")
# Empfängt Daten von der Webseite und speichert sie in der JSON-Datei.
@app.route('/save', methods=['POST'])
def save_data():
    """Empfängt Daten im JSON-Format und speichert sie."""
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "Keine Daten empfangen"}), 400

    try:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            # json.dump sorgt für eine saubere Speicherung
            json.dump(data, f, ensure_ascii=False, indent=4)
        print("Daten erfolgreich gespeichert.")
        return jsonify({"status": "success", "message": "Daten gespeichert"})
    except IOError as e:
        print(f"Fehler beim Speichern der Daten: {e}")
        return jsonify({"status": "error", "message": "Fehler beim Speichern der Datei"}), 500

# Startet den Server, wenn das Skript direkt ausgeführt wird
if __name__ == '__main__':
    # host='0.0.0.0' macht den Server im lokalen Netzwerk erreichbar
    # debug=True sorgt dafür, dass der Server bei Änderungen neu startet
    # PORT wurde hier auf 8080 geändert.
    app.run(host='0.0.0.0', port=8080, debug=True)

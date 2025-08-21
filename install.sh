#!/bin/bash

log_info() { echo -e "\n\e[34m[INFO]\e[0m $1"; }
log_success() { echo -e "\e[32m[ERFOLG]\e[0m $1"; }
log_error() { echo -e "\e[31m[FEHLER]\e[0m $1"; }

# 1. Systemabhängigkeiten (Python)
log_info "Überprüfe Python-Abhängigkeiten..."
if ! command -v python &> /dev/null || ! command -v pip &> /dev/null; then
    log_error "Python und/oder Pip sind nicht installiert. Bitte installiere sie."
    exit 1
fi
log_success "Python und Pip sind vorhanden."

# 2. Systemabhängigkeiten (Node.js)
log_info "Überprüfe Node.js-Abhängigkeiten..."
if ! command -v npm &> /dev/null; then
    log_error "Node.js und npm sind nicht installiert. Bitte installiere sie."
    log_info "Auf Arch-basierten Systemen: sudo pacman -S nodejs npm"
    exit 1
fi
log_success "Node.js und npm sind vorhanden."

# 3. Virtuelle Umgebung einrichten
VENV_DIR="venv"
if [ ! -d "$VENV_DIR" ]; then
    log_info "Erstelle Python Virtual Environment..."
    python -m venv $VENV_DIR
else
    log_info "Virtual Environment existiert bereits."
fi
log_success "Virtual Environment ist eingerichtet."

# 4. Python-Pakete installieren
log_info "Installiere Python-Pakete..."
source $VENV_DIR/bin/activate
pip install -r requirements.txt
deactivate
log_success "Python-Pakete sind installiert."

# 5. Tailwind CSS einrichten
log_info "Installiere Tailwind CSS Abhängigkeiten via npm..."
npm install
if [ $? -ne 0 ]; then log_error "npm install fehlgeschlagen." && exit 1; fi

log_info "Erstelle die produktive CSS-Datei mit Tailwind..."
npm run build
if [ $? -ne 0 ]; then log_error "Tailwind CSS Build (npm run build) fehlgeschlagen." && exit 1; fi
log_success "Tailwind CSS wurde erfolgreich eingerichtet."

echo -e "\n\e[32m=======================================\e[0m"
log_success "Einrichtung abgeschlossen!"
echo "Um die Anwendung zu starten:"
echo "1. source venv/bin/activate"
echo "2. flask run"
echo -e "\e[32m=======================================\e[0m"
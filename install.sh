#!/bin/bash

# ================================================================= #
#                 HELFER-FUNKTIONEN & VARIABLEN
# ================================================================= #
log_info() { echo -e "\n\e[34m[INFO]\e[0m $1"; }
log_success() { echo -e "\e[32m[ERFOLG]\e[0m $1"; }
log_error() { echo -e "\e[31m[FEHLER]\e[0m $1"; }
log_warning() { echo -e "\e[33m[AKTION ERFORDERLICH]\e[0m $1"; }

VENV_DIR="venv"

# ================================================================= #
#                 SSH-SCHLÜSSEL FÜR GITHUB EINRICHTEN
# ================================================================= #
setup_ssh_for_github() {
    log_info "Richte SSH-Schlüssel für passwortfreies 'git pull' von GitHub ein..."
    SSH_DIR="$HOME/.ssh"; KEY_PATH="$SSH_DIR/id_ed25519"
    mkdir -p "$SSH_DIR"; chmod 700 "$SSH_DIR"

    if [ ! -f "$KEY_PATH" ]; then
        log_info "Kein SSH-Schlüssel gefunden. Erstelle einen neuen..."
        # Erstellt einen neuen Schlüssel ohne Passphrase (-N "")
        ssh-keygen -t ed25519 -f "$KEY_PATH" -N "" -C "$(whoami)@$(hostname)-doku-app"
        log_success "Neuer SSH-Schlüssel wurde unter $KEY_PATH erstellt."
    else
        log_success "Vorhandener SSH-Schlüssel unter $KEY_PATH wird verwendet."
    fi

    log_warning "Bitte füge den folgenden öffentlichen SSH-Schlüssel zu deinem GitHub-Account hinzu:"
    echo "--------------------------------------------------------------------------------"
    echo "1. Markiere und kopiere den gesamten Text zwischen den Linien:"
    echo ""; cat "$KEY_PATH.pub"; echo ""
    echo "2. Gehe zu GitHub in deinem Browser: https://github.com/settings/keys"
    echo "3. Klicke auf 'New SSH key', gib einen Titel ein (z.B. 'Doku App PC') und füge den Schlüssel ein."
    echo "--------------------------------------------------------------------------------"
    read -p "Drücke ENTER, sobald du den Schlüssel zu GitHub hinzugefügt hast..."

    log_info "Teste die SSH-Verbindung zu GitHub..."
    if ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
        log_success "SSH-Verbindung zu GitHub erfolgreich!"
    else
        log_error "SSH-Verbindung zu GitHub fehlgeschlagen. Bitte überprüfe den hinzugefügten Schlüssel."
    fi
}

# ================================================================= #
#                         HAUPTSKRIPT-ABLAUF
# ================================================================= #
log_info "Starte die Einrichtung der Doku-App..."

# 1. Systemabhängigkeiten prüfen und installieren
log_info "Überprüfe und installiere Systemabhängigkeiten (benötigt eventuell sudo-Passwort)..."
# Da du ein Arch-basiertes System nutzt, wird pacman verwendet
if command -v pacman &> /dev/null; then
    PACKAGES="python python-pip git"
    # --needed stellt sicher, dass nur fehlende Pakete installiert werden
    if ! sudo pacman -S --needed --noconfirm $PACKAGES; then
        log_error "Installation der Systemabhängigkeiten fehlgeschlagen." && exit 1
    fi
else
    log_error "Kein unterstützter Paketmanager (pacman) gefunden." && exit 1
fi
log_success "Systemabhängigkeiten sind installiert."

# 2. Virtuelle Umgebung einrichten
if [ ! -d "$VENV_DIR" ]; then
    log_info "Erstelle Python Virtual Environment in '$VENV_DIR'..."
    python -m venv $VENV_DIR
    if [ $? -ne 0 ]; then log_error "Erstellung des Virtual Environments fehlgeschlagen." && exit 1; fi
else
    log_info "Virtual Environment existiert bereits."
fi
log_success "Virtual Environment ist eingerichtet."

# 3. Python-Pakete installieren
log_info "Aktiviere Virtual Environment und installiere Pakete aus requirements.txt..."
source $VENV_DIR/bin/activate
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    log_error "Installation der Python-Pakete fehlgeschlagen." && deactivate && exit 1
fi
deactivate
log_success "Alle Python-Pakete sind installiert."

# 4. SSH-Schlüssel optional einrichten
read -p "Möchtest du einen SSH-Schlüssel für GitHub einrichten? (Dies ist optional) (j/N) " choice
if [[ "$choice" =~ ^[jJ]$ ]]; then
    setup_ssh_for_github
else
    log_info "Einrichtung des SSH-Schlüssels übersprungen."
fi

# 5. Autostart-Service optional einrichten
read -p "Möchtest du einen systemd-Service für den Autostart einrichten? (j/N) " choice
if [[ "$choice" =~ ^[jJ]$ ]]; then
    SERVICE_NAME="doku-app.service"
    SERVICE_FILE="/etc/systemd/system/$SERVICE_NAME"
    WORKING_DIRECTORY=$(pwd)
    VENV_PYTHON_PATH="$WORKING_DIRECTORY/$VENV_DIR/bin/python"
    SCRIPT_PATH="$WORKING_DIRECTORY/app.py"

    log_info "Erstelle systemd Service-Datei..."
    # 'tee' wird verwendet, um die Datei mit sudo-Rechten zu schreiben
    sudo tee $SERVICE_FILE > /dev/null <<EOF
[Unit]
Description=Taegliche Dokumentation App
After=network.target

[Service]
ExecStart=$VENV_PYTHON_PATH $SCRIPT_PATH
WorkingDirectory=$WORKING_DIRECTORY
StandardOutput=journal
StandardError=journal
Restart=always
User=$(whoami)

[Install]
WantedBy=multi-user.target
EOF
    log_success "systemd Service-Datei unter $SERVICE_FILE erstellt."

    log_info "Lade systemd neu und starte den Service..."
    sudo systemctl daemon-reload
    sudo systemctl enable $SERVICE_NAME
    sudo systemctl restart $SERVICE_NAME

    # Überprüft, ob der Service wirklich läuft
    if sudo systemctl is-active --quiet $SERVICE_NAME; then
        log_success "Service '$SERVICE_NAME' wurde erfolgreich gestartet und aktiviert."
        log_info "Der Status kann mit 'systemctl status $SERVICE_NAME' überprüft werden."
    else
        log_error "Service '$SERVICE_NAME' konnte nicht gestartet werden."
        log_info "Überprüfe die Logs mit 'journalctl -u $SERVICE_NAME' für Details." && exit 1
    fi
else
    log_info "Autostart-Einrichtung übersprungen."
fi

log_success "Einrichtung abgeschlossen!"
echo "Um die Anwendung manuell zu starten (falls kein Autostart gewählt wurde):"
echo "1. source $VENV_DIR/bin/activate"
echo "2. python app.py"

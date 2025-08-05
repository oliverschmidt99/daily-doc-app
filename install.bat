@echo off
chcp 65001 > nul

:: ================================================================= ::
::                  HELFER-FUNKTIONEN & VARIABLEN
:: ================================================================= ::
:log_info
    echo.
    echo [INFO] %~1
    goto :eof

:log_success
    echo [ERFOLG] %~1
    goto :eof

:log_error
    echo [FEHLER] %~1
    goto :eof

:log_warning
    echo [AKTION ERFORDERLICH] %~1
    goto :eof

set "VENV_DIR=venv"

:: ================================================================= ::
::                  SSH-SCHLUESSEL FUER GITHUB EINRICHTEN
:: ================================================================= ::
:setup_ssh_for_github
    call :log_info "Richte SSH-Schluessel fuer passwortfreies 'git pull' von GitHub ein..."
    set "SSH_DIR=%USERPROFILE%\.ssh"
    set "KEY_PATH=%SSH_DIR%\id_ed25519"

    if not exist "%SSH_DIR%" mkdir "%SSH_DIR%"

    if not exist "%KEY_PATH%" (
        call :log_info "Kein SSH-Schluessel gefunden. Erstelle einen neuen..."
        ssh-keygen -t ed25519 -f "%KEY_PATH%" -N "" -C "%USERNAME%@%COMPUTERNAME%-doku-app"
        if %errorlevel% neq 0 (
            call :log_error "Erstellung des SSH-Schluessels fehlgeschlagen."
            goto :eof
        )
        call :log_success "Neuer SSH-Schluessel wurde unter %KEY_PATH% erstellt."
    ) else (
        call :log_success "Vorhandener SSH-Schluessel unter %KEY_PATH% wird verwendet."
    )

    call :log_warning "Bitte fuege den folgenden oeffentlichen SSH-Schluessel zu deinem GitHub-Account hinzu:"
    echo --------------------------------------------------------------------------------
    echo 1. Markiere und kopiere den gesamten Text zwischen den Linien:
    echo.
    type "%KEY_PATH%.pub"
    echo.
    echo 2. Gehe zu GitHub in deinem Browser: https://github.com/settings/keys
    echo 3. Klicke auf 'New SSH key', gib einen Titel ein (z.B. 'Doku App PC') und fuege den Schluessel ein.
    echo --------------------------------------------------------------------------------
    pause

    call :log_info "Teste die SSH-Verbindung zu GitHub..."
    ssh -T git@github.com
    call :log_warning "Wenn die Meldung 'successfully authenticated' erschien, war alles erfolgreich."
    pause
    goto :eof

:: ================================================================= ::
::                          HAUPTSKRIPT-ABLAUF
:: ================================================================= ::
call :log_info "Starte die Einrichtung der Doku-App..."

:: 1. Systemabhaengigkeiten pruefen
call :log_info "Ueberpruefe Systemabhaengigkeiten..."
where python >nul 2>nul
if %errorlevel% neq 0 (
    call :log_error "Python ist nicht im PATH gefunden. Bitte installiere es von python.org."
    pause
    exit /b 1
)
where git >nul 2>nul
if %errorlevel% neq 0 (
    call :log_error "Git ist nicht im PATH gefunden. Bitte installiere es von git-scm.com."
    pause
    exit /b 1
)
call :log_success "Systemabhaengigkeiten sind vorhanden."

:: 2. Virtuelle Umgebung einrichten
if not exist "%VENV_DIR%" (
    call :log_info "Erstelle Python Virtual Environment in '%VENV_DIR%'..."
    python -m venv %VENV_DIR%
    if %errorlevel% neq 0 (
        call :log_error "Erstellung des Virtual Environments fehlgeschlagen."
        pause
        exit /b 1
    )
) else (
    call :log_info "Virtual Environment existiert bereits."
)
call :log_success "Virtual Environment ist eingerichtet."

:: 3. Python-Pakete installieren
call :log_info "Aktiviere Virtual Environment und installiere Pakete aus requirements.txt..."
call .\%VENV_DIR%\Scripts\activate.bat
pip install -r requirements.txt
if %errorlevel% neq 0 (
    call :log_error "Installation der Python-Pakete fehlgeschlagen."
    call .\%VENV_DIR%\Scripts\deactivate.bat
    pause
    exit /b 1
)
call .\%VENV_DIR%\Scripts\deactivate.bat
call :log_success "Alle Python-Pakete sind installiert."

:: 4. SSH-Schluessel optional einrichten
set /p choice="Moechtest du einen SSH-Schluessel fuer GitHub einrichten? (Dies ist optional) (j/N): "
if /i "%choice%"=="j" call :setup_ssh_for_github

:: 5. Autostart-Service optional einrichten
set /p choice="Moechtest du die Anwendung zum Autostart hinzufuegen? (j/N): "
if /i not "%choice%"=="j" (
    call :log_info "Autostart-Einrichtung uebersprungen."
    goto :end
)

call :log_info "Richte Autostart ein..."
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "BATCH_STARTER=%~dp0start-doku.bat"
set "VBS_STARTER=%~dp0start-doku-silent.vbs"

REM Erstellt eine Start-Batch-Datei, die das Python-Skript startet
(
    echo @echo off
    echo cd /d "%~dp0"
    echo call .\%VENV_DIR%\Scripts\activate
    echo python app.py
) > "%BATCH_STARTER%"

REM Erstellt ein VBScript, um die Batch-Datei unsichtbar auszufuehren
(
    echo Set WshShell = CreateObject^("WScript.Shell"^)
    echo WshShell.Run "cmd /c """%BATCH_STARTER%""""", 0, false
) > "%VBS_STARTER%"

REM Erstellt eine Verknuepfung zum VBScript im Autostart-Ordner
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%STARTUP_DIR%\DokuApp.lnk'); $s.TargetPath = '%VBS_STARTER%'; $s.Save()"

call :log_success "Autostart wurde erfolgreich eingerichtet!"
call :log_info "Die Anwendung wird beim naechsten Systemstart automatisch im Hintergrund gestartet."

:end
echo.
call :log_success "Einrichtung abgeschlossen!"
echo Um die Anwendung manuell zu starten (falls kein Autostart gewaehlt wurde):
echo 1. .\%VENV_DIR%\Scripts\activate
echo 2. python app.py
pause
rem

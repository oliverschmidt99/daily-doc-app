@echo off
chcp 65001 > nul

echo.
echo [INFO] Starte die Einrichtung der Doku-App...

:: ================================================================= ::
:: 1. Systemabhaengigkeiten pruefen
:: ================================================================= ::
echo.
echo [INFO] Ueberpruefe Systemabhaengigkeiten...
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [FEHLER] Python ist nicht im PATH gefunden. Bitte installiere es von python.org und stelle sicher, dass es zum PATH hinzugefuegt wird.
    pause
    exit /b 1
)
echo [ERFOLG] Python ist vorhanden.

:: ================================================================= ::
:: 2. Virtuelle Umgebung einrichten
:: ================================================================= ::
echo.
if not exist "venv" (
    echo [INFO] Erstelle Python Virtual Environment in 'venv'...
    python -m venv venv
    if %errorlevel% neq 0 (
        echo [FEHLER] Erstellung des Virtual Environments fehlgeschlagen.
        pause
        exit /b 1
    )
) else (
    echo [INFO] Virtual Environment existiert bereits.
)
echo [ERFOLG] Virtual Environment ist eingerichtet.

:: ================================================================= ::
:: 3. Python-Pakete installieren
:: ================================================================= ::
echo.
echo [INFO] Aktiviere Virtual Environment und installiere Pakete aus requirements.txt...
call .\venv\Scripts\activate.bat
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [FEHLER] Installation der Python-Pakete fehlgeschlagen.
    call .\venv\Scripts\deactivate.bat
    pause
    exit /b 1
)
call .\venv\Scripts\deactivate.bat
echo [ERFOLG] Alle Python-Pakete sind installiert.


:: ================================================================= ::
:: 4. Autostart-Service optional einrichten
:: ================================================================= ::
echo.
set /p choice="Moechtest du die Anwendung zum Autostart hinzufuegen? (j/N): "
if /i not "%choice%"=="j" (
    echo [INFO] Autostart-Einrichtung uebersprungen.
    goto end
)

echo.
echo [INFO] Richte Autostart ein...
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "BATCH_STARTER=%~dp0start-doku.bat"
set "VBS_STARTER=%~dp0start-doku-silent.vbs"

REM Erstellt eine Start-Batch-Datei, die das Python-Skript startet
(
    echo @echo off
    echo cd /d "%~dp0"
    echo call .\venv\Scripts\activate
    echo python app.py
) > "%BATCH_STARTER%"

REM Erstellt ein VBScript, um die Batch-Datei unsichtbar auszufuehren
REM KORREKTUR: Die ueberfluessigen Anfuehrungszeichen wurden entfernt, um den VBScript-Syntaxfehler zu beheben.
(
    echo Set WshShell = CreateObject^("WScript.Shell"^)
    echo WshShell.Run """%BATCH_STARTER%""", 0, false
) > "%VBS_STARTER%"

REM Erstellt eine Verknuepfung zum VBScript im Autostart-Ordner
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%STARTUP_DIR%\DokuApp.lnk'); $s.TargetPath = '%VBS_STARTER%'; $s.Save()"

echo.
echo [ERFOLG] Autostart wurde erfolgreich eingerichtet!
echo [INFO] Die Anwendung wird beim naechsten Systemstart automatisch im Hintergrund gestartet.

:end
echo.
echo [ERFOLG] Einrichtung abgeschlossen!
echo Um die Anwendung manuell zu starten (falls kein Autostart gewaehlt wurde):
echo 1. .\venv\Scripts\activate
echo 2. python app.py
pause

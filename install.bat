@echo off
chcp 65001 > nul

echo [INFO] Starte die Einrichtung der Doku-App...

:: 1. Python-Abhängigkeiten prüfen
echo.
echo [INFO] Ueberpruefe Python...
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [FEHLER] Python nicht gefunden. Bitte installiere es (python.org).
    pause
    exit /b 1
)
echo [ERFOLG] Python ist vorhanden.

:: 2. Node.js-Abhängigkeiten prüfen
echo.
echo [INFO] Ueberpruefe Node.js und npm...
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [FEHLER] Node.js und npm nicht gefunden. Bitte installiere sie (nodejs.org).
    pause
    exit /b 1
)
echo [ERFOLG] Node.js und npm sind vorhanden.

:: 3. Virtuelle Umgebung einrichten
echo.
if not exist "venv" (
    echo [INFO] Erstelle Python Virtual Environment...
    python -m venv venv
) else (
    echo [INFO] Virtual Environment existiert bereits.
)
echo [ERFOLG] Virtual Environment ist eingerichtet.

:: 4. Python-Pakete installieren
echo.
echo [INFO] Installiere Python-Pakete...
call .\venv\Scripts\activate.bat
pip install -r requirements.txt
call .\venv\Scripts\deactivate.bat
echo [ERFOLG] Python-Pakete sind installiert.

:: 5. Tailwind CSS einrichten
echo.
echo [INFO] Installiere Tailwind CSS Abhaengigkeiten...
npm install
if %errorlevel% neq 0 (
    echo [FEHLER] npm install fehlgeschlagen.
    pause
    exit /b 1
)

echo.
echo [INFO] Erstelle die produktive CSS-Datei...
npm run build
if %errorlevel% neq 0 (
    echo [FEHLER] Tailwind CSS Build fehlgeschlagen.
    pause
    exit /b 1
)
echo [ERFOLG] Tailwind CSS wurde erfolgreich eingerichtet.

echo.
echo ========================================
echo [ERFOLG] Einrichtung abgeschlossen!
echo Um die Anwendung zu starten:
echo 1. .\venv\Scripts\activate
echo 2. flask run
echo ========================================
pause
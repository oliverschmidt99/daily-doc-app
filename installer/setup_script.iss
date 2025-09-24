; Inno Setup Script für die Daily Doc App

[Setup]
; Eindeutige ID für deine Anwendung
AppId={{ff953d55-9a0f-482a-8698-a73914b5cdca}}
AppName=Daily Doc App
AppVersion=1.0.0
AppPublisher=Dein Name
DefaultDirName={autopf}\DailyDocApp
DefaultGroupName=Daily Doc App
; Stellt sicher, dass das Setup als Administrator ausgeführt wird (notwendig für C:\Programme)
PrivilegesRequired=admin
; Name der finalen Installer-Datei
OutputBaseFilename=DailyDocApp-Setup
Compression=lzma
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "german"; MessagesFile: "compiler:Languages\German.isl"

[Tasks]
; Fügt eine Checkbox im Installer hinzu, um die App beim Start auszuführen
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "startupentry"; Description: "Anwendung beim Windows-Start ausführen"; GroupDescription: "Autostart";

[Files]
; Die Haupt-Anwendungsdatei. Sie muss im selben Ordner wie dieses Skript liegen.
Source: "DailyDocApp.exe"; DestDir: "{app}"; Flags: ignoreversion
; Hier könnten später weitere Dateien hinzugefügt werden, falls nötig

[Icons]
; Erstellt den Eintrag im Startmenü
Name: "{group}\Daily Doc App"; Filename: "{app}\DailyDocApp.exe"
; Erstellt die Desktop-Verknüpfung (wenn der Haken gesetzt wird)
Name: "{autodesktop}\Daily Doc App"; Filename: "{app}\DailyDocApp.exe"; Tasks: desktopicon
; ERSTELLT DEN AUTOSTART-EINTRAG (wenn der Haken gesetzt wird)
Name: "{group}\Daily Doc App (Autostart)"; Filename: "{app}\DailyDocApp.exe"; Tasks: startupentry
Name: "{autostartup}\Daily Doc App"; Filename: "{app}\DailyDocApp.exe"; Tasks: startupentry

[Run]
; Führt die Anwendung am Ende der Installation aus (optional)
Filename: "{app}\DailyDocApp.exe"; Description: "{cm:LaunchProgram,Daily Doc App}"; Flags: nowait postinstall skipifsilent
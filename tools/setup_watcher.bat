@echo off
set "SCRIPT=%USERPROFILE%\.codebuddy\task_watcher.ps1"
schtasks /Create /TN "PinMateTaskWatcher" /TR "powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File \"%SCRIPT%\"" /SC ONLOGON /F
if %errorlevel%==0 (
    schtasks /Run /TN "PinMateTaskWatcher"
    echo DONE
) else (
    echo FAILED (code %errorlevel%). Run as Administrator.
)
pause

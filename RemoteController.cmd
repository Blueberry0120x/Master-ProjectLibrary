@echo off
setlocal enabledelayedexpansion
REM ============================================================
REM  RemoteController.cmd -- Launch Claude Remote Control
REM  for ProjectBook-Planner
REM
REM  WATCHDOG: If remote-control exits for ANY reason, this
REM  script waits 5 seconds and relaunches. Only a reboot or
REM  explicit kill of THIS script stops the loop.
REM
REM  SINGLE INSTANCE: Starting this script kills any previous
REM  watchdog loop automatically -- no duplicate watchdogs.
REM
REM  NOTIFICATIONS: Fires GitHub Issue comment on crash + relaunch
REM  to NP_ClaudeAgent issue #14 (CTRL-008 monitoring hub).
REM ============================================================

set "SESSION_NAME=ProjectBook-Planner"
set "GH=%USERPROFILE%\.local\bin\gh.exe"
set "REPO=Blueberry0120x/NP_ClaudeAgent"
set "LOG=%~dp0remote_controller.log"
set "CLAUDE=%USERPROFILE%\.local\bin\claude.exe"
set "WATCHDOG_LOCK=%~dp0remote_controller_watchdog.pid"

REM === SINGLE INSTANCE GUARD ===
set "MY_PID="
for /f "usebackq" %%p in (`powershell -NoProfile -Command "(Get-Process -Id $PID).Parent.Id" 2^>nul`) do set "MY_PID=%%p"

if exist "%WATCHDOG_LOCK%" (
    set "OLD_PID="
    set /p OLD_PID=<"%WATCHDOG_LOCK%"
    if defined OLD_PID (
        taskkill /F /PID !OLD_PID! >nul 2>&1
        echo [%date% %time%] Killed previous watchdog ^(PID !OLD_PID!^). >> "%LOG%"
    )
)

if defined MY_PID echo !MY_PID!>"%WATCHDOG_LOCK%"

REM Kill ALL existing claude remote-control sessions with this name
for /f "tokens=2 delims=," %%p in ('wmic process where "commandline like '%%--name%%%SESSION_NAME%%%'" get processid /format:csv 2^>nul ^| findstr /r "[0-9]"') do (
    taskkill /F /PID %%p >nul 2>&1
)
timeout /t 2 /nobreak >nul

cd /d "%~dp0"

REM Notify: initial launch
echo [%date% %time%] Starting %SESSION_NAME% Remote Controller ^(initial launch^)... >> "%LOG%"
%GH% issue comment 14 --repo %REPO% --body "[CTRL-008] %SESSION_NAME% LAUNCHED at %date% %time%. Watchdog active." >nul 2>&1

REM Watchdog loop -- restart on any exit
:loop
"%CLAUDE%" remote-control --name %SESSION_NAME% --permission-mode bypassPermissions
set "EXIT_CODE=!ERRORLEVEL!"
echo [%date% %time%] %SESSION_NAME% exited ^(code: !EXIT_CODE!^). Restarting in 5s... >> "%LOG%"

%GH% issue comment 14 --repo %REPO% --body "[CTRL-008] %SESSION_NAME% CRASHED (exit code: !EXIT_CODE!) at %date% %time%. Restarting in 5s..." >nul 2>&1

timeout /t 5 /nobreak >nul

echo [%date% %time%] %SESSION_NAME% RELAUNCHED ^(recovery from exit !EXIT_CODE!^) >> "%LOG%"
%GH% issue comment 14 --repo %REPO% --body "[CTRL-008] %SESSION_NAME% RELAUNCHED at %date% %time% (recovered from exit !EXIT_CODE!)." >nul 2>&1

goto loop

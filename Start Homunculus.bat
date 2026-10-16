@echo off
rem Double-click on Windows. Keep this window open while Homunculus runs.
cd /d "%~dp0"
set ARGS=
:loop
if "%~1"=="" goto run
if /i not "%~1"=="--local" set ARGS=%ARGS% %1
shift
goto loop
:run
where py >nul 2>nul
if %errorlevel% equ 0 (
  py -3 run.py %ARGS%
) else (
  python run.py %ARGS%
)
if errorlevel 1 (
  echo Homunculus needs Python 3.10 or newer: https://www.python.org/downloads/
  pause
)

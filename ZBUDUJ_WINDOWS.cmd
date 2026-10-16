@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Zainstaluj Node.js 24 LTS z https://nodejs.org i uruchom ten plik ponownie.
  pause
  exit /b 1
)
call npm ci --no-audit --no-fund
if errorlevel 1 goto failed
call npm test
if errorlevel 1 goto failed
call npm run dist:win
if errorlevel 1 goto failed
echo.
echo GOTOWE. Instalator jest w folderze dist.
start "" "%~dp0dist"
pause
exit /b 0
:failed
echo.
echo Budowanie przerwane. Sprawdz komunikat powyzej.
pause
exit /b 1

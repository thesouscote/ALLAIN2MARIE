@echo off
echo Lancement du serveur local ALLAIN2MARIE...
echo.
echo Le site sera accessible sur: http://localhost:8080
echo Appuyez sur Ctrl+C pour arreter le serveur
echo.

REM Essayer avec Python
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo Serveur Python demarre...
    python -m http.server 8080
    goto end
)

REM Essayer avec Python3
python3 --version >nul 2>&1
if %errorlevel% == 0 (
    echo Serveur Python3 demarre...
    python3 -m http.server 8080
    goto end
)

REM Essayer avec PHP
php --version >nul 2>&1
if %errorlevel% == 0 (
    echo Serveur PHP demarre...
    php -S localhost:8080
    goto end
)

REM Essayer avec Node.js
node --version >nul 2>&1
if %errorlevel% == 0 (
    echo Serveur Node.js demarre...
    npx http-server -p 8080
    goto end
)

echo Aucun serveur web trouve (Python, PHP, ou Node.js)
echo Installation de Python recommandee: https://www.python.org/downloads/
echo.
echo En attendant, vous pouvez ouvrir les fichiers HTML directement:
echo - test-security.html (pour tester la securite)
echo - login.html (page de connexion admin)
echo - index.html (boutique principale)
pause

:end
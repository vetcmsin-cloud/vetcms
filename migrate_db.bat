@echo off
echo.
echo ========================================================
echo       Setup Remote Database Schema
echo ========================================================
echo.
echo This script will synchronize your local database schema with your remote Neon database.
echo.

set /p DB_URL="Paste your Neon Connection String (postgres://...): "

if "%DB_URL%"=="" (
    echo Error: Connection string cannot be empty.
    pause
    exit /b
)

echo.
echo Setting private environment variable...
set "DATABASE_URL=%DB_URL%"

echo.
echo Running database migration (db:push)...
call npm run db:push

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo --------------------------------------------------------
    echo ERROR: Migration failed.
    echo.
    echo Check your connection string and internet connection.
    echo --------------------------------------------------------
    pause
    exit /b
)

echo.
echo ========================================================
echo       SUCCESS! Database tables created.
echo ========================================================
echo.
pause

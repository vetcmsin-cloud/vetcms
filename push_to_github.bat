@echo off
echo.
echo ========================================================
echo       Setup Application for GitHub
echo ========================================================
echo.
echo This script will help you push your code to your new GitHub repository.
echo.
echo IMPORTANT: You must have already created an EMPTY repository on GitHub.
echo.

set /p REPO_URL="Enter your GitHub Repository URL (e.g., https://github.com/username/repo.git): "

if "%REPO_URL%"=="" (
    echo Error: Repository URL cannot be empty.
    pause
    exit /b
)

echo.
echo Removing existing remote 'origin' if it exists...
git remote remove origin 2>nul

echo.
echo Adding new remote 'origin'...
git remote add origin %REPO_URL%

echo.
echo Verifying remote...
git remote -v

echo.
echo Pushing code to GitHub...
git push -u origin master
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Trying main branch if master failed...
    git push -u origin main
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo --------------------------------------------------------
    echo ERROR: Push failed.
    echo.
    echo Common reasons:
    echo 1. You usually need to sign in. A browser window might have popped up behind this window?
    echo 2. The repository URL might be incorrect.
    echo 3. The repository on GitHub might not be empty (it should not have a README or license yet).
    echo --------------------------------------------------------
    pause
    exit /b
)

echo.
echo ========================================================
echo       SUCCESS! Code pushed to GitHub.
echo ========================================================
echo.
pause

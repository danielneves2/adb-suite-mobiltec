@echo off
setlocal
title ADB Suite - configurar Git
cd /d "%~dp0"

where git >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Git nao encontrado. Instale em https://git-scm.com/download/win e rode de novo.
  pause
  exit /b 1
)

set "REPO=https://github.com/danielneves2/adb-suite-mobiltec.git"

if not exist ".git" (
  echo Criando repositorio local...
  git init || goto erro
)

git branch -M main

git remote get-url origin >nul 2>nul
if errorlevel 1 (
  git remote add origin %REPO% || goto erro
) else (
  git remote set-url origin %REPO% || goto erro
)

echo Preparando primeiro commit...
git add -A || goto erro
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "first commit" || goto erro
) else (
  echo Nada novo pra commitar.
)

echo Enviando pro GitHub (se pedir login, conclua no navegador)...
git push -u origin main || goto erro

echo.
echo [OK] Repositorio configurado: %REPO%
echo Daqui pra frente use atualizar.bat
pause
exit /b 0

:erro
echo.
echo [ERRO] Algo deu errado. Leia a mensagem acima.
pause
exit /b 1

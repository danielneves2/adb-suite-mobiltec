@echo off
setlocal
title ADB Suite - atualizar projeto
cd /d "%~dp0"

rem Uso: atualizar.bat              -> mensagem automatica com data e hora
rem      atualizar.bat "mensagem"   -> usa a sua mensagem no commit

where git >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Git nao encontrado. Instale em https://git-scm.com/download/win
  pause
  exit /b 1
)
if not exist ".git" (
  echo [ERRO] Repositorio ainda nao configurado. Rode configurar-git.bat primeiro.
  pause
  exit /b 1
)

for /f "delims=" %%i in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd HH:mm'"') do set "AGORA=%%i"
set "MSG=%~1"
if "%MSG%"=="" set "MSG=Atualizacao %AGORA%"

echo [1/3] Salvando suas alteracoes locais...
git add -A || goto erro
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "%MSG%" || goto erro
) else (
  echo       Nada novo pra salvar.
)

echo [2/3] Baixando novidades do GitHub...
git pull --rebase origin main
if errorlevel 1 (
  echo.
  echo [CONFLITO] O mesmo arquivo mudou aqui e no GitHub.
  echo Resolva os arquivos marcados acima, depois rode:
  echo    git add -A  ^&^&  git rebase --continue
  echo e rode atualizar.bat de novo. Pra desistir: git rebase --abort
  pause
  exit /b 1
)

echo [3/3] Enviando pro GitHub...
git push origin main || goto erro

echo.
echo [OK] Projeto atualizado (%AGORA%).
git log -1 --oneline
pause
exit /b 0

:erro
echo.
echo [ERRO] Algo deu errado. Leia a mensagem acima.
pause
exit /b 1

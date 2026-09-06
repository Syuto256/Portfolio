@echo off
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto nonode

start "" cmd /c "timeout /t 2 >nul & start http://localhost:4173/editor.html"

echo.
echo 深夜遊戯 コンテンツ編集ツールを起動しています...
echo 数秒後にブラウザが自動で開きます。
echo このウィンドウを閉じると編集ツールが終了します。編集が終わったら閉じてください。
echo.

node "_edit-tool\server.js"

echo.
echo 編集ツールを終了しました。
pause
goto :eof

:nonode
echo.
echo 「Node.js」が見つかりませんでした。
echo このツールを使うには、まず https://nodejs.org/ からNode.jsをインストールしてください。
echo.
pause
exit /b 1

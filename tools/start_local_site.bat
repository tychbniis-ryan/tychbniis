@echo off
setlocal

cd /d "%~dp0.."
echo 啟動 GitHub 連結測試網站
echo.
echo 網址：http://127.0.0.1:8000/
echo.
echo 若要停止網站，請關閉這個視窗。
echo.
py -m http.server 8000 --bind 127.0.0.1

endlocal

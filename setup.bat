@ECHO OFF
title Bot Setup
color 0b
cls
echo ========================================
echo            Stat Bot - Kurulum
echo ========================================
echo.

echo Node.js versiyonu ayarlanıyor...
nvm use 18.20.8
if %errorlevel% neq 0 (
    echo HATA: Node.js 18.20.8 versiyonu bulunamadi!
    echo Lutfen once 'nvm install 18.20.8' komutunu calistirin.
    pause
    exit /b 1
)

echo.
echo Bagimliliklar yukleniyor...
npm install
if %errorlevel% neq 0 (
    echo HATA: Bagimliliklar yuklenemedi!
    pause
    exit /b 1
)

echo.
echo ========================================
echo           SETUP TAMAMLANDI!
echo ========================================
echo.
echo Bot baslatmak icin baslat.bat dosyasini calistirin.
echo.
PAUSE
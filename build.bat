@echo off
chcp 65001 >nul
set HTTPS_PROXY=
set HTTP_PROXY=
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
cd /d "%~dp0"

echo ========================================
echo   AI Sync Desktop - 打包构建
echo ========================================
echo.
echo 正在打包为 exe 安装程序...
echo 这可能需要 3-5 分钟，请耐心等待。
echo.

npx electron-builder --win portable --x64

echo.
echo ========================================
if exist "dist\*.exe" (
    echo   打包完成！文件在 dist\ 目录下
) else (
    echo   打包失败，请查看上方错误信息
)
echo ========================================
pause

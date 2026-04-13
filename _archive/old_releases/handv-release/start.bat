@echo off
echo ==========================================
echo      HANDV System Startup Script
echo ==========================================
echo.

:: --- 配置区域 ---
:: 设置服务运行端口（如果旧网站占用了6666，请修改这里，例如 6667）
set PORT=6666
:: ----------------

if not exist "node_modules" (
    echo [INFO] First run detected. Installing dependencies...
    echo This may take a few minutes. Please wait...
    call npm install --omit=dev --registry=https://registry.npmmirror.com
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies. Please check your internet connection.
        pause
        exit /b %errorlevel%
    )
    echo [SUCCESS] Dependencies installed.
    echo.
)

echo [INFO] Starting server on port %PORT%...
echo [INFO] Access the application at: http://localhost:%PORT%
echo.
start http://localhost:%PORT%
node server/index.cjs

pause

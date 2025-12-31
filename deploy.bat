@echo off
REM PixelBead Sim 一键部署脚本
REM 适用于 Windows 系统

chcp 65001 > nul
echo ================================
echo   PixelBead Sim 一键部署脚本
echo ================================
echo.

REM 检查 Node.js 是否安装
echo 📦 检查 Node.js 环境...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 未检测到 Node.js，请先安装 Node.js ^(https://nodejs.org/^)
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✅ Node.js 版本: %NODE_VERSION%
echo.

REM 检查 npm 是否可用
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 未检测到 npm
    pause
    exit /b 1
)

REM 安装依赖
echo 📥 安装项目依赖...
call npm install
if %errorlevel% neq 0 (
    echo ❌ 依赖安装失败
    pause
    exit /b 1
)
echo ✅ 依赖安装成功
echo.

REM 构建项目
echo 🔨 构建生产版本...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ 构建失败
    pause
    exit /b 1
)
echo ✅ 构建成功 - 输出目录: dist\
echo.

REM 部署选项
echo 🚀 选择部署方式:
echo   1^) 本地预览 ^(推荐先测试^)
echo   2^) 部署到 GitHub Pages
echo   3^) 部署到 Vercel
echo   4^) 部署到 Netlify
echo   0^) 仅构建，手动部署
echo.
set /p choice="请选择 (0-4): "

if "%choice%"=="1" goto preview
if "%choice%"=="2" goto github
if "%choice%"=="3" goto vercel
if "%choice%"=="4" goto netlify
if "%choice%"=="0" goto manual
goto invalid

:preview
echo.
echo 🌐 启动本地预览...
echo 提示: 按 Ctrl+C 停止预览服务器
call npm run preview
goto end

:github
echo.
echo 📤 部署到 GitHub Pages...
call npm list gh-pages >nul 2>nul
if %errorlevel% neq 0 (
    echo 安装 gh-pages...
    call npm install --save-dev gh-pages
)
call npx gh-pages -d dist
if %errorlevel% equ 0 (
    echo ✅ 已部署到 GitHub Pages
) else (
    echo ⚠️ 部署失败，请检查 Git 仓库配置
)
goto end

:vercel
echo.
echo 📤 部署到 Vercel...
where vercel >nul 2>nul
if %errorlevel% neq 0 (
    echo 安装 Vercel CLI...
    call npm install -g vercel
)
call vercel --prod
goto end

:netlify
echo.
echo 📤 部署到 Netlify...
where netlify >nul 2>nul
if %errorlevel% neq 0 (
    echo 安装 Netlify CLI...
    call npm install -g netlify-cli
)
call netlify deploy --prod --dir=dist
goto end

:manual
echo.
echo ✅ 构建完成！
echo 部署文件位于: dist\ 目录
echo.
echo 手动部署方案：
echo   - 上传 dist\ 目录到任何静态网站托管服务
echo   - 或使用: python -m http.server --directory dist 8080
goto end

:invalid
echo ❌ 无效的选择
pause
exit /b 1

:end
echo.
echo ================================
echo   部署完成！
echo ================================
pause

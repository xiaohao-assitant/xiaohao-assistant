@echo off
chcp 65001 >nul 2>&1
title 小浩智能助手

echo ╔══════════════════════════════════════╗
echo ║     🤖 小浩智能助手 启动中...       ║
echo ╚══════════════════════════════════════╝
echo.

REM 设置 Node.js 路径
set PATH=C:\nodejs\node-v22.0.0-win-x64;%PATH%

REM 设置 API Key（请把下面的 KEY 替换成你的）
set ZHIPU_API_KEY=4011307d628c49fda01a2ccb25bf6336.58zKW7hxXerNB0vP

cd /d %~dp0
node src/server.js
pause

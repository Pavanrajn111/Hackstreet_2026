# AquaGrow AI - Backend + Frontend Launcher

$ProjectRoot = $PSScriptRoot
if (-not $ProjectRoot) {
    $ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
}
if (-not $ProjectRoot) {
    $ProjectRoot = (Get-Location).Path
}

$BackendPath = Join-Path $ProjectRoot "backend"
$FrontendPath = Join-Path $ProjectRoot "frontend"

# Detect Python environment
$PythonExe = Join-Path $BackendPath ".venv\Scripts\python.exe"

if (!(Test-Path $PythonExe)) {
    $PythonExe = Join-Path $ProjectRoot ".venv\Scripts\python.exe"
}

if (!(Test-Path $PythonExe)) {
    $PythonExe = "python"
}

# Validate folders
if (!(Test-Path $BackendPath)) {
    Write-Host "Backend folder not found at: $BackendPath" -ForegroundColor Red
    exit 1
}

if (!(Test-Path $FrontendPath)) {
    Write-Host "Frontend folder not found at: $FrontendPath" -ForegroundColor Red
    exit 1
}

# Startup banner
Clear-Host

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "          AQUAGROW AI STARTUP" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Host ""
Write-Host "Project: $ProjectRoot" -ForegroundColor Cyan
Write-Host "Python:  $PythonExe" -ForegroundColor Cyan

# Backend
Write-Host ""
Write-Host "Starting FastAPI Backend..." -ForegroundColor Yellow

$BackendCommand = "Set-Location '$BackendPath'; Write-Host 'AQUAGROW BACKEND' -ForegroundColor Green; & '$PythonExe' -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", $BackendCommand

# Frontend
Write-Host ""
Write-Host "Starting React Frontend..." -ForegroundColor Yellow

$FrontendCommand = "Set-Location '$FrontendPath'; Write-Host 'AQUAGROW FRONTEND' -ForegroundColor Green; npm run dev"

Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", $FrontendCommand

# Startup information
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "       AQUAGROW AI SERVERS LAUNCHED" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Host ""
Write-Host "Backend:  http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host "API Docs: http://127.0.0.1:8000/docs" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan

Write-Host ""
Write-Host "Backend and frontend logs are visible in their respective windows." -ForegroundColor Yellow
Write-Host "Keep both windows open while using AquaGrow AI." -ForegroundColor Yellow

Write-Host ""

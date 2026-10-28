# Установка OpenCode + RSI AI Gateway (-95%) в один клик.
# Запуск:  powershell -ExecutionPolicy Bypass -File .\install.ps1
$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

function Add-BunToPath {
    $bunBin = Join-Path $env:USERPROFILE '.bun\bin'
    if (($env:Path -split ';') -notcontains $bunBin) { $env:Path += ";$bunBin" }
}

function Invoke-Checked([string]$what, [scriptblock]$cmd) {
    & $cmd
    if ($LASTEXITCODE -ne 0) { throw "Ошибка на шаге: $what (код $LASTEXITCODE)" }
}

Write-Host ''
Write-Host '=== OpenCode + RSI AI Gateway: установка ===' -ForegroundColor Cyan

Add-BunToPath
if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
    Write-Host 'Bun не найден, устанавливаю с https://bun.sh ...' -ForegroundColor Yellow
    Invoke-RestMethod https://bun.sh/install.ps1 | Invoke-Expression
    Add-BunToPath
    if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
        throw 'Bun установлен, но не найден в PATH. Откройте новое окно PowerShell и запустите install.ps1 ещё раз.'
    }
}
Write-Host ("Bun: " + (& bun --version)) -ForegroundColor Green

Write-Host 'Устанавливаю зависимости (bun install)...' -ForegroundColor Cyan
Invoke-Checked 'bun install' { bun install }

Invoke-Checked 'setup.ts' { bun run setup.ts }

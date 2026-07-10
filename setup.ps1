$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js 20 or newer is required. Install Node.js, reopen PowerShell, and run setup again.'
}

$major = [int]((node --version).TrimStart('v').Split('.')[0])
if ($major -lt 20) {
    throw "Node.js 20 or newer is required. Current: $(node --version)"
}

Write-Host "`nInstalling ClearSlate..."
& npm.cmd install --registry=https://registry.npmjs.org/ --no-audit --fund=false
if ($LASTEXITCODE -ne 0) { throw 'npm install failed.' }

& npm.cmd test
if ($LASTEXITCODE -ne 0) { throw 'Tests failed.' }

& npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw 'Build failed.' }

& npm.cmd run doctor
if ($LASTEXITCODE -ne 0) { throw 'System check failed.' }

Write-Host "`nSetup complete. Start ClearSlate with: .\start.ps1" -ForegroundColor Green


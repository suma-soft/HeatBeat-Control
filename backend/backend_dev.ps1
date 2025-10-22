# backend_dev.ps1 — start backendu w jednym kroku
Set-Location -Path $PSScriptRoot
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

if (-not (Test-Path .\.venv\Scripts\python.exe)) {
  & "C:\Users\Maciek\AppData\Local\Programs\Python\Python312\python.exe" -m venv .venv
}

# aktywacja nie jest konieczna — będziemy używać pełnej ścieżki do Pythona z venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install fastapi "uvicorn[standard]" sqlmodel "passlib[bcrypt]" pyjwt "bcrypt>=4.1.2,<5.0"

$env:DATABASE_URL = $env:DATABASE_URL -as [string]
if ([string]::IsNullOrEmpty($env:DATABASE_URL)) { $env:DATABASE_URL = "sqlite:///./heatbeat.db" }

$env:JWT_SECRET = $env:JWT_SECRET -as [string]
if ([string]::IsNullOrEmpty($env:JWT_SECRET)) { $env:JWT_SECRET = "super_tajne_haslo_zmien_mnie" }

.\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000

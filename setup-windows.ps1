<#
  TYCOONHOOD — FIRST-TIME SETUP (Windows)

  Run from the project root:
      powershell -NoProfile -ExecutionPolicy Bypass -File .\setup-windows.ps1

  Or in VS Code: Ctrl+Shift+P -> "Run Task" -> "0 · First-time setup".

  It checks prerequisites, gets you a database, writes .env, installs
  dependencies, applies migrations, seeds real content, and verifies the
  platform end to end. It stops at the first genuine failure and tells you
  exactly what to fix — it never reports success it did not achieve.
#>

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

function Say  ($m) { Write-Host "  $m" }
function Good ($m) { Write-Host "  [ok] $m" -ForegroundColor Green }
function Warn ($m) { Write-Host "  [!]  $m" -ForegroundColor Yellow }
function Die  ($m) { Write-Host ""; Write-Host "  [x] $m" -ForegroundColor Red; Write-Host ""; exit 1 }
function Have ($c) { $null -ne (Get-Command $c -ErrorAction SilentlyContinue) }

Write-Host ""
Write-Host "  ============ TYCOONHOOD - FIRST-TIME SETUP ============" -ForegroundColor Cyan
Write-Host ""

# ---------------------------------------------------------------- 1. Node
if (-not (Have node)) {
  Die "Node.js is not installed.`n      Install Node 20 or newer from https://nodejs.org (LTS), reopen VS Code, and re-run."
}
$nodeMajor = [int](((node -v) -replace 'v','').Split('.')[0])
if ($nodeMajor -lt 20) {
  Die "Node $(node -v) is too old. This project needs Node 20+. Install the LTS from https://nodejs.org and re-run."
}
Good "Node $(node -v)"

# ---------------------------------------------------------------- 2. pnpm
if (-not (Have pnpm)) {
  Say "pnpm is not installed - installing it via corepack..."
  try {
    corepack enable | Out-Null
    corepack prepare pnpm@9.15.9 --activate | Out-Null
  } catch {
    Die "Could not install pnpm automatically.`n      Run this in an ADMIN PowerShell, then re-run this script:`n        npm install -g pnpm@9"
  }
}
if (-not (Have pnpm)) { Die "pnpm still not on PATH. Close and reopen VS Code, then re-run." }
Good "pnpm $(pnpm -v)"

# ---------------------------------------------------------------- 3. database
$envPath = Join-Path $root ".env"
$dbUrl = $null

if (Test-Path $envPath) {
  $existing = (Get-Content $envPath | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1)
  if ($existing) {
    $dbUrl = ($existing -replace '^DATABASE_URL=','').Trim('"')
    if ($dbUrl) { Good ".env already has a DATABASE_URL - keeping it" }
  }
}

if (-not $dbUrl) {
  Write-Host ""
  Say "This platform needs PostgreSQL. Pick one:"
  Say "  [1] Docker Desktop  - starts a local database here, nothing to sign up for"
  Say "  [2] Neon (cloud)    - free, no install; you paste a connection string"
  Say "  [3] I already have PostgreSQL running locally"
  Write-Host ""
  $choice = Read-Host "  Choose 1, 2 or 3"

  switch ($choice) {
    "1" {
      if (-not (Have docker)) {
        Die "Docker is not installed.`n      Get Docker Desktop from https://www.docker.com/products/docker-desktop`n      Start it, wait for the whale icon to settle, then re-run this script."
      }
      Say "Starting PostgreSQL in Docker..."
      docker compose up -d | Out-Null
      if ($LASTEXITCODE -ne 0) { Die "docker compose failed. Is Docker Desktop actually running?" }
      Say "Waiting for the database to accept connections..."
      $ready = $false
      foreach ($i in 1..30) {
        docker exec tycoonhood-db pg_isready -U tycoon -d tycoonhood_dev 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        Start-Sleep -Seconds 2
      }
      if (-not $ready) { Die "Postgres container did not become ready. Check: docker logs tycoonhood-db" }
      $dbUrl = "postgresql://tycoon:tycoon_dev@localhost:5432/tycoonhood_dev"
      Good "PostgreSQL running in Docker"
    }
    "2" {
      Write-Host ""
      Say "1. Go to https://neon.tech and create a free project"
      Say "2. Copy the POOLED connection string (it ends with ?sslmode=require)"
      Write-Host ""
      $dbUrl = Read-Host "  Paste the connection string"
      if (-not $dbUrl.StartsWith("postgres")) { Die "That does not look like a PostgreSQL connection string." }
      Good "Using your Neon database"
    }
    "3" {
      Write-Host ""
      Say "Default for a local install: postgresql://postgres:PASSWORD@localhost:5432/tycoonhood_dev"
      $dbUrl = Read-Host "  Paste your connection string"
      if (-not $dbUrl.StartsWith("postgres")) { Die "That does not look like a PostgreSQL connection string." }
      Good "Using your local database"
    }
    default { Die "No choice made. Re-run and pick 1, 2 or 3." }
  }
}

# ------------------------------------------------- 3b. does the database exist?
# Docker and Neon create it for us. A plain local install does not, and the
# resulting error ("DatabaseDoesNotExist") is confusing if we don't catch it.
if ($choice -eq "3") {
  Write-Host ""
  Say "Checking that the database itself exists..."
  if (Have psql) {
    $dbName = ($dbUrl -split '/')[-1] -replace '\?.*$',''
    $adminUrl = $dbUrl -replace "/$dbName(\?.*)?$", "/postgres"
    $exists = & psql $adminUrl -t -A -c "select 1 from pg_database where datname='$dbName'" 2>$null
    if ($exists -ne "1") {
      Warn "Database '$dbName' does not exist yet. Creating it..."
      & psql $adminUrl -c "CREATE DATABASE `"$dbName`"" 2>$null | Out-Null
      $exists = & psql $adminUrl -t -A -c "select 1 from pg_database where datname='$dbName'" 2>$null
      if ($exists -ne "1") {
        Die "Could not create the database '$dbName'.`n      Create it yourself, then re-run:`n        psql -U postgres -c ""CREATE DATABASE $dbName;"""
      }
      Good "Created database '$dbName'"
    } else {
      Good "Database '$dbName' exists"
    }
  } else {
    Warn "psql is not on PATH - skipping the existence check."
    Warn "If the next step says DatabaseDoesNotExist, create the database first."
  }
}

# ---------------------------------------------------------------- 4. .env
if (-not (Test-Path $envPath)) {
  Copy-Item (Join-Path $root ".env.example") $envPath
  Good "Created .env from .env.example"
}
$envText = Get-Content $envPath -Raw
if ($envText -match '(?m)^DATABASE_URL=.*$') {
  $envText = $envText -replace '(?m)^DATABASE_URL=.*$', ('DATABASE_URL="' + $dbUrl + '"')
} else {
  $envText += "`nDATABASE_URL=`"$dbUrl`"`n"
}
# Local development defaults so links between the two apps resolve.
foreach ($pair in @(
  @("NEXT_PUBLIC_SITE_URL",      "http://localhost:3000"),
  @("NEXT_PUBLIC_MINER_URL",     "http://localhost:3001"),
  @("NEXT_PUBLIC_MAIN_SITE_URL", "http://localhost:3000")
)) {
  $k = $pair[0]; $v = $pair[1]
  if ($envText -match "(?m)^$k=") { $envText = $envText -replace "(?m)^$k=.*$", ($k + '="' + $v + '"') }
  else { $envText += "`n$k=`"$v`"`n" }
}
Set-Content -Path $envPath -Value $envText -Encoding UTF8 -NoNewline
Good ".env configured"

# ---------------------------------------------------------------- 5. install
Write-Host ""
Say "Installing dependencies (a few minutes the first time)..."
pnpm install
if ($LASTEXITCODE -ne 0) { Die "pnpm install failed. Scroll up for the reason." }
Good "Dependencies installed"

# ---------------------------------------------------------------- 6. migrate
Write-Host ""
Say "Applying database migrations..."
pnpm db:migrate:sql
if ($LASTEXITCODE -ne 0) {
  Die "Migrations failed. The usual causes, in order:`n" +
      "        1. PostgreSQL is not running (Docker Desktop stopped?)`n" +
      "        2. The database named in DATABASE_URL does not exist yet`n" +
      "        3. Wrong username or password in .env`n" +
      "      The error above this line says which one it is."
}
Good "Schema applied"

# ---------------------------------------------------------------- 7. seed
Write-Host ""
Say "Seeding foundation, academy and content..."
# Local first-run uses a throwaway database, so opt into the public default
# admin password explicitly. The seed refuses it otherwise (see seed.ts / DR-5).
# Change the admin password immediately after first sign-in, or set ADMIN_PASSWORD.
if (-not $env:ADMIN_PASSWORD) { $env:ALLOW_DEFAULT_ADMIN = "1" }
pnpm db:seed;         if ($LASTEXITCODE -ne 0) { Die "Foundation seed failed." }
pnpm db:seed:academy; if ($LASTEXITCODE -ne 0) { Die "Academy seed failed." }
pnpm db:seed:content; if ($LASTEXITCODE -ne 0) { Die "Content seed failed." }
Good "4 courses, 24 lessons, 3 challenges, 3 products, 3 essays seeded"

# ---------------------------------------------------------------- 8. verify
Write-Host ""
Say "Verifying the platform end to end (26 checks)..."
pnpm --filter @tycoonhood/core exec tsx scripts/verify-platform.ts
if ($LASTEXITCODE -ne 0) { Die "Verification failed. The platform is NOT ready - read the failed checks above." }

# ---------------------------------------------------------------- done
Write-Host ""
Write-Host "  ============ READY ============" -ForegroundColor Green
Write-Host ""
Say "Start it:  press Ctrl+Shift+B in VS Code"
Say "           (or run: pnpm --filter @tycoonhood/web dev)"
Write-Host ""
Say "Then open:"
Say "  http://localhost:3000   the site"
Say "  http://localhost:3001   the Miner"
Write-Host ""
Say "Sign in as admin:"
Say "  email    admin@tycoonhood.local"
Say "  password tycoon-admin-change-me"
Warn "That password is public. Change it before this touches the internet."
Write-Host ""

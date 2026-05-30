param(
  [ValidateSet('docker', 'supabase')]
  [string]$Infra,
  [ValidateSet('run', 'prepare')]
  [string]$Mode
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function Test-Command {
  param([string]$Name)
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Prompt-Choice {
  param(
    [string]$Title,
    [string[]]$Options
  )

  Write-Host ""
  Write-Host $Title
  for ($i = 0; $i -lt $Options.Count; $i++) {
    Write-Host ("  {0}) {1}" -f ($i + 1), $Options[$i])
  }

  while ($true) {
    $answer = (Read-Host "Seleccion")
    if ($answer -match '^[0-9]+$') {
      $index = [int]$answer - 1
      if ($index -ge 0 -and $index -lt $Options.Count) {
        return $index
      }
    }
    Write-Host "Opcion invalida. Intenta de nuevo." -ForegroundColor Yellow
  }
}

function Get-EnvValue {
  param(
    [string]$Path,
    [string]$Key
  )

  if (!(Test-Path $Path)) {
    return $null
  }

  $pattern = "^\s*{0}\s*=\s*(.*)$" -f [regex]::Escape($Key)
  foreach ($line in Get-Content $Path) {
    if ($line -match $pattern) {
      $value = $Matches[1].Trim()
      if ($value.StartsWith('"') -and $value.EndsWith('"')) {
        $value = $value.Trim('"')
      }
      return $value
    }
  }
  return $null
}

Write-Host "Inventori setup (Windows)" -ForegroundColor Cyan

$requiredTools = @('git', 'node', 'pnpm')
$missing = @()
foreach ($tool in $requiredTools) {
  if (!(Test-Command $tool)) {
    $missing += $tool
  }
}

if ($missing.Count -gt 0) {
  Write-Host "Faltan herramientas: $($missing -join ', ')" -ForegroundColor Red
  exit 1
}

if (-not $Infra) {
  $infraIndex = Prompt-Choice "Elige infraestructura:" @(
    'Docker local (postgres/redis/minio)',
    'Supabase (Postgres remoto)'
  )
  $Infra = if ($infraIndex -eq 0) { 'docker' } else { 'supabase' }
}

if ($Infra -eq 'docker' -and !(Test-Command 'docker')) {
  Write-Host "Docker no esta instalado o no esta en PATH." -ForegroundColor Red
  exit 1
}

if (-not $Mode) {
  $modeIndex = Prompt-Choice "Modo de ejecucion:" @(
    'Ejecutar todo (docker, pnpm install, migraciones, pnpm dev)',
    'Solo preparar y mostrar comandos'
  )
  $Mode = if ($modeIndex -eq 0) { 'run' } else { 'prepare' }
}

$envExample = Join-Path $PSScriptRoot '.env.example'
$envFile = Join-Path $PSScriptRoot '.env'

if (!(Test-Path $envExample)) {
  Write-Host ".env.example no existe. No se puede continuar." -ForegroundColor Red
  exit 1
}

if (!(Test-Path $envFile)) {
  Copy-Item $envExample $envFile
  Write-Host "Se creo .env desde .env.example" -ForegroundColor Green
}

Write-Host ""
Write-Host "Variables criticas a completar en .env:" -ForegroundColor Cyan
$requiredKeys = @('JWT_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL')
foreach ($key in $requiredKeys) {
  $value = Get-EnvValue -Path $envFile -Key $key
  if ([string]::IsNullOrWhiteSpace($value)) {
    Write-Host (" - {0} (VACIO)" -f $key) -ForegroundColor Yellow
  } else {
    Write-Host (" - {0}" -f $key)
  }
}

if ($Infra -eq 'supabase') {
  $directValue = Get-EnvValue -Path $envFile -Key 'DIRECT_URL'
  if ([string]::IsNullOrWhiteSpace($directValue)) {
    Write-Host " - DIRECT_URL (recomendado para migraciones en Supabase)" -ForegroundColor Yellow
  } else {
    Write-Host " - DIRECT_URL"
  }
}

Write-Host ""
Write-Host "Comandos que se usaran:" -ForegroundColor Cyan
$commands = @()
if ($Infra -eq 'docker') {
  $commands += 'docker compose up -d postgres redis minio minio-init'
}
$commands += 'pnpm install'
$commands += 'pnpm --filter @erp/api exec prisma migrate deploy'
$commands += 'pnpm --filter @erp/api exec prisma generate'
$commands += 'pnpm dev'

foreach ($cmd in $commands) {
  Write-Host (" - {0}" -f $cmd)
}

if ($Mode -eq 'prepare') {
  Write-Host ""
  Write-Host "Modo preparar: no se ejecutaron comandos." -ForegroundColor Cyan
  exit 0
}

function Run-Command {
  param([string]$Command)
  Write-Host ""
  Write-Host ("> {0}" -f $Command) -ForegroundColor Cyan
  Invoke-Expression $Command
  if ($LASTEXITCODE -ne 0) {
    throw "Comando fallo: $Command"
  }
}

foreach ($cmd in $commands) {
  Run-Command $cmd
}

Write-Host ""
Write-Host "Setup finalizado. Si pnpm dev sigue corriendo, presiona Ctrl+C para detener." -ForegroundColor Green

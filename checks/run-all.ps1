# Полный прогон проверок платформы.
#
# Требования:
#   1. PostgreSQL запущен, база с применённой схемой (npm run db:push).
#   2. Собранное приложение запущено на порту из BASE_URL (по умолчанию 3100).
#   3. В окружении есть ADMIN_PASSWORD и SESSION_SECRET тестового стенда.
#
# Запуск:
#   $env:PSQL = "C:\Program Files\PostgreSQL\16\bin\psql.exe"
#   $env:VERIFY_DB = "app_db"
#   powershell -File checks/run-all.ps1
#
# Каждый сценарий начинается с чистых данных (checks/seed.sql).

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$db = if ($env:VERIFY_DB) { $env:VERIFY_DB } else { "app_db" }
$psql = if ($env:PSQL) { $env:PSQL } else { "psql" }
$seed = "checks\seed.sql"

if (-not $env:SESSION_SECRET) { $env:SESSION_SECRET = "qwerty12345" }
if (-not $env:BASE_URL) { $env:BASE_URL = "http://127.0.0.1:3100" }

function Reset-Data {
  & $psql -h 127.0.0.1 -p 5432 -U postgres -d $db -q -f $seed 2>&1 | Out-Null
}

$tests = @(
  @{ name = "Chat and marketplace"; file = "checks\test-chat-market.js" },
  @{ name = "Pages and access";     file = "checks\e2e.js" },
  @{ name = "Password login";       file = "checks\test-login.js" },
  @{ name = "CSRF";                 file = "checks\test-csrf.js" },
  @{ name = "Executor answer";      file = "checks\test-mutation.js" },
  @{ name = "Owner acceptance";     file = "checks\test-accept.js" },
  @{ name = "Take and rate";        file = "checks\test-take-rate.js" }
)

Write-Output ("db: " + $db + " | base: " + $env:BASE_URL)
$failed = 0
foreach ($t in $tests) {
  Reset-Data
  $output = & node $t.file 2>&1
  if ($LASTEXITCODE -eq 0) {
    Write-Output ("PASS  " + $t.name)
  } else {
    $failed++
    Write-Output ("FAIL  " + $t.name)
    $output | Select-Object -Last 8 | ForEach-Object { Write-Output ("      " + $_) }
  }
}

Write-Output ""
Write-Output "SQL constraints:"
# Важно: проверки ограничений идут на чистых сидах. Тесты выше меняют
# состояние (принимают все позиции), и тогда проверка денег видит не то.
Reset-Data
$sql = @()
$sql += & $psql -h 127.0.0.1 -p 5432 -U postgres -d $db -f checks\check-constraints.sql 2>&1 |
  Select-String -Pattern "PASS|FAIL"
$sql += & $psql -h 127.0.0.1 -p 5432 -U postgres -d $db -f checks\check-chat-guard.sql 2>&1 |
  Select-String -Pattern "PASS|FAIL"

foreach ($line in $sql) { Write-Output ("      " + $line.Line) }

$sqlFailed = @($sql | Where-Object { $_.Line -match "FAIL" }).Count
if ($sqlFailed -gt 0) { $failed += $sqlFailed }

Write-Output ""
if ($failed -eq 0) { Write-Output "all suites passed" } else { Write-Output ("failures: " + $failed) }
exit $failed

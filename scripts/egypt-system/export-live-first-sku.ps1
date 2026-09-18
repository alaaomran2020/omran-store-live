param(
  [string]$Server = "(local)",
  [string]$Database = "ESStores",
  [string]$OutputCsv = "database/egypt-system-readonly/live-first-sku.csv"
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "../..")
$queryPath = Join-Path $repoRoot "database/egypt-system-readonly/verify-first-sku.sql"
$outputPath = Join-Path $repoRoot $OutputCsv

if (-not (Test-Path $queryPath)) { throw "Query file not found: $queryPath" }
$query = [System.IO.File]::ReadAllText($queryPath)

$forbidden = '(?im)\b(INSERT|UPDATE|DELETE|MERGE|ALTER|DROP|TRUNCATE|CREATE|EXEC(?:UTE)?|DBCC|BACKUP|RESTORE)\b'
if ([regex]::IsMatch($query, $forbidden)) { throw "READ_ONLY_GUARD_FAILED: query contains a forbidden write/admin verb" }

$client = Get-Command sqlcmd -ErrorAction SilentlyContinue
$kind = "sqlcmd"
if (-not $client) {
  $client = Get-Command osql -ErrorAction SilentlyContinue
  $kind = "osql"
}
if (-not $client) { throw "SQL_CLIENT_NOT_FOUND: install/use sqlcmd or osql on the Egypt System machine" }

$temp = Join-Path $env:TEMP ("egypt-first-sku-" + [guid]::NewGuid().ToString("N") + ".txt")
try {
  $args = @("-S", $Server, "-d", $Database, "-E", "-i", $queryPath, "-s", "|", "-W", "-o", $temp)
  if ($kind -eq "sqlcmd") { $args += @("-b", "-r1") }
  & $client.Source @args
  if ($LASTEXITCODE -ne 0) { throw "SQL_EXPORT_FAILED: $kind exited with code $LASTEXITCODE" }

  $lines = Get-Content -LiteralPath $temp -Encoding Default | Where-Object {
    $_.Trim() -ne "" -and
    $_ -notmatch '^\s*-+(\|-+)+\s*$' -and
    $_ -notmatch '^\s*\(\d+ rows? affected\)\s*$'
  }
  if ($lines.Count -lt 2) { throw "SQL_EXPORT_EMPTY: no matching live row was returned" }

  $headers = $lines[0].Split('|') | ForEach-Object { $_.Trim() }
  $records = @()
  foreach ($line in $lines | Select-Object -Skip 1) {
    $cells = $line.Split('|') | ForEach-Object { $_.Trim() }
    if ($cells.Count -ne $headers.Count) { continue }
    $obj = [ordered]@{}
    for ($i=0; $i -lt $headers.Count; $i++) { $obj[$headers[$i]] = $cells[$i] }
    $records += [pscustomobject]$obj
  }
  if ($records.Count -lt 1) { throw "SQL_EXPORT_EMPTY: no parseable row was returned" }

  $dir = Split-Path -Parent $outputPath
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  $records | Export-Csv -LiteralPath $outputPath -NoTypeInformation -Encoding UTF8
  Write-Output "LIVE_EXPORT_OK=$outputPath"
  Write-Output "ROWS=$($records.Count)"
} finally {
  Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue
}
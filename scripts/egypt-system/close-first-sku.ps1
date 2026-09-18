param(
  [string]$Server = "(local)",
  [string]$Database = "ESStores"
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "../..")
$csv = Join-Path $repoRoot "database/egypt-system-readonly/live-first-sku.csv"
$verified = Join-Path $repoRoot "database/egypt-system-readonly/live-first-sku.verified.json"
$stage = Join-Path $repoRoot "database/egypt-system-readonly/live-first-sku.stage.sql"

& (Join-Path $PSScriptRoot "export-live-first-sku.ps1") -Server $Server -Database $Database -OutputCsv "database/egypt-system-readonly/live-first-sku.csv"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

node (Join-Path $PSScriptRoot "verify-first-sku.mjs") $csv $verified
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

node (Join-Path $PSScriptRoot "verified-payload-to-sql.mjs") $verified $stage
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Output "FIRST_SKU_VERIFIED=$verified"
Write-Output "STAGING_SQL_READY=$stage"
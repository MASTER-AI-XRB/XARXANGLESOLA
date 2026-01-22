Param(
  [string]$EnvFile = ".env.test"
)

if (-not (Test-Path $EnvFile)) {
  Write-Error "No s'ha trobat el fitxer $EnvFile. Crea'l abans."
  exit 1
}

Get-Content $EnvFile | ForEach-Object {
  $line = $_.Trim()
  if ($line -and -not $line.StartsWith("#")) {
    $parts = $line.Split("=", 2)
    if ($parts.Length -eq 2) {
      $name = $parts[0].Trim()
      $value = $parts[1].Trim().Trim('"')
      if ($name) { Set-Item -Path "env:$name" -Value $value }
    }
  }
}

if (-not $env:DATABASE_URL) {
  Write-Error "DATABASE_URL no està definit a $EnvFile."
  exit 1
}

Write-Host "➡️  Generant Prisma Client..."
Remove-Item -Recurse -Force .\node_modules\.prisma -ErrorAction SilentlyContinue
npx prisma generate

Write-Host "➡️  Aplicant esquema a BD de test..."
npx prisma db push

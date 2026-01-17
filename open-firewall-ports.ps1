# Script per obrir els ports del firewall per a Xarxa Anglesola
# Executa aquest script com a Administrador

Write-Host "Obrint ports del firewall per a Xarxa Anglesola..." -ForegroundColor Green

# Port 3000 (Next.js)
New-NetFirewallRule -DisplayName "Xarxa Anglesola - Port 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue
Write-Host "Port 3000 obert" -ForegroundColor Green

# Port 3001 (Socket.io)
New-NetFirewallRule -DisplayName "Xarxa Anglesola - Port 3001" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue
Write-Host "Port 3001 obert" -ForegroundColor Green

Write-Host "`nPorts oberts correctament!" -ForegroundColor Green
Write-Host "Ara pots accedir des del telèfon usant la IP local que es mostra quan inicies el servidor." -ForegroundColor Yellow


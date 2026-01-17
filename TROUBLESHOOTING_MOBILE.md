# Solució de problemes: Connexió des del telèfon

## Problemes comuns i solucions

### 1. Verificar que el telèfon i l'ordinador estiguin a la mateixa xarxa Wi-Fi
- Assegura't que ambdós dispositius estiguin connectats a la mateixa xarxa Wi-Fi
- No utilitzis dades mòbils al telèfon

### 2. Verificar el firewall de Windows
El firewall pot estar bloquejant els ports 3000 i 3001.

**Solució:**
1. Obre "Windows Defender Firewall" o "Firewall de Windows"
2. Clica a "Configuración avanzada"
3. Clica a "Reglas de entrada" → "Nueva regla"
4. Selecciona "Puerto" → "TCP"
5. Ports específics: `3000, 3001`
6. Permet la connexió
7. Repeteix per "Reglas de salida"

**O des de PowerShell (com a administrador):**
```powershell
New-NetFirewallRule -DisplayName "Xarxa Anglesola - Port 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Xarxa Anglesola - Port 3001" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

### 3. Verificar la IP local
Executa a la terminal:
```bash
ipconfig | findstr /i "IPv4"
```

Assegura't que la IP que obtens és la correcta (normalment comença per 192.168.x.x o 10.x.x.x)

### 4. Provar la connexió
Des del telèfon, prova a accedir directament:
- `http://[TU_IP]:3000` (exemple: http://192.168.1.130:3000)

Si no carrega, el problema és el firewall o la xarxa.

### 5. Verificar que el servidor estigui escoltant correctament
Quan inicies el servidor amb `npm run dev`, hauries de veure:
```
> Ready on http://localhost:3000
> Accés des del telèfon: http://[TU_IP]:3000
> Socket.io servidor a http://localhost:3001
> Socket.io accés des del telèfon: http://[TU_IP]:3001
```

### 6. Problemes amb Socket.io
Si la pàgina web carrega però el xat no funciona:
- Obre la consola del navegador del telèfon (Chrome: chrome://inspect)
- Busca errors de CORS o de connexió
- Verifica que la URL de Socket.io sigui correcta

### 7. Provar des d'un altre dispositiu
Si tens un altre ordinador a la mateixa xarxa, prova a accedir des d'allà per verificar que el problema no és específic del telèfon.

## Comprovació ràpida

1. ✅ Telèfon i ordinador a la mateixa Wi-Fi
2. ✅ Firewall permet ports 3000 i 3001
3. ✅ IP local correcta (executa `ipconfig`)
4. ✅ Servidor mostra la IP a la consola
5. ✅ Accedeixes amb `http://[IP]:3000` (no localhost)

## Si res funciona

1. Reinicia el router Wi-Fi
2. Reinicia l'ordinador
3. Prova des d'un altre dispositiu
4. Verifica que no hi hagi un antivirus bloquejant les connexions


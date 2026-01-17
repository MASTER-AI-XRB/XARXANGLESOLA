# Configurar IP Estàtica per a Desenvolupament

## Per què configurar una IP estàtica?

Quan la IP del teu ordinador canvia (per exemple, de 192.168.1.130 a 192.168.1.131), el socket pot tenir problemes de connexió, especialment si tens l'app oberta al mòbil amb la IP antiga.

## Solució: Configurar IP Estàtica

### Opció 1: Configurar IP Estàtica al Router (Recomanat)

1. **Accedeix al teu router** (normalment http://192.168.1.1 o http://192.168.0.1)
2. **Troba la secció de DHCP/Reservació d'IP** (pot estar a "Network", "LAN", "DHCP Server")
3. **Afegeix una reserva d'IP** per al teu ordinador:
   - MAC Address del teu ordinador (pots trobar-la amb `ipconfig /all` a Windows)
   - IP que vols reservar (per exemple, 192.168.1.130)
4. **Guarda els canvis** i reinicia el router si cal

### Opció 2: Configurar IP Estàtica a Windows

1. **Obre Configuració de xarxa**:
   - Clic dret a la icona de xarxa a la barra de tasques
   - "Obre configuració de xarxa i Internet"
   - "Canviar opcions de l'adaptador"

2. **Configura l'adaptador**:
   - Clic dret a la teva connexió (Wi-Fi o Ethernet)
   - "Propietats"
   - Selecciona "Protocol d'Internet versió 4 (TCP/IPv4)"
   - Clic a "Propietats"

3. **Configura IP estàtica**:
   - Selecciona "Utilitzar la següent adreça IP"
   - **Adreça IP**: 192.168.1.130 (o la que vulguis)
   - **Màscara de subxarxa**: 255.255.255.0 (normalment)
   - **Porta d'enllaç per defecte**: 192.168.1.1 (la IP del teu router)
   - **Servidor DNS preferit**: 192.168.1.1 o 8.8.8.8

4. **Aplica els canvis**

### Com trobar la configuració actual del teu router

A Windows, executa a PowerShell:
```powershell
ipconfig /all
```

Busca:
- **Default Gateway**: Aquesta és la IP del teu router
- **Subnet Mask**: Normalment 255.255.255.0
- **IPv4 Address**: La teva IP actual

## És segur?

**Sí, és completament segur** configurar una IP estàtica a la teva xarxa local. Això només afecta la teva xarxa domèstica i no exposa res a Internet.

## Alternativa: Millorar la detecció automàtica

Si no vols configurar una IP estàtica, el codi ja detecta automàticament la IP correcta basant-se en `window.location.hostname`. Però si la IP canvia mentre l'app està oberta, hauràs de:

1. Tancar i tornar a obrir l'app al mòbil
2. O refrescar la pàgina

La configuració d'IP estàtica és la solució més robusta per a desenvolupament.


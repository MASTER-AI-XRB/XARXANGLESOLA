# Tests

## Base de dades de test
Per evitar tocar la BD de producció, crea un fitxer `.env.test` (no versionat) amb:

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB_NAME?schema=public"
# Opcional
AUTH_SECRET="change-me-for-tests"
```

Playwright carregarà automàticament `.env.test` i arrencarà el servidor amb aquesta BD.

## Com executar

1) Instal·lar navegadors (1 vegada):

```
npx playwright install
```

2) Tests unitaris:

```
npm run test:unit
```

3) Tests e2e:

**Opció A – Playwright engega el servidor (recomanat)**  
Assegura’t que **cap procés** està usant els ports 3005 i 3006. Després:

```
npx playwright test tests/e2e/favorites.spec.ts
```

**Opció B – Servidor engegat a mà (per exemple per fer servir `--ui`)**  
En una terminal, engega l’app al port que fa servir Playwright:

```
npm run dev:playwright
```

En una altra terminal:

```
npx playwright test tests/e2e/favorites.spec.ts --ui
```

**Si surt "address already in use" (3005 o 3006)**  
Allibera els ports. A PowerShell (executar com a administrador si cal):

```powershell
# Quin procés usa el 3005
Get-NetTCPConnection -LocalPort 3005 -ErrorAction SilentlyContinue | Select-Object OwningProcess
# Matar el procés (substitueix PID pel número que surti)
Stop-Process -Id PID -Force
```

O tanca totes les terminals on tinguis `npm run dev` o Playwright i torna a obrir-ne una de nova.

## Provar notificacions (reserva / preferits) des de local

Sí, **és correcte** provar des de local i que la notificació arribi a un usuari en producció, si configures l'entorn així:

1. Al teu **.env local**, posa la URL del socket de **producció** i el mateix secret que fa servir el servidor de producció:
   - `NEXT_PUBLIC_SOCKET_URL=https://el-teu-servidor.up.railway.app` (o la URL del teu socket en producció)
   - `AUTH_SECRET` (o `NOTIFY_SECRET`) **igual** que el que té el servidor Socket en producció (Railway, etc.)

2. En fer **reservar** o **desreservar** des de l'app en local, la teva API (local) farà un `POST` a `NEXT_PUBLIC_SOCKET_URL/notify`. Si aquesta URL és la de producció, la notificació s'envia al servidor de producció i l'usuari que ha de rebre-la (per exemple qui té el producte a preferits) la rep en producció (in-app si té l'app oberta, o push si ho tens configurat).

Requisits: el servidor Socket en producció ha de rebre requests del teu ordinador (no bloquejar per IP/firewall) i el **secret** ha de coincidir; si no, el `/notify` retornarà 401 Unauthorized.

Si en local tens `NEXT_PUBLIC_SOCKET_URL=http://localhost:3001`, les notificacions només aniran al teu socket local i **no** arribaran a usuaris en producció.

## Neteja automàtica
- Després d’executar els e2e, la BD de test es reinicia automàticament.
- Si ho vols fer manualment:

```
npm run test:db:reset
```

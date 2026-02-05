# Configuració Web Push (notificacions amb l’app tancada)

Per rebre notificacions quan l’app està tancada cal configurar les claus VAPID i les variables d’entorn.

## 1. Generar claus VAPID

A la arrel del projecte:

```bash
npm run generate-vapid
```

Surt alguna cosa com:

```
=======================================
Public Key:
BPx...xxx

Private Key:
yyy...zzz
=======================================
```

## 2. Variables d’entorn

Afegeix al teu `.env` (i als env de producció: Vercel, Railway, etc.):

```
VAPID_PUBLIC_KEY=<la Public Key del pas 1>
VAPID_PRIVATE_KEY=<la Private Key del pas 1>
```

Opcional:

```
VAPID_MAILTO=mailto:el-teu@email.com
```

Si no poses `VAPID_MAILTO`, es fa servir `mailto:noreply@xarxanglesola.local`.

## 3. Base de dades

Després de generar les claus i configurar l’env:

```bash
npx prisma generate
npx prisma db push
```

(o `npx prisma migrate dev` si fas servir migracions).

**Nota:** Tanca el servidor de desenvolupament abans d’executar `prisma generate` si et surt error `EPERM` (fitxer blocat).

## 4. Producció

- Configura `VAPID_PUBLIC_KEY` i `VAPID_PRIVATE_KEY` als env del teu hosting.
- Assegura’t que l’app corre en **HTTPS** (Web Push ho exigeix; localhost és vàlid en dev).
- `NEXT_PUBLIC_APP_URL` ha d’estar definit si vols enllaços absoluts a les notificacions (p. ex. `https://tu-domini.com`).

## Resum

| Què | On |
|-----|-----|
| Generar VAPID | `npm run generate-vapid` |
| Afegir env | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` |
| DB | `prisma generate` + `prisma db push` (o migrate) |
| HTTPS | Obligatori en producció |

Si no configures VAPID, les notificacions només es rebràn amb l’app oberta (via Socket), com abans.

## 5. Servidor Socket (Railway)

El servidor Socket.IO (Railway) és qui rep les peticions `/notify` des de Vercel i envia tant la notificació in-app (socket) com la push (navegador). Cal que a **Railway** tinguis:

| Variable | Descripció |
|----------|------------|
| `AUTH_SECRET` o `NOTIFY_SECRET` | **El mateix valor** que a Vercel. Si no coincideix, Vercel rebran 401 en cridar `/notify`. |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Les mateixes claus que a Vercel. Sense això, no s’envien notificacions push quan l’app està tancada. |
| `DATABASE_URL` | La mateixa BD que Vercel (Neon), per llegir preferències i subscripcions push. |
| `NEXT_PUBLIC_APP_URL` | URL pública de l’app (p. ex. `https://xarxanglesola.vercel.app`) per enllaços a les notificacions. |

A **Vercel** cal:

- `NEXT_PUBLIC_SOCKET_URL`: URL del servidor Socket a Railway (p. ex. `https://xarxanglesola-production.up.railway.app`).
- `AUTH_SECRET` (o `NOTIFY_SECRET`): el mateix valor que a Railway.

## 6. Depuració

- **Vercel (Build & Logs)**: Si surt `Notify reserva-preferits fallit` amb `status: 401`, el token no coincideix: comprova que `AUTH_SECRET` (o `NOTIFY_SECRET`) sigui idèntic a Vercel i Railway.
- **Railway (Logs)**: Cerca `[notify]`:
  - `Enviat via socket: <userId>` → notificació enviada per Socket (usuari amb l’app oberta).
  - `Web Push enviat: <userId>` → notificació enviada com a push (navegador).
  - `VAPID no configurat` → afegeix les claus VAPID a Railway.
  - `Cap subscripció push` → l’usuari no ha activat notificacions al navegador o no s’ha desat la subscripció (ha d’entrar a Configuració i activar les notificacions).
- **App oberta**: Si el socket no connecta (401 a `socket-token`), l’usuari no rebrà notificacions in-app; cal que el login i el token de Socket.IO siguin correctes.

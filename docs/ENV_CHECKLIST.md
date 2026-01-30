# Checklist de variables d'entorn

## El que tens a Vercel (vercel.png)

Variables configurades al projecte Vercel:

| Variable | Entorns |
|----------|---------|
| `AUTH_SECRET` | All Environments |
| `BLOB_READ_WRITE_TOKEN` | All Environments |
| `DATABASE_URL` | Production and Preview |
| `GOOGLE_CLIENT_ID` | All Environments |
| `GOOGLE_CLIENT_SECRET` | All Environments |
| `NEXTAUTH_URL` | All Environments |
| `NEXT_PUBLIC_ALLOWED_ORIGINS` | All Environments |
| `NEXT_PUBLIC_APP_URL` | All Environments |
| `NEXT_PUBLIC_SOCKET_URL` | All Environments |
| `VAPID_PRIVATE_KEY` | All Environments |
| `VAPID_PUBLIC_KEY` | All Environments |

**Vercel està complet** per al que fa el codi: auth, DB, Google, Socket, VAPID, Blob i enllaços.  
*Nota:* `NEXT_PUBLIC_ALLOWED_ORIGINS` la fa servir el **servidor Socket a Railway** (CORS), no Next.js; tenir-la a Vercel no molesta però no s’utilitza allí.

---

## El que tens a Railway (railway.png)

Variables que tens configurades al servei Socket a Railway:

| Variable | Per al servidor Socket |
|----------|-------------------------|
| `AUTH_SECRET` | Sí (tokens de sessió). |
| `DATABASE_URL` | Sí (Prisma, push subscriptions). |
| `NEXT_PUBLIC_ALLOWED_ORIGINS` | Sí (CORS, URL de Vercel). |
| `VAPID_PUBLIC_KEY` | Sí (web-push). |
| `VAPID_PRIVATE_KEY` | Sí (web-push). |

**No es contemplen per al servidor Socket** (no les fa servir el codi del socket; pots deixar-les o treure-les si vols):  
`EMAIL_PASS` (l’enviament d’email és a Vercel, no al socket), `NODE_ENV` (Railway sovint la inyecta).

**Et falta afegir a Railway:**  
- **`NEXT_PUBLIC_APP_URL`** = URL de l’app (p. ex. `https://xarxanglesola.vercel.app`). Sense ella, l’enllaç quan es clica una notificació push pot ser incorrecte.

Opcional: `NOTIFY_SECRET` (mateix que a Vercel), `VAPID_MAILTO`.  
`PORT` Railway sovint la inyecta; si no, afegeix-la.

**Variables que Railway afegeix automàticament** (no cal configurar-les tu):  
`RAILWAY_PUBLIC_DOMAIN`, `RAILWAY_PRIVATE_DOMAIN`, `RAILWAY_PROJECT_NAME`, `RAILWAY_ENVIRONMENT_NAME`, `RAILWAY_SERVICE_NAME`, `RAILWAY_PROJECT_ID`, `RAILWAY_ENVIRONMENT_ID`, `RAILWAY_SERVICE_ID`.

---

## El que tens en local

**`.env`** (4 variables):
- `NEXT_PUBLIC_SOCKET_URL`
- `DATABASE_URL`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

**`.env.local`** (5 variables):
- `NEXT_PUBLIC_SOCKET_URL`
- `DATABASE_URL`
- `AUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

En local, Next.js combina `.env` i `.env.local` (`.env.local` té prioritat). Tens tot el bàsic per login, DB, socket i VAPID.

---

## Variables opcionals (si et falten en algun lloc)

| Variable | On | Què passa si no hi és |
|--------|----|------------------------|
| `NOTIFY_SECRET` | Vercel i Railway | Si no hi és, el codi fa servir `AUTH_SECRET` per `/notify`. Si la poseu, ha de ser **la mateixa** als dos llocs. |
| `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` | Vercel | Només per “oblidar contrasenya”; sense elles, no s’envia correu. |
| `VAPID_MAILTO` | Railway | Opcional; per web-push. Per defecte: `mailto:noreply@xarxanglesola.local`. |

---

## Resum

- **Vercel:** amb el que surt a vercel.png tens tot el necessari (auth, DB, Google, Socket, VAPID, Blob, enllaços).
- **Railway:** tens `AUTH_SECRET`, `DATABASE_URL`, `NEXT_PUBLIC_ALLOWED_ORIGINS`, `VAPID_*`. **Afegeix** `NEXT_PUBLIC_APP_URL` (URL de Vercel) perquè les notificacions push obrin l’enllaç correcte. `EMAIL_PASS` i `NODE_ENV` no les fa servir el socket; les 8 variables `RAILWAY_*` les inyecta Railway.
- **Local:** `.env` + `.env.local` són suficients per desenvolupar.

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

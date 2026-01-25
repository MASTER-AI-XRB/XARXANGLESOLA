# Producció: Login, OAuth i Configuració

Els fluxos de login (formulari, Google, desvincular, canviar compte) funcionen igual en producció. Cal assegurar **variables d’entorn**, **Google OAuth** i **base de dades**.

---

## 1. Variables d’entorn obligatòries

### Vercel (Next.js + API routes)

| Variable | Obligatòria | Notes |
|----------|-------------|--------|
| `NEXTAUTH_URL` | **Sí** | URL pública de l’app **sense** barra final (ex: `https://xarxanglesola.vercel.app`). A Vercel pots omitir-la si tens `VERCEL_URL` (el codi fa fallback). |
| `AUTH_SECRET` | **Sí** | Necessària per sessions i cookies. En producció sense ella el middleware retorna 500 per APIs que no siguin GET/HEAD/OPTIONS. |
| `GOOGLE_CLIENT_ID` | Sí (si uses Google) | De Google Cloud Console. |
| `GOOGLE_CLIENT_SECRET` | Sí (si uses Google) | De Google Cloud Console. |
| `DATABASE_URL` | **Sí** | PostgreSQL (Neon, Supabase, Railway, etc.). |

### Railway (si desplegues l’app Next.js allà)

- **`NEXTAUTH_URL`**: **Cal definir-la sempre**. Railway no dóna `VERCEL_URL`, i el fallback de `lib/nextauth.ts` només s’aplica a Vercel. Posar la URL pública del desplegament a Railway (ex: `https://xxx.up.railway.app`).
- La resta: `AUTH_SECRET`, `GOOGLE_*`, `DATABASE_URL`, igual que a Vercel.

### Opcionals però recomanades

- `NEXT_PUBLIC_APP_URL`: URL de l’app (per links, etc.).
- `NEXT_PUBLIC_ALLOWED_ORIGINS`: Orígens permesos per al middleware (CORS). Si l’app és a `https://xarxanglesola.vercel.app`, afegir aquest valor. Si tens app + Socket en dominis diferents, incloure’ls tots.

---

## 2. Google OAuth (Producció)

A [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → el teu client OAuth 2.0:

**Authorized redirect URIs** ha d’incloure:

- Producció Vercel:  
  `https://el-teu-domini.vercel.app/api/auth/callback/google`
- Producció Railway (si s’usa):  
  `https://el-teu-domini.up.railway.app/api/auth/callback/google`
- Local:  
  `http://localhost:3000/api/auth/callback/google` (o el port que facis servir).

**Authorized JavaScript origins** (si ho tens configurat):

- Les mateixes bases: `https://...vercel.app`, `https://...railway.app`, `http://localhost:3000`.

Si falta la URI de producció, veuràs errors tipus `redirect_uri_mismatch` o `OAuthSignin` en clicar «Continua amb Google».

---

## 3. Base de dades (Prisma)

- **Schema**: `User.lastLoginAt` s’ha afegit al schema. En producció la BD ha d’estar actualitzada.
- **Com fer-ho**:
  - Amb migracions: `npx prisma migrate deploy` (després de configurar `DATABASE_URL` de producció).
  - Amb `db push`: `npx prisma db push` (adequat si no usas migracions a prod).

Sense això, les APIs que llegeixen/escriuen `lastLoginAt` poden fallar.

---

## 4. Cookies i dominis

- Sessions (NextAuth + `xarxa_session`) es configuren amb `secure: true` en producció i `sameSite: 'lax'`.
- No cal configurar domini de cookies si l’app es serveix des del mateix domini (ex: tot a `xarxanglesola.vercel.app`).
- Si l’app i el Socket estan en dominis diferents (ex: app a Vercel, Socket a Railway), cal que `NEXT_PUBLIC_ALLOWED_ORIGINS` inclogui ambdós i que CORS/cookies estiguin bé als serveis que facin APIs; els fluxos de **login en si** no canvien.

---

## 5. Resum per entorn

| Entorn | NEXTAUTH_URL | Altres |
|--------|----------------|--------|
| **Vercel** | Opcional si hi ha `VERCEL_URL`; recomanat posar-la igualment | `AUTH_SECRET`, `GOOGLE_*`, `DATABASE_URL`. Redirect URI de Google = `https://...vercel.app/api/auth/callback/google`. |
| **Railway** | **Obligatòria**: URL pública del deploy | Mateix que a dalt. Redirect URI = `https://...railway.app/api/auth/callback/google`. |
| **Local** | Opcional (`http://localhost:3000`) | Google redirect URI inclou `http://localhost:3000/...`. |

---

## 6. Comprovar que tot va bé

1. **Formulari**: Login / registre amb nickname + contrasenya.
2. **Google**: «Continua amb Google» → veure selector de comptes → entrar a l’app.
3. **Configuració**: «Desvincula Google» → logout → tornar a entrar amb formulari o Google.
4. **Canviar compte**: «Canvia el compte de Google» → logout → selector de Google → triar un altre compte i entrar.

Si tot això funciona en local i en producció tens les variables, Google i la BD correctes, el comportament ha de ser el mateix a Vercel i a Railway.

# Guia de Desplegament a Railway - Servidor Socket.IO

Aquesta guia t'explica pas a pas com desplegar el servidor Socket.IO a Railway.

## 📋 Requisits Previs

1. **Compte de Railway**: [https://railway.app](https://railway.app) (gratuït)
2. **Repositori GitHub**: El teu projecte ha d'estar a GitHub
3. **Base de dades PostgreSQL**: La mateixa que utilitzes a Vercel

## 🚀 Pas 1: Crear Projecte a Railway

1. Accedeix a [Railway.app](https://railway.app) i inicia sessió amb GitHub
2. Clic a **"New Project"**
3. Selecciona **"Deploy from GitHub repo"**
4. Selecciona el teu repositori `XARXANGLESOLA`

## ⚙️ Pas 2: Configurar el Servei

### Opció A: Configuració Manual (Recomanat)

1. Railway detectarà automàticament el projecte
2. A la configuració del servei, configura:
   - **Root Directory**: Deixa buit (o `/` si demana alguna cosa)
   - **Build Command**: Deixa buit (Railway ho detectarà automàticament)
   - **Start Command**: `node socket-server.js`

### Opció B: Usant railway.json

Si Railway no detecta la configuració automàticament, assegura't que el fitxer `railway.json` estigui al repositori.

## 🔑 Pas 3: Configurar Variables d'Entorn

A Railway Dashboard → Servei → Variables, afegeix:

### Variables Obligatòries:

```
DATABASE_URL=postgresql://usuari:contrasenya@host:5432/nom_base_dades?schema=public
NODE_ENV=production
PORT=3001
AUTH_SECRET=<el mateix que a Vercel>
NOTIFY_SECRET=<el mateix que AUTH_SECRET o un secret per /notify>
```

### Variables Opcionals (recomanades):

```
NEXT_PUBLIC_ALLOWED_ORIGINS=https://tu-app.vercel.app,https://www.tu-app.vercel.app
NEXT_PUBLIC_APP_URL=https://tu-app.vercel.app
```

Per **notificacions amb l’app tancada** (Web Push), afegeix també:

```
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
```

**Important**: 
- `DATABASE_URL`: Ha de ser la **mateixa** que utilitzes a Vercel
- `PORT`: Railway assignarà automàticament un port, però pots especificar 3001
- `NEXT_PUBLIC_ALLOWED_ORIGINS`: Inclou la URL de la teva aplicació Vercel

## 🔧 Pas 4: Configurar Build i Deploy

Railway detectarà automàticament:
- **Node.js** com a runtime
- **npm install** per instal·lar dependències
- **npx prisma generate** (gràcies al `postinstall` script)

Si hi ha problemes, pots configurar manualment:

### Build Command:
```bash
npm install && npx prisma generate
```

### Start Command:
```bash
node socket-server.js
```

## 📡 Pas 5: Obtenir la URL del Servidor

1. Un cop desplegat, Railway et donarà una URL com:
   - `https://tu-servidor.up.railway.app`
   - O una URL personalitzada si has configurat un domini

2. **Copia aquesta URL** - la necessitaràs per Vercel

## ✅ Pas 6: Verificar el Desplegament

1. Obre la URL del servidor a un navegador
2. Hauries de veure un error 404 o similar (és normal, no és una pàgina web)
3. Revisa els logs a Railway per veure:
   ```
   🚀 Socket.IO servidor corrent al port XXXX
   📡 Orígens permesos: [...]
   ```

## 🔗 Pas 7: Configurar Vercel

Ara configura Vercel per connectar-se al servidor Railway:

1. Vercel Dashboard → Project → Settings → Environment Variables
2. Afegeix:
   ```
   NEXT_PUBLIC_SOCKET_URL=https://tu-servidor.up.railway.app
   ```
3. Fes un redeploy a Vercel

## 🐛 Troubleshooting

### Error: "Cannot find module '@prisma/client'"

**Solució**: Assegura't que el build command inclou `npx prisma generate`:
```bash
npm install && npx prisma generate
```

O verifica que `package.json` tingui:
```json
"postinstall": "prisma generate"
```

### Error: "Database connection failed"

**Solució**: 
- Verifica que `DATABASE_URL` estigui ben configurada
- Assegura't que la base de dades accepta connexions externes
- Comprova que el firewall permet connexions des de Railway

### Error: "Port already in use"

**Solució**: Railway assigna automàticament el port. Assegura't que el codi usa `process.env.PORT`:
```javascript
const port = process.env.PORT || 3001
```

### Error: "Build failed"

**Possibles causes**:
1. **Dependències faltants**: Verifica que totes les dependències estiguin a `package.json`
2. **Prisma no genera**: Assegura't que `prisma/schema.prisma` existeix i està ben configurat
3. **Node version**: Railway detecta automàticament, però pots especificar a `package.json`:
   ```json
   "engines": {
     "node": ">=18.0.0"
   }
   ```

### El servidor no inicia

**Revisa els logs**:
1. Railway Dashboard → Servei → Logs
2. Busca errors de connexió a la base de dades
3. Verifica que totes les variables d'entorn estiguin configurades

### CORS errors

**Solució**: Assegura't que `NEXT_PUBLIC_ALLOWED_ORIGINS` inclogui la URL de Vercel:
```
NEXT_PUBLIC_ALLOWED_ORIGINS=https://tu-app.vercel.app,https://www.tu-app.vercel.app
```

## 📝 Notes Importants

- **Base de dades compartida**: El servidor Socket.IO i Vercel han de compartir la **mateixa** base de dades PostgreSQL
- **HTTPS**: Railway proporciona HTTPS automàticament
- **Port**: Railway assigna el port automàticament - no cal especificar-lo manualment
- **Logs**: Pots veure els logs en temps real a Railway Dashboard
- **Redeploy**: Cada push al repositori farà un redeploy automàtic

## 🔄 Actualitzar el Desplegament

Per actualitzar el servidor:
1. Fes push dels canvis al repositori GitHub
2. Railway farà un redeploy automàtic
3. O pots fer clic a "Redeploy" a Railway Dashboard

## 💰 Costs

Railway ofereix:
- **Pla gratuït**: $5 de crèdit gratuït al mes
- **Hobby**: $5/mes amb més recursos
- El servidor Socket.IO és lleuger i hauria de cabre al pla gratuït

## 🆘 Suport

Si tens problemes:
1. Revisa els logs a Railway Dashboard
2. Verifica les variables d'entorn
3. Comprova que la base de dades estigui accessible
4. Consulta la documentació de Railway: [https://docs.railway.app](https://docs.railway.app)

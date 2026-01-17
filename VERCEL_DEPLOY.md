# Guia de Deploy a Vercel - Xarxa Anglesola

Aquesta guia t'explica com desplegar el projecte a Vercel de forma ràpida i senzilla.

## 📋 Requisits Previs

1. **Compte de Vercel** (gratuït): [https://vercel.com/signup](https://vercel.com/signup)
2. **Base de dades PostgreSQL**: Necessitaràs una base de dades PostgreSQL per producció (veure opcions a sota)
3. **Repositori GitHub**: El projecte ja està a `git@github.com:MASTER-AI-XRB/XARXANGLESOLA.git`

## 🗄️ Base de Dades PostgreSQL

Vercel no proporciona bases de dades. Hauràs de configurar una externa. Opcions gratuïtes:

### Opció 1: Neon (Recomanat) - Gratuït
- URL: [https://neon.tech](https://neon.tech)
- PostgreSQL gestionat
- Pla gratuït: 512 MB d'espai

### Opció 2: Supabase - Gratuït
- URL: [https://supabase.com](https://supabase.com)
- PostgreSQL + funcionalitats extra

### Opció 3: Railway - Gratuït (limitats)
- URL: [https://railway.app](https://railway.app)
- $5 de crèdit gratuït al mes

## 🚀 Pas 1: Preparar el Schema de Prisma

Abans de desplegar, necessites configurar Prisma per PostgreSQL:

1. **Actualitza `prisma/schema.prisma`**:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

⚠️ **Nota**: Després del deploy, pots mantenir SQLite per desenvolupament local si vols.

## 🔧 Pas 2: Desplegar a Vercel

### Mètode 1: Mitjançant el Dashboard de Vercel (Recomanat)

1. **Accedeix a Vercel**:
   - Ves a [https://vercel.com](https://vercel.com)
   - Inicia sessió amb GitHub

2. **Importa el Projecte**:
   - Clic a "Add New..." → "Project"
   - Selecciona el repositori `MASTER-AI-XRB/XARXANGLESOLA`
   - Vercel detectarà automàticament Next.js

3. **Configuració del Projecte**:
   - **Framework Preset**: Next.js (detectat automàticament)
   - **Root Directory**: `./` (deixa'l buit)
   - **Build Command**: `npm run build` (per defecte)
   - **Output Directory**: `.next` (per defecte)
   - **Install Command**: `npm install` (per defecte)

### Mètode 2: Mitjançant Vercel CLI

```bash
# Instal·la Vercel CLI
npm i -g vercel

# Des del directori del projecte
vercel

# Segueix les instruccions de la CLI
```

## 🔑 Pas 3: Configurar Variables d'Entorn

A Vercel Dashboard → Project → Settings → Environment Variables, afegeix:

### Variables Obligatòries:

```
DATABASE_URL=postgresql://usuari:contrasenya@host:5432/nom_base_dades?schema=public
NODE_ENV=production
```

### Variables Opcionals (recomanades):

```
NEXT_PUBLIC_APP_URL=https://tu-projecte.vercel.app
NEXT_PUBLIC_ALLOWED_ORIGINS=https://tu-projecte.vercel.app
NEXT_PUBLIC_SOCKET_URL=https://tu-projecte.vercel.app
```

⚠️ **Important**: 
- `DATABASE_URL`: Ha de ser la URL de la teva base de dades PostgreSQL
- `NEXT_PUBLIC_APP_URL`: S'actualitzarà automàticament després del primer deploy
- Per `NEXT_PUBLIC_SOCKET_URL`, veure secció Socket.io més avall

### Configurar per Entorns:

- **Production**: Variables per producció
- **Preview**: Variables per previews (opcional)
- **Development**: Variables per desenvolupament local (opcional)

## 🗃️ Pas 4: Executar Migracions de la Base de Dades

Després del primer deploy, executa les migracions:

```bash
# Opció 1: Executar des de local (amb DATABASE_URL configurada)
npx prisma migrate deploy

# Opció 2: Executar via Vercel CLI
vercel env pull .env.local  # Descarregar variables d'entorn
npx prisma migrate deploy
```

## 📁 Pas 5: Configurar Imatges (Important)

Les imatges es guarden a `public/uploads/`. A Vercel:

1. **Opció 1**: Utilitzar Vercel Blob Storage (requereix pla Pro o usar una alternativa)
2. **Opció 2**: Utilitzar un servei extern (Cloudinary, AWS S3, etc.)
3. **Opció 3**: De moment, deixar-ho funcionar (les imatges es perdran en cada redeploy)

⚠️ **Nota**: `public/uploads/` es regenera en cada deploy. Per producció, considera usar cloud storage.

## 🔌 Pas 6: Socket.io (Temporal)

Socket.io amb `server.js` personalitzat **no funcionarà directament** a Vercel perquè Vercel utilitza Serverless Functions.

### Solucions:

1. **Deshabilitar Socket.io temporalment**: El xat no funcionarà fins que s'adapti
2. **Adaptar Socket.io**: Utilitzar Vercel Serverless Functions (requereix canvis al codi)
3. **Servidor separat**: Executar Socket.io en un altre servidor (Railway, Render, etc.)

Per ara, deixa `NEXT_PUBLIC_SOCKET_URL` sense configurar i el xat estarà deshabilitat.

## ✅ Pas 7: Verificar el Deploy

1. Vercel farà el deploy automàticament
2. Podràs veure l'URL del projecte (ej: `https://xarxanglesola.vercel.app`)
3. Visita la URL i verifica que funciona

## 🔍 Troubleshooting

### Error: "Database connection failed"
- Verifica que `DATABASE_URL` estigui ben configurada
- Assegura't que la base de dades accepta connexions des d'exterior
- Comprova que el firewall permet connexions des d'IPs de Vercel

### Error: "Prisma Client not generated"
- Vercel executa `postinstall` automàticament (que inclou `prisma generate`)
- Si continua fallant, verifica `package.json` → `postinstall`

### Les imatges no es carreguen
- Assegura't que `public/uploads/` existeix
- Verifica els permisos
- Considera usar cloud storage per producció

### Error de build
- Revisa els logs de build a Vercel Dashboard
- Verifica que totes les dependències estiguin a `package.json`

## 📝 Notes Addicionals

- **Builds automàtics**: Cada push a `main` farà un deploy automàtic
- **Preview deployments**: Cada pull request genera una URL de preview
- **Custom domain**: Pots configurar un domini personalitzat a Settings → Domains

## 🆘 Suport

Si tens problemes:
1. Revisa els logs a Vercel Dashboard → Deployments
2. Consulta la documentació de Vercel: [https://vercel.com/docs](https://vercel.com/docs)
3. Revisa aquesta guia

---

**Següent pas**: Un cop desplegat, pots configurar un domini personalitzat i optimitzar per producció.

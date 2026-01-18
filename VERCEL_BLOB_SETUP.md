# Guia de Configuració de Vercel Blob Storage

Aquesta guia t'explica com configurar Vercel Blob Storage per poder pujar imatges de productes a producció.

## 📋 Requisits

- Compte de Vercel amb el projecte desplegat
- Accés al Dashboard de Vercel

## 🚀 Pas 1: Crear Blob Store

1. **Accedeix a Vercel Dashboard**:
   - Ves a [https://vercel.com](https://vercel.com)
   - Inicia sessió si cal

2. **Accedeix al teu projecte**:
   - Clica al projecte "XARXANGLESOLA"

3. **Obre la secció Storage**:
   - Al menú lateral, ves a **"Storage"**
   - O directe: `https://vercel.com/[tu-nom-org]/xarxanglesola/storage`

4. **Crea un nou Blob Store**:
   - Clica **"Create Store"** o **"Create Blob Store"**
   - Nom del store: `images` (o el nom que vulguis)
   - Region: tria la més propera (normalment `iad1` - US East)
   - Clica **"Create"**

## 🔑 Pas 2: Verificar el Token Automàtic

Després de crear el Blob Store:

1. Vercel genera automàticament un token: `BLOB_READ_WRITE_TOKEN`
2. Aquest token s'hauria d'afegir automàticament a les **Environment Variables** del projecte

## ✅ Pas 3: Verificar que el Token està Configurat

1. **Ves a Environment Variables**:
   - Projecte → **Settings** → **Environment Variables**
   - O directe: `https://vercel.com/[tu-nom-org]/xarxanglesola/settings/environment-variables`

2. **Comprova que existeix `BLOB_READ_WRITE_TOKEN`**:
   - Hauria d'aparèixer a la llista
   - Value: hauria de ser un token llarg (comença normalment amb `vercel_blob_rw_...`)
   - Environments: hauria d'estar marcat per **Production** (i Preview si vols)

3. **Si NO existeix**:
   - Ves a **Storage** → Selecciona el teu store
   - Busca la secció **"Tokens"** o **"Settings"**
   - Copia el token `BLOB_READ_WRITE_TOKEN`
   - Ves a **Settings** → **Environment Variables**
   - Afegeix manualment:
     - **Key**: `BLOB_READ_WRITE_TOKEN`
     - **Value**: el token que has copiat
     - **Environments**: marca **Production** (i **Preview** si vols)
     - Clica **"Save"**

## 🔄 Pas 4: Redeploy

Després de configurar el token:

1. **Opció A: Redeploy manual**:
   - Ves a **Deployments**
   - Cerca l'últim deploy
   - Clica els tres punts `...` → **"Redeploy"**

2. **Opció B: Redeploy automàtic**:
   - Fes un petit canvi al projecte (commit qualsevol)
   - Vercel farà deploy automàtic amb la nova variable d'entorn

## 🧪 Pas 5: Provar

Després del redeploy:

1. Obre l'app desplegada a Vercel
2. Inicia sessió
3. Ves a **"Nou Producte"**
4. Puja una imatge
5. Publica el producte
6. Verifica que la imatge es mostra correctament

## ❓ Troubleshooting

### Error: "BLOB_READ_WRITE_TOKEN no configurat"

- **Causa**: El token no està configurat a Vercel
- **Solució**: Segueix el Pas 3 per verificar/afegir el token

### Error: "Error al pujar imatges a Vercel Blob"

- **Causa**: Token invàlid o permisos incorrectes
- **Solució**: 
  - Verifica que el token estigui ben copiat (sense espais extra)
  - Assegura't que el token sigui `BLOB_READ_WRITE_TOKEN` (no `BLOB_READ_TOKEN`)

### Les imatges no es mostren

- **Causa**: Potser falta configurar `next.config.js` per permetre imatges de Blob
- **Solució**: El codi ja està adaptat, però verifica que `next.config.js` tingui el `remotePatterns` per `*.public.blob.vercel-storage.com`

## 📝 Notes

- **Pla gratuït**: Inclou 1 GB d'emmagatzematge i 10 GB de transferència/mes
- **Les imatges són públiques**: S'utilitza `access: 'public'` per permetre que es mostrin públicament
- **Fallback**: Si el token no està configurat, el codi intentarà usar el sistema de fitxers local (només funciona localment, no a Vercel)

## ✅ Verificació Final

Un cop configurat, hauries de poder:

- ✅ Pujar imatges quan crees un producte
- ✅ Veure les imatges als productes públics
- ✅ Les imatges es guarden permanentment (no es perden en cada deploy)

---

**Següent pas**: Un cop configurat Blob Storage, les imatges funcionaran. El xat romandrà desactivat a producció fins que s'adapti Socket.io.

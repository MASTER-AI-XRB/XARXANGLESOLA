# Guia de Diagnòstic d'Errors 500

Aquest document t'ajuda a diagnosticar i resoldre errors 500 a Vercel.

## 🔍 Pas 1: Identificar l'Error

L'error 500 significa que hi ha hagut un problema al servidor. Per saber què ha passat exactament:

### Opció A: Logs de Vercel (Recomanat)

1. **Accedeix a Vercel Dashboard**:
   - Ves a [https://vercel.com](https://vercel.com)
   - Selecciona el projecte "XARXANGLESOLA"

2. **Obre els Logs**:
   - Ves a la secció **"Deployments"**
   - Clica a l'últim deploy (el més recent)
   - Ves a la pestanya **"Functions"** o **"Logs"**
   - O directe: `https://vercel.com/[tu-nom-org]/xarxanglesola/[deployment-id]/logs`

3. **Busca errors**:
   - Filtra per nivell **"Error"**
   - Cerca missatges que comencin amb:
     - `Error creant producte:`
     - `Error pujant imatge a Blob:`
     - `Error carregant productes:`
     - `Blob error name:` / `Blob error message:`

### Opció B: Console del Navegador

1. Obre les **DevTools** (F12)
2. Ves a la pestanya **"Network"**
3. Cerca la petició que ha donat error 500 (normalment apareix en vermell)
4. Clica sobre ella i ves a **"Response"** o **"Preview"** per veure el missatge d'error

## 🚨 Errors Comuns i Solucions

### Error 1: "Error al pujar imatges. Configura Vercel Blob Storage per producció."

**Causa**: `BLOB_READ_WRITE_TOKEN` no està configurat o no és vàlid.

**Solució**:
1. Ves a **Settings** → **Environment Variables**
2. Verifica que existeix `BLOB_READ_WRITE_TOKEN`
3. Si no existeix, segueix la guia `VERCEL_BLOB_SETUP.md`
4. Si existeix però l'error persisteix:
   - Elimina la variable i afegeix-la de nou
   - Assegura't que el token comença amb `vercel_blob_rw_...`
   - Verifica que està marcat per **Production**

### Error 2: "Error d'autenticació amb Vercel Blob. Verifica BLOB_READ_WRITE_TOKEN."

**Causa**: El token no és vàlid o no té els permisos correctes.

**Solució**:
1. Ves a **Storage** → Selecciona el teu Blob Store
2. Crea un nou token o verifica que el token existeix
3. Copia el token complet (sense espais)
4. Ves a **Environment Variables** → Actualitza `BLOB_READ_WRITE_TOKEN`
5. Fes **Redeploy**

### Error 3: "Error creant producte" (sense més detalls)

**Causa**: Pot ser problemes amb:
- Base de dades (Prisma)
- Validació de dades
- Altres errors del servidor

**Solució**:
1. Mira els **Logs de Vercel** per veure el detall complet
2. Verifica que `DATABASE_URL` està ben configurat
3. Comprova que la base de dades està accessible

### Error 4: "Error carregant productes"

**Causa**: Problema de connexió amb la base de dades o format incorrecte de les imatges.

**Solució**:
1. Verifica `DATABASE_URL` a **Environment Variables**
2. Comprova que la base de dades (Neon) està activa
3. Mira els logs per veure si hi ha problemes amb `JSON.parse(product.images)`

## 📋 Checklist de Verificació

Abans de buscar més errors, verifica:

- [ ] `DATABASE_URL` està configurat a Vercel i és correcte (format `postgresql://...`)
- [ ] `BLOB_READ_WRITE_TOKEN` està configurat (si intentes pujar imatges)
- [ ] Totes les variables d'entorn tenen l'entorn **Production** marcat
- [ ] Has fet **Redeploy** després de canviar variables d'entorn
- [ ] La base de dades Neon està activa i accessible

## 🔄 Com Fer Redeploy

Si has canviat variables d'entorn:

1. **Opció A**: Redeploy manual
   - Deployments → Últim deploy → `...` → **"Redeploy"**

2. **Opció B**: Commit i push
   - Fes qualsevol petit canvi
   - Commit i push
   - Vercel farà deploy automàtic

### Error: "Error in PostgreSQL connection: Error { kind: Closed, cause: None }" (en local amb `npm run dev`)

**Causa**: La connexió amb la base de dades (PostgreSQL, p. ex. Neon) s’ha tancat (per inactivitat, reinici del servidor, o massa clients oberts).

**Què fer**:

1. **Un sol client Prisma**: El projecte ha d’usar el client compartit de `lib/prisma.ts` a les API routes, no crear `new PrismaClient()` a cada petició. Si alguna ruta crea un client propi i fa `$disconnect()`, pot provocar problemes; ja s’ha canviat la ruta de reserva per usar el singleton.
2. **Neon**: Si la BD és a Neon, usa la **connection string amb pooler** (a la consola de Neon surt “Pooled connection” o similar). Això redueix errors de connexió tancada.
3. **En local**: Reinicia `npm run dev`; a vegades el Hot Reload deixa connexions antigues i reapareix l’error fins que reinicies.

Si l’error surt de tant en tant i l’app respon bé, pot ser només un log de Prisma quan la BD tanca una connexió idle; no cal fer res més si tot funciona.

## 📞 Quan Demanar Ajuda

Si segueixes amb problemes, prepara aquesta informació:

1. **Què estaves fent** quan va aparèixer l'error (pujar producte, carregar pàgina, etc.)
2. **Missatge d'error exacte** dels Logs de Vercel
3. **Captura de pantalla** dels Environment Variables (sense mostrar valors sensibles)
4. **Data i hora** aproximada de l'error

---

**Nota**: El codi ara inclou logging detallat que ajuda a diagnosticar problemes. Revisa sempre els logs de Vercel per veure detalls complets.

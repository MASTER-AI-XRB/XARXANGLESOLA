# Solució de Problemes de Socket.IO

## Problema: "Connectant..." sense connectar

Si veus el missatge "Connectant..." en vermell i el xat no es connecta, segueix aquests passos:

### 1. Verificar Variables d'Entorn a Vercel

Assegura't que tens configurades les següents variables a Vercel:

- **`NEXT_PUBLIC_SOCKET_URL`**: Ha de ser la URL completa del servidor Socket.IO a Railway
  - Format: `https://tu-servidor.up.railway.app` (sense port, Railway ho gestiona automàticament)
  - **Important**: Ha de començar amb `https://` (no `http://`)

### 2. Verificar Variables d'Entorn a Railway

Assegura't que tens configurada la variable a Railway:

- **`NEXT_PUBLIC_ALLOWED_ORIGINS`**: Ha d'incloure la URL de Vercel
  - Format: `https://xarxanglesola.vercel.app` (o la teva URL de Vercel)
  - Si tens múltiples orígens, separa'ls amb comes: `https://xarxanglesola.vercel.app,https://www.xarxanglesola.vercel.app`

### 3. Verificar que el Servidor Socket.IO està Actiu

1. Obre la consola del navegador (F12)
2. Mira els logs quan intentes connectar-te
3. Busca errors que mencionin:
   - `CORS`: Problema de permisos d'origen
   - `ECONNREFUSED`: El servidor no està accessible
   - `timeout`: El servidor no respon a temps

### 4. Provar la Connexió Manualment

Obre la consola del navegador i executa:

```javascript
// Substituir per la teva URL de Railway
fetch('https://tu-servidor.up.railway.app/socket.io/?EIO=4&transport=polling', {
  method: 'GET',
  mode: 'cors',
})
  .then(response => console.log('✅ Connexió OK:', response.status))
  .catch(error => console.error('❌ Error:', error))
```

Si veus un error CORS, el problema és la configuració de `NEXT_PUBLIC_ALLOWED_ORIGINS` a Railway.

### 5. Verificar el Protocol (HTTPS vs HTTP)

- **Vercel**: Sempre usa HTTPS
- **Railway**: Sempre usa HTTPS en producció
- **Important**: `NEXT_PUBLIC_SOCKET_URL` ha de començar amb `https://` (no `http://`)

### 6. Verificar els Logs de Railway

1. Obre el dashboard de Railway
2. Ves a la secció "Deployments" o "Logs"
3. Busca errors relacionats amb:
   - CORS
   - Connexions rebutjades
   - Errors de connexió

### 7. Problemes Comuns i Solucions

#### Error: "CORS policy"
**Causa**: Railway no permet l'origen de Vercel
**Solució**: Afegeix la URL de Vercel a `NEXT_PUBLIC_ALLOWED_ORIGINS` a Railway

#### Error: "ECONNREFUSED"
**Causa**: El servidor Socket.IO no està actiu o la URL és incorrecta
**Solució**: 
- Verifica que el servidor estigui desplegat a Railway
- Verifica que `NEXT_PUBLIC_SOCKET_URL` sigui correcta

#### Error: "timeout"
**Causa**: El servidor no respon a temps
**Solució**:
- Verifica que el servidor estigui actiu
- Pot ser un problema de xarxa, intenta-ho de nou

#### El missatge "Connectant..." no desapareix
**Causa**: El socket no es connecta però no hi ha error clar
**Solució**:
1. Obre la consola del navegador (F12)
2. Mira els logs per veure què està passant
3. Verifica que `NEXT_PUBLIC_SOCKET_URL` estigui ben configurada
4. Verifica que `NEXT_PUBLIC_ALLOWED_ORIGINS` inclogui la URL de Vercel

### 8. Verificació Ràpida

Copia i enganxa aquest codi a la consola del navegador quan estiguis a la pàgina del xat:

```javascript
console.log('URL Socket:', process.env.NEXT_PUBLIC_SOCKET_URL || 'NO CONFIGURADA')
console.log('Origin actual:', window.location.origin)
console.log('Hostname:', window.location.hostname)
```

Això et dirà:
- Si `NEXT_PUBLIC_SOCKET_URL` està configurada
- Quin és l'origen actual (que ha d'estar a `NEXT_PUBLIC_ALLOWED_ORIGINS` a Railway)

### 9. Reiniciar el Servidor

Si res funciona, intenta:
1. Reiniciar el servidor Socket.IO a Railway
2. Fer un nou deploy a Vercel
3. Netejar la caché del navegador

### 10. Contactar Suport

Si res funciona, comparteix:
- Els logs de la consola del navegador
- Els logs de Railway
- Les variables d'entorn configurades (sense mostrar valors sensibles)

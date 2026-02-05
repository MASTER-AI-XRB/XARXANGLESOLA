# Checklist: notificacions “producte reservat”

Les notificacions **“Producte reservat”** (i actualització d’icones en temps real) depenen de la reserva a l’API, del servidor Socket a Railway i de la configuració que facis tu. Aquest document resumeix com està configurat el codi i què has de comprovar.

---

## 1. Qui rep la notificació

La notificació **“Producte reservat”** només s’envia a usuaris que:

- Tenen el producte **als preferits** (ha afegit el producte a favorits).
- **No** són qui ha fet la reserva (qui reserva no es notifica a si mateix).

Per tant, per provar que arribin les notificacions cal:

1. **Usuari A**: té el producte als preferits (ha clicat “Afegir a preferits”).
2. **Usuari B** (un altre compte): reserva el producte.
3. La notificació ha d’arribar a **Usuari A** (el que té el producte als preferits), no a Usuari B.

Si proves amb un sol usuari (tu reserves un producte que tu mateix tens als preferits), **no rebràs** cap notificació perquè el codi exclou explícitament qui reserva.

---

## 2. Variables d’entorn

### Vercel (API i frontend)

| Variable | Necessària | Per què |
|---------|------------|---------|
| `NEXT_PUBLIC_SOCKET_URL` | Sí | URL del servidor Socket (Railway). Sense ella no es crida `/notify` ni `/broadcast-product-state`. |
| `AUTH_SECRET` (o `NOTIFY_SECRET`) | Sí | Token que Vercel envia a Railway a la capçalera `x-notify-token`. Si falta, els logs de Vercel ho indiquen. |

### Railway (servidor Socket)

| Variable | Necessària | Per què |
|---------|------------|---------|
| `AUTH_SECRET` (o `NOTIFY_SECRET`) | Sí | **Ha de ser el mateix valor que a Vercel.** Si no coincideix, Railway respon 401 i les notificacions no s’envien. |
| `DATABASE_URL` | Sí | La mateixa base de dades que Vercel (Neon). El servidor Socket llegeix usuaris, preferits, preferències de notificació i subscripcions push. |
| `NEXT_PUBLIC_ALLOWED_ORIGINS` | Sí (producció) | Orígens CORS permesos. Inclou la URL de l’app (p. ex. `https://xarxanglesola.vercel.app`) perquè el navegador pugui connectar al Socket. |
| `NEXT_PUBLIC_APP_URL` | Recomanat | URL de l’app (p. ex. `https://xarxanglesola.vercel.app`) per enllaços correctes a notificacions push. |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Opcional | Per notificacions push quan l’app està tancada. Sense elles, només es reben notificacions in-app (socket) amb l’app oberta. |

Resum: **el mateix `AUTH_SECRET` a Vercel i Railway** i **`NEXT_PUBLIC_SOCKET_URL`** a Vercel apuntant a la URL pública del servei Socket a Railway.

---

## 3. Flux del codi (per depurar)

1. **Vercel** (ruta `PATCH /api/products/[id]/reserve`):
   - Després d’actualitzar la reserva, busca usuaris amb el producte als preferits (excepte qui reserva).
   - Si n’hi ha, envia `POST {NEXT_PUBLIC_SOCKET_URL}/broadcast-product-state` (per actualitzar icones) i `POST .../notify` per cada usuari (per la notificació “Producte reservat”).
   - **Logs a Vercel**: si no hi ha cap usuari als preferits, surt: *“Notificacions reserva: cap usuari amb el producte als preferits…”*. Si n’hi ha, surt: *“Notificacions reserva: enviant a N usuari(s)…”*. Si falten `NEXT_PUBLIC_SOCKET_URL` o `AUTH_SECRET`, surten warnings indicant-ho.

2. **Railway** (servidor Socket, `socket-server.js`):
   - Rep `POST /notify` amb `x-notify-token` i el cos (targetUserId, title, message, action, etc.).
   - Comprova el token (ha de coincidir amb `AUTH_SECRET` o `NOTIFY_SECRET`). Si no, respon 401.
   - Consulta preferències de notificació (`shouldSendNotification`). Si les preferències exclouen aquest tipus/nickname/producte, no envia (log: *“[notify] Omès per preferències”*).
   - Si l’usuari està connectat per Socket: emet `app-notification` a aquest socket (log: *“[notify] Enviat via socket”*).
   - Si no està connectat i té subscripció push i VAPID configurat: envia Web Push (log: *“[notify] Web Push enviat”*).

3. **Client** (navegador):
   - `AppSocketProvider` té un sol socket i escolta `app-notification`. Quan en rep un, mostra el toast (i l’afegeix a la campana de notificacions).
   - Les pàgines escolten l’esdeveniment `product-state` (dispatxat pel provider) per actualitzar icones de reserva/prestec.

Per tant: per rebre la notificació **in-app**, l’usuari que ha de rebre-la (el que té el producte als preferits) ha d’estar amb l’app oberta i connectat al Socket (mateix navegador o un altre dispositiu amb la sessió iniciada).

---

## 4. Preferències de notificació

A **Configuració → Notificacions** l’usuari pot:

- **Rebre totes les notificacions**: si està actiu, rep tot (per defecte).
- Si el desactiva, només rep segons “nicknames” o “paraules clau” configurats.

Si un usuari té “Rebre totes” desactivat i no té cap nickname/paraula que coincideixi amb qui ha reservat o el nom del producte, el servidor Socket **omet** l’enviament (i surt *“[notify] Omès per preferències”* als logs de Railway). Per provar, assegura’t que l’usuari que ha de rebre (el que té el producte als preferits) té “Rebre totes les notificacions” activat o que hi coincideix algun filtre.

---

## 5. Com provar pas a pas

1. **Dos usuaris**: dos comptes (dos navegadors o un navegador + finestra privada / un altre dispositiu).
2. **Usuari A**: inicia sessió, entra al producte, **afegeix-lo a preferits**, deixa l’app oberta (o obre-la en un altre tab).
3. **Usuari B**: inicia sessió, entra al mateix producte, **reserva** el producte.
4. A la sessió d’**Usuari A** hauria d’aparèixer:
   - La notificació “Producte reservat” (toast + campana),
   - I les icones del producte actualitzades (reservat) si està a la llista de productes o preferits.

Si no apareix:

- A **Vercel** (logs de la funció/API): comprova si surt “Notificacions reserva: enviant a 1 usuari(s)…” o “cap usuari amb el producte als preferits”. Si surt “enviant a 1” però no arriba, el problema és entre Vercel→Railway o Railway→client.
- A **Railway** (logs del servei Socket): comprova si surt “[notify] Enviat via socket” o “[notify] Omès per preferències” o 401 (token incorrecte).
- Al **navegador** (Usuari A): assegura’t que està connectat (el provider del socket està muntat; si has tancat totes les pestanyes de l’app, no hi ha socket i només rebria push si està configurat).

---

## 6. Resum ràpid

| Què | On | Acció |
|-----|-----|--------|
| Notificació “Producte reservat” | Només qui té el producte als **preferits** i **no** és qui reserva | Provar amb 2 usuaris; usuari A preferits, usuari B reserva. |
| Variables | Vercel | `NEXT_PUBLIC_SOCKET_URL`, `AUTH_SECRET` (o `NOTIFY_SECRET`). |
| Variables | Railway | `AUTH_SECRET` (mateix que Vercel), `DATABASE_URL`, `NEXT_PUBLIC_ALLOWED_ORIGINS`. |
| Token 401 | Vercel ↔ Railway | Revisar que `AUTH_SECRET` (o `NOTIFY_SECRET`) sigui **idèntic** a Vercel i Railway. |
| Notificació in-app | Client | Usuari que ha de rebre ha d’estar amb l’app oberta (socket connectat). |
| Preferències | Configuració | Per provar, “Rebre totes les notificacions” activat o filtre que coincideixi. |

Si després de comprovar tot això les notificacions segueixen sense arribar, els logs de Vercel i Railway (segons els missatges que surtin) indiquen on es talla la cadena.

---

## 7. Provar en local (abans de producció)

Sí, pots provar el flux de notificacions **en local**; el comportament és el mateix que a producció.

**Què cal:**

1. **Un sol terminal**: `npm run dev`. Engega Next.js (3000) i el servidor Socket (3001) al mateix temps. **No cal** executar `node socket-server.js` a part; `socket-server.js` és només per desplegar a Railway.

2. **Variables d’entorn en local** (`.env` o `.env.local`):
   - `DATABASE_URL`: la mateixa base de dades que faràs servir (p. ex. Neon); el servidor Socket en local també la necessita per verificar usuaris i preferits.
   - `AUTH_SECRET`: el mateix que faràs servir a producció (o un valor de prova; ha de coincidir entre Next.js i el socket-server).

3. **URL del socket en local**: El **navegador** es connecta sol a `http://localhost:3001`. Les **API routes** (reserva, notificacions, etc.) criden també el socket **local** (`http://127.0.0.1:3001`) quan `NODE_ENV === 'development'`, gràcies a `getSocketServerUrl()`. Així en local tot (clients i API) parla amb el mateix servidor Socket i les notificacions i l’actualització d’icones haurien de funcionar.

4. **Prova**: Dos usuaris (dos navegadors o finestra privada), un amb el producte als preferits i l’altre reservant; la notificació ha d’aparèixer a qui té el producte als preferits.

---

## 8. Tests: són suficients?

Els tests e2e actuals (auth, favorites, product-status, products, reset-password) cobreixen login, preferits, reserva/desreserva i préstec a nivell d’API i UI; **no** comproven que el servidor Socket rebi `/notify` ni que el client rebi `app-notification` (això requereix un servidor Socket corrent o mocks més complexos).

**Són suficients per desplegar?** Sí, per al flux principal (reserva, preferits, producte). Per cobrir explícitament les notificacions es podria afegir:

- **Unit**: mockejar `fetch` a la ruta de reserva i comprovar que es crida `POST .../notify` quan hi ha usuaris amb el producte als preferits (opcional, més cobertura).
- **E2E amb Socket real**: un test que obri dos contextes (dos “usuaris”), un afegeix a preferits i l’altre reserva, amb el servidor Socket en marxa; és més fràgil perquè depèn del servidor i del timing.

Recomanació: amb els tests actuals n’hi ha prou per anar a producció; si vols més seguretat, el pas útil és un test unitari que mockegi la crida a `/notify` i comprovi que la reserva intenta enviar notificacions quan hi ha favorits.

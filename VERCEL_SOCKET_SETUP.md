# Configurar Socket.IO per Vercel

Aquesta guia t'explica com tenir el xat actiu a Vercel desplegant el servidor Socket.IO en un servei extern.

## 🎯 Per què cal un servidor extern?

Vercel utilitza Serverless Functions que no suporten connexions WebSocket persistents. Per tant, necessitem desplegar el servidor Socket.IO (`server.js`) en un servei que suporti WebSockets.

## 🚀 Opció 1: Railway (Recomanat - Fàcil i Gratuït)

Railway és perfecte per desplegar el servidor Socket.IO amb un pla gratuït generós.

### Pas 1: Preparar el servidor Socket.IO

Crea un fitxer `socket-server.js` a l'arrel del projecte (versió simplificada del servidor):

```javascript
const { createServer } = require('http')
const { Server } = require('socket.io')
const { PrismaClient } = require('@prisma/client')
const cors = require('cors')

const prisma = new PrismaClient()
const port = process.env.PORT || 3001

const httpServer = createServer()

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['polling', 'websocket'],
})

const userSockets = new Map()
const socketUsers = new Map()
const userInfo = new Map()

io.on('connection', (socket) => {
  const { userId, nickname } = socket.handshake.query
  
  if (userSockets.has(userId)) {
    const existingSocketId = userSockets.get(userId)
    const existingSocket = io.sockets.sockets.get(existingSocketId)
    if (existingSocket) {
      existingSocket.emit('session-terminated', { 
        message: 'Una nova sessió s\'ha obert des d\'un altre dispositiu' 
      })
      existingSocket.disconnect(true)
    }
    socketUsers.delete(existingSocketId)
  }

  userSockets.set(userId, socket.id)
  socketUsers.set(socket.id, { userId, nickname })
  userInfo.set(userId, { nickname })

  updateOnlineUsers()

  socket.on('join-general', async () => {
    socket.join('general')
    const messages = await prisma.message.findMany({
      where: { roomId: 'general', isPrivate: false },
      include: { user: { select: { nickname: true } } },
      orderBy: { createdAt: 'asc' },
      take: 50,
    })
    socket.emit('load-messages', messages.map((m) => ({
      ...m,
      userNickname: m.user.nickname,
    })))
  })

  socket.on('general-message', async (data) => {
    const user = socketUsers.get(socket.id)
    if (!user) return
    if (!data.content || typeof data.content !== 'string') return
    const content = data.content.trim()
    if (content.length === 0 || content.length > 1000) return

    const message = await prisma.message.create({
      data: {
        content: content,
        userId: user.userId,
        roomId: 'general',
        isPrivate: false,
      },
      include: { user: { select: { nickname: true } } },
    })

    io.to('general').emit('general-message', {
      ...message,
      userNickname: message.user.nickname,
    })
  })

  socket.on('join-private', async (targetIdentifier) => {
    const user = socketUsers.get(socket.id)
    if (!user) return

    let targetUserId = targetIdentifier
    if (!targetIdentifier.includes('-')) {
      const targetUser = await prisma.user.findUnique({
        where: { nickname: targetIdentifier },
        select: { id: true },
      })
      if (targetUser) {
        targetUserId = targetUser.id
      } else {
        return
      }
    }

    const roomId = [user.userId, targetUserId].sort().join('-')
    socket.join(roomId)
  })

  socket.on('load-private-messages', async (targetIdentifier) => {
    const user = socketUsers.get(socket.id)
    if (!user) return

    let targetUserId = targetIdentifier
    if (!targetIdentifier.includes('-')) {
      const targetUser = await prisma.user.findUnique({
        where: { nickname: targetIdentifier },
        select: { id: true },
      })
      if (targetUser) {
        targetUserId = targetUser.id
      } else {
        return
      }
    }

    const roomId = [user.userId, targetUserId].sort().join('-')
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { roomId: roomId, userId: user.userId },
          { roomId: roomId, userId: targetUserId },
        ],
        isPrivate: true,
      },
      include: { user: { select: { nickname: true } } },
      orderBy: { createdAt: 'asc' },
    })

    socket.emit('load-private-messages', {
      userId: targetUserId,
      messages: messages.map((m) => ({
        ...m,
        userNickname: m.user.nickname,
      })),
    })
  })

  socket.on('private-message', async (data) => {
    const user = socketUsers.get(socket.id)
    if (!user) return

    if (!data.content || typeof data.content !== 'string') return
    const content = data.content.trim()
    if (content.length === 0 || content.length > 1000) return

    let targetUserId = data.targetUserId || data.targetNickname
    if (data.targetNickname && !targetUserId.includes('-')) {
      const targetUser = await prisma.user.findUnique({
        where: { nickname: data.targetNickname },
        select: { id: true },
      })
      if (targetUser) {
        targetUserId = targetUser.id
      } else {
        return
      }
    }

    const roomId = [user.userId, targetUserId].sort().join('-')
    const targetSocketId = userSockets.get(targetUserId)

    const message = await prisma.message.create({
      data: {
        content: content,
        userId: user.userId,
        roomId: roomId,
        isPrivate: true,
      },
      include: { user: { select: { nickname: true } } },
    })

    const messageData = {
      ...message,
      userNickname: message.user.nickname,
    }

    socket.emit('private-message', messageData)
    if (targetSocketId) {
      io.to(targetSocketId).emit('private-message', messageData)
    }
  })

  socket.on('disconnect', () => {
    if (userSockets.get(userId) === socket.id) {
      userSockets.delete(userId)
      userInfo.delete(userId)
    }
    socketUsers.delete(socket.id)
    updateOnlineUsers()
  })

  function updateOnlineUsers() {
    const onlineUsers = Array.from(userInfo.values()).map((u) => u.nickname)
    io.emit('online-users', onlineUsers)
  }
})

httpServer.listen(port, () => {
  console.log(`Socket.IO servidor corrent al port ${port}`)
})
```

### Pas 2: Crear package.json per al servidor Socket.IO

Crea `socket-server-package.json`:

```json
{
  "name": "xarxanglesola-socket-server",
  "version": "1.0.0",
  "main": "socket-server.js",
  "scripts": {
    "start": "node socket-server.js"
  },
  "dependencies": {
    "socket.io": "^4.8.1",
    "@prisma/client": "^5.7.1"
  }
}
```

### Pas 3: Desplegar a Railway

1. **Crea compte a Railway**: [https://railway.app](https://railway.app)

2. **Crea un nou projecte**:
   - Clic a "New Project"
   - Selecciona "Deploy from GitHub repo"
   - Selecciona el teu repositori

3. **Configura el servei**:
   - **Root Directory**: Deixa buit (o crea una carpeta `socket-server`)
   - **Build Command**: `npm install && npx prisma generate`
   - **Start Command**: `node socket-server.js`
   - **Port**: Railway assignarà automàticament (usa `process.env.PORT`)

4. **Variables d'entorn a Railway**:
   ```
   DATABASE_URL=postgresql://... (la mateixa que Vercel)
   PORT=3001
   NEXT_PUBLIC_ALLOWED_ORIGINS=https://tu-app.vercel.app,https://www.tu-app.vercel.app
   ```

5. **Obtenir la URL del servidor**:
   - Railway et donarà una URL com: `https://tu-servidor.up.railway.app`
   - Copia aquesta URL

### Pas 4: Configurar Vercel

A Vercel Dashboard → Project → Settings → Environment Variables:

```
NEXT_PUBLIC_SOCKET_URL=https://tu-servidor.up.railway.app
NEXT_PUBLIC_ALLOWED_ORIGINS=https://tu-app.vercel.app,https://www.tu-app.vercel.app
```

### Pas 5: Actualitzar el client

El client ja està configurat per usar `NEXT_PUBLIC_SOCKET_URL`. Només cal assegurar-te que no estigui desactivat a producció.

## 🚀 Opció 2: Render (Alternativa)

Render també ofereix un pla gratuït amb suport per WebSockets.

1. **Crea compte**: [https://render.com](https://render.com)

2. **Crea un Web Service**:
   - Connecta el teu repositori GitHub
   - **Environment**: Node
   - **Build Command**: `npm install && npx prisma generate`
   - **Start Command**: `node socket-server.js`

3. **Variables d'entorn** (igual que Railway)

4. **Obtenir URL**: Render et donarà una URL com `https://tu-servidor.onrender.com`

## 🚀 Opció 3: Fly.io (Alternativa)

Fly.io també suporta WebSockets i té un pla gratuït.

1. **Instal·la Fly CLI**: `curl -L https://fly.io/install.sh | sh`

2. **Crea app**: `fly launch`

3. **Configura**: Segueix les instruccions de Fly.io

## ✅ Verificació

Després de configurar tot:

1. **Desplega el servidor Socket.IO** a Railway/Render/Fly.io
2. **Configura `NEXT_PUBLIC_SOCKET_URL`** a Vercel amb la URL del servidor
3. **Actualitza el client** per no desactivar Socket.IO a producció
4. **Prova el xat** a la teva aplicació Vercel

## 🔧 Actualitzar el client per producció

Necessitem actualitzar `app/app/chat/page.tsx` per permetre Socket.IO a producció quan hi ha `NEXT_PUBLIC_SOCKET_URL` configurada.

## 📝 Notes Importants

- **Base de dades compartida**: El servidor Socket.IO i Vercel han de compartir la mateixa base de dades PostgreSQL
- **CORS**: Assegura't que `NEXT_PUBLIC_ALLOWED_ORIGINS` inclogui la URL de Vercel
- **Costs**: Railway i Render tenen plans gratuïts generosos, però revisa els límits
- **Monitoring**: Considera afegir monitoring per al servidor Socket.IO

## 🆘 Troubleshooting

### El xat no es connecta
- Verifica que `NEXT_PUBLIC_SOCKET_URL` estigui ben configurada a Vercel
- Comprova que el servidor Socket.IO estigui corrent
- Revisa els logs del servidor Socket.IO
- Verifica CORS a la configuració del servidor

### Errors de base de dades
- Assegura't que el servidor Socket.IO tingui accés a la base de dades
- Verifica que `DATABASE_URL` estigui ben configurada
- Comprova que Prisma Client estigui generat (`npx prisma generate`)

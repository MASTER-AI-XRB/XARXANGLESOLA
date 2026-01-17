const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')
const { PrismaClient } = require('@prisma/client')

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || '0.0.0.0' // 0.0.0.0 permet accés des de qualsevol IP de la xarxa
const port = parseInt(process.env.PORT || '3000', 10)
const socketPort = parseInt(process.env.SOCKET_PORT || '3001', 10)

// Funció per obtenir la IP local
function getLocalIP() {
  const os = require('os')
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return 'localhost'
}

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

const prisma = new PrismaClient()

app.prepare().then(() => {
  // Servidor Next.js
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  server.listen(port, hostname, (err) => {
    if (err) throw err
    const localIP = getLocalIP()
    console.log(`> Ready on http://localhost:${port}`)
    console.log(`> Accés des del telèfon: http://${localIP}:${port}`)
  })

  // Servidor Socket.io
  const localIP = getLocalIP()
  console.log('🔍 IP local detectada:', localIP)
  
  const allowedOrigins = process.env.NEXT_PUBLIC_ALLOWED_ORIGINS
    ? process.env.NEXT_PUBLIC_ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : dev 
      ? [
          `http://localhost:${port}`,
          `http://${localIP}:${port}`,
          `http://127.0.0.1:${port}`,
          `https://localhost:${port}`,
          `https://${localIP}:${port}`,
          // Afegir qualsevol IP de la xarxa local (192.168.x.x)
          ...(localIP.startsWith('192.168.') ? [
            `http://192.168.1.130:${port}`,
            `http://192.168.1.131:${port}`,
            `http://192.168.1.132:${port}`,
            `http://192.168.1.133:${port}`,
            `http://192.168.1.134:${port}`,
            `http://192.168.1.135:${port}`,
          ] : [])
        ]
      : [process.env.NEXT_PUBLIC_APP_URL || `https://${hostname}`]
  
  console.log('🔍 Orígens permesos per CORS:', allowedOrigins)

  // Crear servidor HTTP per Socket.io
  const httpServer = createServer()
  
  const io = new Server(httpServer, {
    path: '/socket.io/',
    cors: {
      origin: (origin, callback) => {
        // Permetre connexions sense origin (per exemple, apps natives o algunes configuracions)
        if (!origin) {
          console.log('✅ Connexió sense origin (permesa)')
          callback(null, true)
          return
        }
        
        console.log(`🔍 Comprovant origen: ${origin}`)
        
        // Comprovar si l'origen està a la llista de permesos
        if (allowedOrigins.includes(origin)) {
          console.log(`✅ Origen permès: ${origin}`)
          callback(null, true)
        } else {
          console.warn(`⚠️ CORS: origen no a la llista: ${origin}`)
          console.log('📋 Orígens permesos:', allowedOrigins)
          // En desenvolupament, permetre qualsevol origen per facilitar el desenvolupament mòbil
          if (dev) {
            console.log('✅ Mode desenvolupament: permetent origen automàticament')
            callback(null, true)
          } else {
            console.error('❌ CORS bloquejat en producció')
            callback(new Error('Not allowed by CORS'))
          }
        }
      },
      methods: ['GET', 'POST', 'OPTIONS'],
      credentials: true,
      allowedHeaders: ['Content-Type'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['polling', 'websocket'], // Polling primer per millor compatibilitat
    allowEIO3: true,
    connectTimeout: 45000,
  })
  
  // Log de totes les peticions HTTP al servidor Socket.io
  httpServer.on('request', (req, res) => {
    console.log(`[Socket HTTP ${req.method}] ${req.url} - Origin: ${req.headers.origin || 'sense origin'}`)
  })

  // Escoltar al port de Socket.io
  httpServer.listen(socketPort, hostname, (err) => {
    if (err) {
      console.error('Error engegant servidor Socket.io:', err)
      throw err
    }
    const localIPForSocket = getLocalIP()
    console.log(`> Socket.io servidor a http://localhost:${socketPort}`)
    console.log(`> Socket.io accés des del telèfon: http://${localIPForSocket}:${socketPort}`)
    console.log(`> Socket.io CORS configurat per:`, allowedOrigins)
    console.log(`> Socket.io permet connexions sense origin: true`)
  })

  // Log de connexions fallides
  io.engine.on('connection_error', (err) => {
    console.error('=== ERROR DE CONNEXIÓ SOCKET.IO ===')
    console.error('Error:', err.message)
    console.error('Context:', err.context)
    console.error('===================================')
  })

  const userSockets = new Map() // userId -> socketId (només una sessió per usuari)
  const socketUsers = new Map() // socketId -> { userId, nickname }
  const userInfo = new Map() // userId -> { nickname }

  io.on('connection', (socket) => {
    const { userId, nickname } = socket.handshake.query
    console.log('=== NOVA CONNEXIÓ SOCKET.IO ===')
    console.log(`Origin: ${socket.handshake.headers.origin || 'sense origin'}`)
    console.log(`Referer: ${socket.handshake.headers.referer || 'sense referer'}`)
    console.log(`Socket ID: ${socket.id}`)
    console.log(`UserId: ${userId}`)
    console.log(`Nickname: ${nickname}`)
    console.log(`Remote Address: ${socket.handshake.address}`)
    console.log('================================')
    
    // Comprovar si l'usuari ja està connectat
    if (userSockets.has(userId)) {
      const existingSocketId = userSockets.get(userId)
      console.log(`Usuari ${nickname} (${userId}) ja està connectat. Desconnectant sessió anterior...`)
      
      // Desconnectar la sessió anterior
      const existingSocket = io.sockets.sockets.get(existingSocketId)
      if (existingSocket) {
        existingSocket.emit('session-terminated', { 
          message: 'Una nova sessió s\'ha obert des d\'un altre dispositiu' 
        })
        existingSocket.disconnect(true)
      }
      
      // Netejar les dades de la sessió anterior
      socketUsers.delete(existingSocketId)
    }

    console.log(`Usuari connectat: ${nickname} (${userId}) - Socket: ${socket.id}`)

    // Registrar la nova sessió
    userSockets.set(userId, socket.id)
    socketUsers.set(socket.id, { userId, nickname })
    userInfo.set(userId, { nickname })

    // Notificar nous usuaris en línia
    updateOnlineUsers()

    // Unir-se al xat general
    socket.on('join-general', async () => {
      socket.join('general')
      // Carregar missatges del xat general
      const messages = await prisma.message.findMany({
        where: {
          roomId: 'general',
          isPrivate: false,
        },
        include: {
          user: {
            select: {
              nickname: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: 50, // Últims 50 missatges
      })
      // Transformar missatges per afegir userNickname directament
      socket.emit('load-messages', messages.map((m) => ({
        ...m,
        userNickname: m.user.nickname,
      })))
    })

    // Missatge general
    socket.on('general-message', async (data) => {
      const user = socketUsers.get(socket.id)
      if (!user) return

      // Validar contingut del missatge
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
        include: {
          user: {
            select: {
              nickname: true,
            },
          },
        },
      })

      io.to('general').emit('general-message', {
        ...message,
        userNickname: message.user.nickname,
      })
    })

    // Unir-se a xat privat (accepta nickname o userId)
    socket.on('join-private', async (targetIdentifier) => {
      const user = socketUsers.get(socket.id)
      if (!user) return

      let targetUserId = targetIdentifier
      // Si és un nickname, buscar l'userId
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

    // Carregar missatges privats (accepta nickname o userId)
    socket.on('load-private-messages', async (targetIdentifier) => {
      const user = socketUsers.get(socket.id)
      if (!user) return

      let targetUserId = targetIdentifier
      // Si és un nickname, buscar l'userId
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
        include: {
          user: {
            select: {
              nickname: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      })

      socket.emit('load-private-messages', {
        userId: targetUserId,
        messages: messages.map((m) => ({
          ...m,
          userNickname: m.user.nickname,
        })),
      })
    })

    // Missatge privat (accepta nickname o userId)
    socket.on('private-message', async (data) => {
      const user = socketUsers.get(socket.id)
      if (!user) return

      // Validar contingut del missatge
      if (!data.content || typeof data.content !== 'string') return
      const content = data.content.trim()
      if (content.length === 0 || content.length > 1000) return

      let targetUserId = data.targetUserId || data.targetNickname
      // Si és un nickname, buscar l'userId
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
        include: {
          user: {
            select: {
              nickname: true,
            },
          },
        },
      })

      const messageData = {
        ...message,
        userNickname: message.user.nickname,
      }

      // Enviar al remitent
      socket.emit('private-message', messageData)

      // Enviar al destinatari si està connectat
      if (targetSocketId) {
        io.to(targetSocketId).emit('private-message', messageData)
      }
    })

    // Desconnexió
    socket.on('disconnect', () => {
      console.log(`Usuari desconnectat: ${nickname} (${userId}) - Socket: ${socket.id}`)
      
      // Només eliminar si aquest socket és el que està registrat per a l'usuari
      if (userSockets.get(userId) === socket.id) {
        userSockets.delete(userId)
        userInfo.delete(userId)
      }
      
      socketUsers.delete(socket.id)
      updateOnlineUsers()
    })

    function updateOnlineUsers() {
      const onlineUsers = Array.from(userInfo.values()).map(
        (u) => u.nickname
      )
      io.emit('online-users', onlineUsers)
    }
  })
})


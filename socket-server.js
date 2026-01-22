/**
 * Servidor Socket.IO independent per desplegar a Railway/Render/Fly.io
 * Aquest servidor només gestiona les connexions Socket.IO
 */

const { createServer } = require('http')
const { Server } = require('socket.io')
const { PrismaClient } = require('@prisma/client')

const port = process.env.PORT || 3001
const prisma = new PrismaClient()

// Configurar orígens permesos per CORS
const getAllowedOrigins = () => {
  if (process.env.NEXT_PUBLIC_ALLOWED_ORIGINS) {
    return process.env.NEXT_PUBLIC_ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  }
  // En producció, permetre qualsevol origen si no està especificat (per desenvolupament)
  return process.env.NODE_ENV === 'production' ? [] : '*'
}

const httpServer = createServer()

const io = new Server(httpServer, {
  path: '/socket.io/',
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = getAllowedOrigins()
      
      // Permetre connexions sense origin
      if (!origin) {
        console.log('✅ Connexió sense origin (permesa)')
        callback(null, true)
        return
      }
      
      // Si és '*', permetre tot
      if (allowedOrigins === '*' || allowedOrigins.includes('*')) {
        callback(null, true)
        return
      }
      
      // Comprovar si l'origen està permès
      if (allowedOrigins.includes(origin)) {
        console.log(`✅ Origen permès: ${origin}`)
        callback(null, true)
      } else {
        console.warn(`⚠️ CORS: origen no permès: ${origin}`)
        console.log('📋 Orígens permesos:', allowedOrigins)
        callback(new Error('Not allowed by CORS'))
      }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  transports: ['polling', 'websocket'],
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 20000,
})

// Estructures de dades per gestionar usuaris
const userSockets = new Map() // userId -> socketId
const socketUsers = new Map() // socketId -> { userId, nickname }
const userInfo = new Map() // userId -> { nickname }

io.on('connection', (socket) => {
  const { userId, nickname } = socket.handshake.query
  
  console.log('=== NOVA CONNEXIÓ SOCKET.IO ===')
  console.log(`Origin: ${socket.handshake.headers.origin || 'sense origin'}`)
  console.log(`Socket ID: ${socket.id}`)
  console.log(`UserId: ${userId}`)
  console.log(`Nickname: ${nickname}`)
  console.log('================================')
  
  // Comprovar si l'usuari ja està connectat
  if (userSockets.has(userId)) {
    const existingSocketId = userSockets.get(userId)
    console.log(`Usuari ${nickname} (${userId}) ja està connectat. Desconnectant sessió anterior...`)
    
    const existingSocket = io.sockets.sockets.get(existingSocketId)
    if (existingSocket) {
      existingSocket.emit('session-terminated', { 
        message: 'Una nova sessió s\'ha obert des d\'un altre dispositiu' 
      })
      existingSocket.disconnect(true)
    }
    
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
    try {
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
        take: 50,
      })
      socket.emit('load-messages', messages.map((m) => ({
        ...m,
        userNickname: m.user.nickname,
      })))
    } catch (error) {
      console.error('Error carregant missatges generals:', error)
    }
  })

  // Missatge general
  socket.on('general-message', async (data) => {
    const user = socketUsers.get(socket.id)
    if (!user) return

    // Validar contingut del missatge
    if (!data.content || typeof data.content !== 'string') return
    const content = data.content.trim()
    if (content.length === 0 || content.length > 1000) return

    try {
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
    } catch (error) {
      console.error('Error creant missatge general:', error)
    }
  })

  // Unir-se a xat privat (accepta nickname o userId)
  socket.on('join-private', async (targetIdentifier) => {
    const user = socketUsers.get(socket.id)
    if (!user) return

    try {
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
    } catch (error) {
      console.error('Error unint-se a xat privat:', error)
    }
  })

  // Carregar missatges privats (accepta nickname o userId)
  socket.on('load-private-messages', async (targetIdentifier) => {
    const user = socketUsers.get(socket.id)
    if (!user) return

    try {
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
    } catch (error) {
      console.error('Error carregant missatges privats:', error)
    }
  })

  // Missatge privat (accepta nickname o userId)
  socket.on('private-message', async (data) => {
    const user = socketUsers.get(socket.id)
    if (!user) return

    // Validar contingut del missatge
    if (!data.content || typeof data.content !== 'string') return
    const content = data.content.trim()
    if (content.length === 0 || content.length > 1000) return

    try {
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
    } catch (error) {
      console.error('Error enviant missatge privat:', error)
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

  // Event per notificar quan algú afegeix un producte als preferits
  // Aquest event s'emet des de les API routes via HTTP request al servidor Socket.IO
  io.on('notification', (data) => {
    const { targetUserId, type, title, message, action } = data
    const targetSocketId = userSockets.get(targetUserId)
    if (targetSocketId) {
      io.to(targetSocketId).emit('app-notification', {
        type,
        title,
        message,
        action,
      })
    }
  })

  // Log de connexions fallides
  io.engine.on('connection_error', (err) => {
    console.error('=== ERROR DE CONNEXIÓ SOCKET.IO ===')
    console.error('Error:', err.message)
    console.error('Context:', err.context)
    console.error('===================================')
  })

  // Endpoint HTTP per enviar notificacions des de les API routes
  httpServer.on('request', (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-notify-token')

    if (req.method === 'OPTIONS') {
      res.writeHead(200)
      res.end()
      return
    }

    if (req.method === 'POST' && req.url === '/notify') {
      const notifySecret = process.env.NOTIFY_SECRET || process.env.AUTH_SECRET
      if (notifySecret) {
        const requestToken = req.headers['x-notify-token']
        if (requestToken !== notifySecret) {
          res.writeHead(401, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: false, error: 'Unauthorized' }))
          return
        }
      }
      let body = ''
      req.on('data', (chunk) => {
        body += chunk.toString()
      })
      req.on('end', () => {
        try {
          const data = JSON.parse(body)
          const { targetUserId, type, title, message, action } = data
          const targetSocketId = userSockets.get(targetUserId)
          if (targetSocketId) {
            io.to(targetSocketId).emit('app-notification', {
              type,
              title,
              message,
              action,
            })
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true }))
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: false, error: 'User not connected' }))
          }
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }))
        }
      })
      return
    }

    // Per a altres peticions, retornar 404
    res.writeHead(404)
    res.end('Not found')
  })

httpServer.listen(port, () => {
  console.log(`🚀 Socket.IO servidor corrent al port ${port}`)
  console.log(`📡 Orígens permesos:`, getAllowedOrigins())
  console.log(`🔗 URL: http://localhost:${port}`)
})

// Gestió d'errors no capturats
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error)
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})

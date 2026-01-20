const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')
const { PrismaClient } = require('@prisma/client')

const dev = process.env.NODE_ENV !== 'production'
// En producció, sempre escoltar a 0.0.0.0 per permetre accés públic (Railway, etc.)
const hostname = dev ? (process.env.HOSTNAME || '0.0.0.0') : '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)
// A producció (Railway, etc.), usar el mateix port que Next.js si no hi ha SOCKET_PORT configurat
// A desenvolupament, usar port 3001 per defecte
const socketPort = process.env.SOCKET_PORT 
  ? parseInt(process.env.SOCKET_PORT, 10)
  : (dev ? 3001 : port)

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
  const parseJsonBody = (req) =>
    new Promise((resolve, reject) => {
      let body = ''
      req.on('data', (chunk) => {
        body += chunk.toString()
      })
      req.on('end', () => {
        if (!body) {
          resolve({})
          return
        }
        try {
          resolve(JSON.parse(body))
        } catch (error) {
          reject(error)
        }
      })
    })

  const parseJsonArray = (value) => {
    if (!value) return []
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch (error) {
      return []
    }
  }

  const shouldSendNotification = async (targetUserId, payload) => {
    const preference = await prisma.notificationPreference.findUnique({
      where: { userId: targetUserId },
    })

    if (!preference) {
      return true
    }

    const enabledTypes = parseJsonArray(preference.enabledTypes)
    if (payload.notificationType && enabledTypes.length > 0) {
      const normalizedTypes = enabledTypes.map((type) => String(type).toLowerCase())
      if (!normalizedTypes.includes(String(payload.notificationType).toLowerCase())) {
        return false
      }
    }

    if (preference.receiveAll) {
      return true
    }

    const allowedNicknames = parseJsonArray(preference.allowedNicknames)
      .map((nickname) => String(nickname).toLowerCase())
      .filter(Boolean)
    const allowedKeywords = parseJsonArray(preference.allowedProductKeywords)
      .map((keyword) => String(keyword).toLowerCase())
      .filter(Boolean)

    const actorNickname = String(payload.actorNickname || '').toLowerCase()
    const productName = String(payload.productName || payload.productType || '').toLowerCase()

    const matchesNickname =
      actorNickname && allowedNicknames.includes(actorNickname)
    const matchesKeyword =
      productName &&
      allowedKeywords.some((keyword) => productName.includes(keyword))

    return matchesNickname || matchesKeyword
  }

  const handleNotifyRequest = async (req, res, ioInstance) => {
    if (!ioInstance) {
      return false
    }
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      res.writeHead(200)
      res.end()
      return true
    }

    if (req.method !== 'POST' || req.url !== '/notify') {
      return false
    }

    try {
      const data = await parseJsonBody(req)
      const {
        targetUserId,
        type,
        title,
        message,
        action,
        notificationType,
        actorNickname,
        productName,
        productType,
      } = data || {}

      if (!targetUserId) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: false, error: 'Missing targetUserId' }))
        return true
      }

      const targetSocketId = ioInstance.sockets.sockets.get
        ? Array.from(ioInstance.sockets.sockets.keys()).find((socketId) => {
            const socket = ioInstance.sockets.sockets.get(socketId)
            return socket?.handshake?.query?.userId === targetUserId
          })
        : null

      if (!targetSocketId) {
        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: false, error: 'User not connected' }))
        return true
      }

      const shouldSend = await shouldSendNotification(targetUserId, {
        notificationType,
        actorNickname,
        productName,
        productType,
      })

      if (!shouldSend) {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true, skipped: true }))
        return true
      }

      ioInstance.to(targetSocketId).emit('app-notification', {
        type,
        title,
        message,
        action,
      })

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true }))
      return true
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }))
      return true
    }
  }
  const generateAllowedOrigins = () => {
    const origins = new Set()
    const localIP = getLocalIP()

    if (process.env.NEXT_PUBLIC_ALLOWED_ORIGINS) {
      process.env.NEXT_PUBLIC_ALLOWED_ORIGINS.split(',').forEach((origin) => {
        origins.add(origin.trim())
      })
    }

    if (dev) {
      origins.add(`http://localhost:${port}`)
      origins.add(`http://127.0.0.1:${port}`)
      origins.add(`http://${localIP}:${port}`)

      if (localIP && localIP !== 'localhost' && localIP.startsWith('192.168.')) {
        const baseIP = localIP.substring(0, localIP.lastIndexOf('.'))
        for (let i = 130; i <= 140; i++) {
          origins.add(`http://${baseIP}.${i}:${port}`)
        }
      }
    } else if (process.env.NEXT_PUBLIC_APP_URL) {
      const url = process.env.NEXT_PUBLIC_APP_URL
      origins.add(url)
      if (url.startsWith('https://')) {
        const domain = url.replace('https://', '')
        origins.add(`https://${domain}`)
        if (!domain.startsWith('www.')) {
          origins.add(`https://www.${domain}`)
        }
      }
    }

    return Array.from(origins)
  }

  const allowedOrigins = generateAllowedOrigins()
  console.log('🔍 Orígens permesos per CORS:', allowedOrigins)

  const socketOptions = {
    path: '/socket.io/',
    cors: {
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true)
          return
        }

        const normalizedOrigin = origin.replace(/:80$/, '').replace(/:443$/, '')
        const isAllowed = allowedOrigins.some((allowed) => {
          const normalizedAllowed = allowed.replace(/:80$/, '').replace(/:443$/, '')
          return (
            origin === allowed ||
            normalizedOrigin === normalizedAllowed ||
            origin.startsWith(allowed) ||
            normalizedOrigin.startsWith(normalizedAllowed)
          )
        })

        if (isAllowed || dev) {
          callback(null, true)
        } else {
          console.error(`❌ CORS bloquejat: ${origin}`)
          callback(new Error('Not allowed by CORS'))
        }
      },
      methods: ['GET', 'POST', 'OPTIONS'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['polling', 'websocket'],
    allowEIO3: true,
    connectTimeout: 45000,
  }

  const setupSocketHandlers = (ioInstance) => {
    ioInstance.engine.on('connection_error', (err) => {
      console.error('=== ERROR DE CONNEXIÓ SOCKET.IO ===')
      console.error('Error:', err.message)
      console.error('Context:', err.context)
      console.error('===================================')
    })

    const userSockets = new Map()
    const socketUsers = new Map()
    const userInfo = new Map()

    ioInstance.on('connection', (socket) => {
      const { userId, nickname } = socket.handshake.query
      console.log('=== NOVA CONNEXIÓ SOCKET.IO ===')
      console.log(`Origin: ${socket.handshake.headers.origin || 'sense origin'}`)
      console.log(`Referer: ${socket.handshake.headers.referer || 'sense referer'}`)
      console.log(`Socket ID: ${socket.id}`)
      console.log(`UserId: ${userId}`)
      console.log(`Nickname: ${nickname}`)
      console.log(`Remote Address: ${socket.handshake.address}`)
      console.log('================================')

      if (userSockets.has(userId)) {
        const existingSocketId = userSockets.get(userId)
        const existingSocket = ioInstance.sockets.sockets.get(existingSocketId)
        if (existingSocket) {
          existingSocket.emit('session-terminated', {
            message: 'Una nova sessió s\'ha obert des d\'un altre dispositiu',
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
        socket.emit(
          'load-messages',
          messages.map((m) => ({ ...m, userNickname: m.user.nickname }))
        )
      })

      socket.on('general-message', async (data) => {
        const user = socketUsers.get(socket.id)
        if (!user || !data.content || typeof data.content !== 'string') return
        const content = data.content.trim()
        if (content.length === 0 || content.length > 1000) return

        const message = await prisma.message.create({
          data: {
            content,
            userId: user.userId,
            roomId: 'general',
            isPrivate: false,
          },
          include: { user: { select: { nickname: true } } },
        })

        ioInstance.to('general').emit('general-message', {
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
          if (!targetUser) return
          targetUserId = targetUser.id
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
          if (!targetUser) return
          targetUserId = targetUser.id
        }

        const roomId = [user.userId, targetUserId].sort().join('-')
        const messages = await prisma.message.findMany({
          where: {
            OR: [
              { roomId, userId: user.userId },
              { roomId, userId: targetUserId },
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
        if (!user || !data.content || typeof data.content !== 'string') return
        const content = data.content.trim()
        if (content.length === 0 || content.length > 1000) return

        let targetUserId = data.targetUserId || data.targetNickname
        if (data.targetNickname && !targetUserId.includes('-')) {
          const targetUser = await prisma.user.findUnique({
            where: { nickname: data.targetNickname },
            select: { id: true },
          })
          if (!targetUser) return
          targetUserId = targetUser.id
        }

        const roomId = [user.userId, targetUserId].sort().join('-')
        const targetSocketId = userSockets.get(targetUserId)

        const message = await prisma.message.create({
          data: { content, userId: user.userId, roomId, isPrivate: true },
          include: { user: { select: { nickname: true } } },
        })

        const messageData = {
          ...message,
          userNickname: message.user.nickname,
        }

        socket.emit('private-message', messageData)
        if (targetSocketId) {
          ioInstance.to(targetSocketId).emit('private-message', messageData)
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
        ioInstance.emit('online-users', onlineUsers)
      }
    })
  }

  if (dev && socketPort !== port) {
    const nextServer = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true)
        await handle(req, res, parsedUrl)
      } catch (err) {
        console.error('Error occurred handling', req.url, err)
        res.statusCode = 500
        res.end('internal server error')
      }
    })

    nextServer.listen(port, hostname, (err) => {
      if (err) throw err
      const localIP = getLocalIP()
      console.log(`> Ready on http://localhost:${port}`)
      console.log(`> Accés des del telèfon: http://${localIP}:${port}`)
    })

    const socketServer = createServer()
    const ioDev = new Server(socketServer, socketOptions)
    setupSocketHandlers(ioDev)
    socketServer.on('request', (req, res) => {
      handleNotifyRequest(req, res, ioDev).catch((error) => {
        console.error('Error gestionant /notify:', error)
      })
    })
    socketServer.listen(socketPort, hostname, (err) => {
      if (err) throw err
      const localIPForSocket = getLocalIP()
      console.log(`> Socket.io servidor a http://localhost:${socketPort}`)
      console.log(`> Socket.io accés des del telèfon: http://${localIPForSocket}:${socketPort}`)
    })
  } else {
    let io
    const server = createServer(async (req, res) => {
      if (req.url && req.url.startsWith('/socket.io/')) {
        return
      }
      if (await handleNotifyRequest(req, res, io)) {
        return
      }
      try {
        const parsedUrl = parse(req.url, true)
        await handle(req, res, parsedUrl)
      } catch (err) {
        console.error('Error occurred handling', req.url, err)
        res.statusCode = 500
        res.end('internal server error')
      }
    })

    io = new Server(server, socketOptions)
    setupSocketHandlers(io)
    server.listen(port, hostname, (err) => {
      if (err) throw err
      const localIP = getLocalIP()
      console.log(`> Ready on http://localhost:${port}`)
      if (dev) {
        console.log(`> Accés des del telèfon: http://${localIP}:${port}`)
      }
      console.log(`> Socket.io disponible a http://localhost:${port}/socket.io/`)
    })
  }
})


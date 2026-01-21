const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')
const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

const dev = process.env.NODE_ENV !== 'production'
const isDev = dev
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

const logInfo = (...args) => {
  if (isDev) {
    console.log(...args)
  }
}

const logWarn = (message, error) => {
  if (!error) {
    if (isDev) console.warn(message)
    return
  }
  if (isDev) {
    console.warn(message, error)
    return
  }
  const errorMessage = error instanceof Error ? error.message : String(error)
  console.warn(message, errorMessage)
}

const logError = (message, error) => {
  if (!error) {
    console.error(message)
    return
  }
  if (isDev) {
    console.error(message, error)
    return
  }
  const errorMessage = error instanceof Error ? error.message : String(error)
  console.error(message, errorMessage)
}

app.prepare().then(() => {
  const SESSION_COOKIE = 'xarxa_session'
  const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24
  const getSecret = () => {
    const secret = process.env.AUTH_SECRET
    if (secret) return secret
    if (dev) return 'dev-secret-change-me'
    return null
  }

  const base64UrlDecode = (value) => {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/')
    const padLength = (4 - (padded.length % 4)) % 4
    return Buffer.from(padded + '='.repeat(padLength), 'base64').toString('utf8')
  }

  const sign = (payload, secret) =>
    crypto.createHmac('sha256', secret).update(payload).digest('base64url')

  const verifySessionToken = (token) => {
    const secret = getSecret()
    if (!secret || !token) return null
    const [encoded, signature] = token.split('.')
    if (!encoded || !signature) return null
    const expected = sign(encoded, secret)
    try {
      const signatureBuffer = Buffer.from(signature)
      const expectedBuffer = Buffer.from(expected)
      if (signatureBuffer.length !== expectedBuffer.length) {
        return null
      }
      if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
        return null
      }
    } catch {
      return null
    }
    const payload = JSON.parse(base64UrlDecode(encoded))
    if (!payload?.userId || !payload.exp) return null
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }
    return payload
  }

  const parseCookies = (cookieHeader) => {
    if (!cookieHeader) return {}
    return cookieHeader.split(';').reduce((acc, pair) => {
      const [key, ...rest] = pair.trim().split('=')
      acc[key] = rest.join('=')
      return acc
    }, {})
  }

  const getSocketAuthPayload = (socket) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token ||
      parseCookies(socket.handshake.headers.cookie || '')[SESSION_COOKIE]
    if (token) {
      return verifySessionToken(token)
    }
    return null
  }
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

  const normalizeString = (value, maxLength) => {
    if (typeof value !== 'string') return ''
    return value.trim().slice(0, maxLength)
  }

  const isUuid = (value) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value || ''
    )

  const isNickname = (value) => /^[a-zA-Z0-9_-]{3,20}$/.test(value || '')

  const mapMessage = (message) => ({
    id: message.id,
    content: message.content,
    userNickname: message.user?.nickname || message.userNickname,
    createdAt: message.createdAt,
  })

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
    const notifySecret = process.env.NOTIFY_SECRET || process.env.AUTH_SECRET
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-notify-token')

    if (req.method === 'OPTIONS') {
      res.writeHead(200)
      res.end()
      return true
    }

    if (req.method !== 'POST' || req.url !== '/notify') {
      return false
    }
    if (notifySecret) {
      const requestToken = req.headers['x-notify-token']
      if (requestToken !== notifySecret) {
        res.writeHead(401, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: false, error: 'Unauthorized' }))
        return true
      }
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
            return socket?.data?.userId === targetUserId
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
  logInfo('🔍 Orígens permesos per CORS:', allowedOrigins)

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
          return origin === allowed || normalizedOrigin === normalizedAllowed
        })

        if (isAllowed || dev) {
          callback(null, true)
        } else {
          logError(`❌ CORS bloquejat: ${origin}`)
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
      logError('=== ERROR DE CONNEXIÓ SOCKET.IO ===', err?.message || err)
      logInfo('Context:', err.context)
    })

    ioInstance.use((socket, next) => {
      const payload = getSocketAuthPayload(socket)
      if (payload) {
        socket.data.userId = payload.userId
        socket.data.nickname = payload.nickname
        return next()
      }
      if (dev) {
        const { userId, nickname } = socket.handshake.query || {}
        if (userId && nickname) {
          socket.data.userId = String(userId)
          socket.data.nickname = String(nickname)
          return next()
        }
      }
      return next(new Error('Unauthorized'))
    })

    const userSockets = new Map()
    const socketUsers = new Map()
    const userInfo = new Map()

    ioInstance.on('connection', (socket) => {
      const userId = socket.data.userId
      const nickname = socket.data.nickname
      logInfo('=== NOVA CONNEXIÓ SOCKET.IO ===')
      logInfo(`Origin: ${socket.handshake.headers.origin || 'sense origin'}`)
      logInfo(`Referer: ${socket.handshake.headers.referer || 'sense referer'}`)
      logInfo(`Socket ID: ${socket.id}`)
      logInfo(`UserId: ${userId}`)
      logInfo(`Nickname: ${nickname}`)
      logInfo(`Remote Address: ${socket.handshake.address}`)
      logInfo('================================')

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
        socket.emit('load-messages', messages.map(mapMessage))
      })

      socket.on('general-message', async (data) => {
        const user = socketUsers.get(socket.id)
        if (!user || !data || typeof data.content !== 'string') return
        const content = normalizeString(data.content, 1000)
        if (!content) return

        const message = await prisma.message.create({
          data: {
            content,
            userId: user.userId,
            roomId: 'general',
            isPrivate: false,
          },
          include: { user: { select: { nickname: true } } },
        })

        ioInstance.to('general').emit('general-message', mapMessage(message))
      })

      socket.on('join-private', async (targetIdentifier) => {
        const user = socketUsers.get(socket.id)
        if (!user) return

        if (typeof targetIdentifier !== 'string') return
        const normalizedTarget = normalizeString(targetIdentifier, 50)
        if (!normalizedTarget) return

        let targetUserId = normalizedTarget
        if (!isUuid(normalizedTarget)) {
          if (!isNickname(normalizedTarget)) return
          const targetUser = await prisma.user.findUnique({
            where: { nickname: normalizedTarget },
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

        if (typeof targetIdentifier !== 'string') return
        const normalizedTarget = normalizeString(targetIdentifier, 50)
        if (!normalizedTarget) return

        let targetUserId = normalizedTarget
        if (!isUuid(normalizedTarget)) {
          if (!isNickname(normalizedTarget)) return
          const targetUser = await prisma.user.findUnique({
            where: { nickname: normalizedTarget },
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
          messages: messages.map(mapMessage),
        })
      })

      socket.on('private-message', async (data) => {
        const user = socketUsers.get(socket.id)
        if (!user || !data || typeof data.content !== 'string') return
        const content = normalizeString(data.content, 1000)
        if (!content) return

        const targetRaw = normalizeString(data.targetUserId || data.targetNickname || '', 50)
        if (!targetRaw) return

        let targetUserId = targetRaw
        if (!isUuid(targetRaw)) {
          if (!isNickname(targetRaw)) return
          const targetUser = await prisma.user.findUnique({
            where: { nickname: targetRaw },
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

        const messageData = mapMessage(message)

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
        logError(`Error occurred handling ${req.url}`, err)
        res.statusCode = 500
        res.end('internal server error')
      }
    })

    nextServer.listen(port, hostname, (err) => {
      if (err) throw err
      const localIP = getLocalIP()
      console.log(`> Ready on http://localhost:${port}`)
      logInfo(`> Accés des del telèfon: http://${localIP}:${port}`)
    })

    const socketServer = createServer()
    const ioDev = new Server(socketServer, socketOptions)
    setupSocketHandlers(ioDev)
    socketServer.on('request', (req, res) => {
      handleNotifyRequest(req, res, ioDev).catch((error) => {
        logError('Error gestionant /notify:', error)
      })
    })
    socketServer.listen(socketPort, hostname, (err) => {
      if (err) throw err
      const localIPForSocket = getLocalIP()
      console.log(`> Socket.io servidor a http://localhost:${socketPort}`)
      logInfo(`> Socket.io accés des del telèfon: http://${localIPForSocket}:${socketPort}`)
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
        logError(`Error occurred handling ${req.url}`, err)
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
        logInfo(`> Accés des del telèfon: http://${localIP}:${port}`)
      }
      console.log(`> Socket.io disponible a http://localhost:${port}/socket.io/`)
    })
  }
})


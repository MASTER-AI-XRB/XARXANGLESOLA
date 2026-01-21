import crypto from 'crypto'
import { NextRequest } from 'next/server'

const SESSION_COOKIE = 'xarxa_session'
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24

const getSecret = () => {
  const secret = process.env.AUTH_SECRET
  if (secret) return secret
  if (process.env.NODE_ENV !== 'production') {
    return 'dev-secret-change-me'
  }
  return null
}

const base64UrlEncode = (value: string) =>
  Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

const base64UrlDecode = (value: string) => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const padLength = (4 - (padded.length % 4)) % 4
  return Buffer.from(padded + '='.repeat(padLength), 'base64').toString('utf8')
}

const sign = (payload: string, secret: string) =>
  crypto.createHmac('sha256', secret).update(payload).digest('base64url')

export const createSessionToken = (userId: string, nickname: string) => {
  const secret = getSecret()
  if (!secret) return null
  const now = Math.floor(Date.now() / 1000)
  const payload = JSON.stringify({
    userId,
    nickname,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
  })
  const encoded = base64UrlEncode(payload)
  const signature = sign(encoded, secret)
  return `${encoded}.${signature}`
}

export const verifySessionToken = (token?: string | null) => {
  const secret = getSecret()
  if (!secret || !token) return null
  const [encoded, signature] = token.split('.')
  if (!encoded || !signature) return null
  const expected = sign(encoded, secret)
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (signatureBuffer.length !== expectedBuffer.length) {
    return null
  }
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null
  }
  const payload = JSON.parse(base64UrlDecode(encoded)) as {
    userId: string
    nickname: string
    exp: number
  }
  if (!payload?.userId || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    return null
  }
  return payload
}

export const getAuthUserId = (request: NextRequest) => {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const payload = verifySessionToken(token)
  return payload?.userId || null
}

export const sessionCookieName = SESSION_COOKIE
export const sessionMaxAgeSeconds = SESSION_MAX_AGE_SECONDS

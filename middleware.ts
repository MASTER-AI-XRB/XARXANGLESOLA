import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rate limiting simple (per producció, considera usar Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

const DEFAULT_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minuts
  maxRequests: 100, // 100 peticions per finestra
}

const RATE_LIMITS = [
  {
    match: /^\/api\/auth\/login$/,
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
    keySuffix: 'login',
  },
  {
    match: /^\/api\/auth\/forgot-password$/,
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    keySuffix: 'forgot',
  },
]

function getRateLimitKey(request: NextRequest): string {
  const ip = request.ip || 
             request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown'
  return ip
}

function checkRateLimit(key: string, windowMs: number, maxRequests: number): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(key)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + windowMs,
    })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count++
  return true
}

function getRateLimitConfig(pathname: string) {
  const matched = RATE_LIMITS.find((rule) => rule.match.test(pathname))
  if (matched) {
    return matched
  }
  return { ...DEFAULT_RATE_LIMIT, keySuffix: 'default' }
}

function getAllowedOrigins(): string[] {
  const origins = new Set<string>()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (appUrl) {
    origins.add(appUrl)
  }
  const extraOrigins = process.env.NEXT_PUBLIC_ALLOWED_ORIGINS
  if (extraOrigins) {
    extraOrigins.split(',').forEach((origin) => {
      const trimmed = origin.trim()
      if (trimmed) origins.add(trimmed)
    })
  }
  return Array.from(origins)
}

function isOriginAllowed(origin: string | null, referer: string | null, allowed: string[]): boolean {
  const candidates = [origin, referer].filter(Boolean) as string[]
  if (candidates.length === 0) return false
  return candidates.some((value) => {
    try {
      const url = new URL(value)
      return allowed.some((allowedOrigin) => url.origin === allowedOrigin)
    } catch {
      return false
    }
  })
}

// Netejar entrades antigues periòdicament
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of Array.from(rateLimitMap.entries())) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key)
    }
  }
}, DEFAULT_RATE_LIMIT.windowMs)

export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.next()
  }
  // Només aplicar rate limiting a les API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const method = request.method.toUpperCase()
    if (process.env.NODE_ENV === 'production' && !process.env.AUTH_SECRET) {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        return NextResponse.json(
          { error: 'AUTH_SECRET no configurat a producció' },
          { status: 500 }
        )
      }
    }
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      const allowedOrigins = getAllowedOrigins()
      const origin = request.headers.get('origin')
      const referer = request.headers.get('referer')
      if (!isOriginAllowed(origin, referer, allowedOrigins)) {
        return NextResponse.json(
          { error: 'Origen no permès' },
          { status: 403 }
        )
      }
    }

    const pathname = request.nextUrl.pathname
    const limitConfig = getRateLimitConfig(pathname)
    const key = `${getRateLimitKey(request)}:${limitConfig.keySuffix}`
    
    if (!checkRateLimit(key, limitConfig.windowMs, limitConfig.maxRequests)) {
      return NextResponse.json(
        { error: 'Massa peticions. Torna-ho a intentar més tard.' },
        { status: 429 }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}


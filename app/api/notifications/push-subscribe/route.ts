import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUserId } from '@/lib/auth'
import { apiError, apiOk } from '@/lib/api-response'
import { logError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

type PushSubscriptionJSON = {
  endpoint: string
  keys?: { p256dh?: string; auth?: string }
  expirationTime?: number | null
}

function isValidSubscription(sub: unknown): sub is PushSubscriptionJSON {
  if (!sub || typeof sub !== 'object') return false
  const s = sub as Record<string, unknown>
  return (
    typeof s.endpoint === 'string' &&
    s.endpoint.length > 0 &&
    s.keys != null &&
    typeof s.keys === 'object' &&
    typeof (s.keys as Record<string, unknown>).p256dh === 'string' &&
    typeof (s.keys as Record<string, unknown>).auth === 'string'
  )
}

export async function POST(request: NextRequest) {
  try {
    const authUserId = getAuthUserId(request)
    if (!authUserId) {
      return apiError('Usuari no autenticat', 401)
    }

    const body = await request.json().catch(() => null)
    const sub = body?.subscription ?? body
    if (!isValidSubscription(sub)) {
      return apiError('Subscripció invàlida', 400)
    }

    const endpoint = String(sub.endpoint).trim()
    const p256dh = String((sub.keys as { p256dh: string }).p256dh).trim()
    const auth = String((sub.keys as { auth: string }).auth).trim()
    const userAgent = typeof request.headers.get('user-agent') === 'string'
      ? request.headers.get('user-agent')!.slice(0, 500)
      : null

    await prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: { userId: authUserId, endpoint },
      },
      create: {
        userId: authUserId,
        endpoint,
        p256dh,
        auth,
        userAgent,
      },
      update: {
        p256dh,
        auth,
        userAgent,
      },
    })

    return apiOk({ success: true })
  } catch (error) {
    logError('Error guardant subscripció push:', error)
    return apiError('Error guardant subscripció push', 500)
  } finally {
    await prisma.$disconnect()
  }
}

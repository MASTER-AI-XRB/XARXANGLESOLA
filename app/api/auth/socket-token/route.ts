import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth'
import { prisma } from '@/lib/prisma'
import {
  createSessionToken,
  sessionCookieName,
  sessionMaxAgeSeconds,
  verifySessionToken,
} from '@/lib/auth'
import { apiError, apiOk } from '@/lib/api-response'
import { logError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

async function buildTokenResponse(user: { id: string; nickname: string | null }) {
  if (!user.nickname) {
    return apiOk({ needsNickname: true })
  }
  const token = createSessionToken(user.id, user.nickname)
  if (!token && process.env.NODE_ENV === 'production') {
    return apiError('AUTH_SECRET no configurat a producció', 500)
  }
  const res = NextResponse.json({
    nickname: user.nickname,
    socketToken: token ?? null,
  })
  if (token) {
    res.cookies.set(sessionCookieName, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionMaxAgeSeconds,
      path: '/',
    })
  }
  return res
}

export async function GET(request: NextRequest) {
  try {
    let user: { id: string; nickname: string | null; password: string | null; lastLoginAt: Date | null } | null = null

    const session = await getServerSession(authOptions)
    if (session?.user) {
      const userId = session.user.id
      const userEmail = session.user.email
      user = userId
        ? await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, nickname: true, password: true, lastLoginAt: true },
          })
        : userEmail
          ? await prisma.user.findUnique({
              where: { email: userEmail },
              select: { id: true, nickname: true, password: true, lastLoginAt: true },
            })
          : null
    }

    if (!user) {
      const existingToken = request.cookies.get(sessionCookieName)?.value
      const payload = verifySessionToken(existingToken)
      if (payload?.userId) {
        user = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: { id: true, nickname: true, password: true, lastLoginAt: true },
        })
      }
    }

    if (!user) {
      return apiError('Usuari no autenticat', 401)
    }

    if (user.nickname) {
      const hasPassword = Boolean(user.password)
      if (!hasPassword && user.lastLoginAt) {
        const monthAgo = new Date()
        monthAgo.setDate(monthAgo.getDate() - 30)
        if (user.lastLoginAt < monthAgo) {
          await prisma.user.update({
            where: { id: user.id },
            data: { nickname: null },
          })
          return apiOk({ needsNickname: true })
        }
      }
    }

    return buildTokenResponse(user)
  } catch (error) {
    logError('Error obtenint socket token:', error)
    return apiError('Error obtenint socket token', 500)
  }
}

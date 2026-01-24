import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth'
import { prisma } from '@/lib/prisma'
import { createSessionToken } from '@/lib/auth'
import { apiError, apiOk } from '@/lib/api-response'
import { logError } from '@/lib/logger'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return apiError('Usuari no autenticat', 401)
    }

    const userId = session.user.id
    const userEmail = session.user.email
    const user = userId
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, nickname: true },
        })
      : userEmail
        ? await prisma.user.findUnique({
            where: { email: userEmail },
            select: { id: true, nickname: true },
          })
        : null

    if (!user) {
      return apiError('Usuari no trobat', 404)
    }

    if (!user.nickname) {
      return apiOk({ needsNickname: true })
    }

    const token = createSessionToken(user.id, user.nickname)
    if (!token && process.env.NODE_ENV === 'production') {
      return apiError('AUTH_SECRET no configurat a producció', 500)
    }

    return apiOk({ nickname: user.nickname, socketToken: token })
  } catch (error) {
    logError('Error obtenint socket token:', error)
    return apiError('Error obtenint socket token', 500)
  }
}

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth'
import { prisma } from '@/lib/prisma'
import { validateNickname, sanitizeString } from '@/lib/validation'
import { createSessionToken } from '@/lib/auth'
import { apiError, apiOk } from '@/lib/api-response'
import { logError } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError('Usuari no autenticat', 401)
    }

    const { nickname } = await request.json()
    if (!nickname) {
      return apiError('El nickname és obligatori', 400)
    }

    const validation = validateNickname(nickname)
    if (!validation.valid) {
      return apiError(validation.error || 'Nickname invàlid', 400)
    }

    const sanitizedNickname = sanitizeString(nickname, 20)
    const existing = await prisma.user.findUnique({
      where: { nickname: sanitizedNickname },
      select: { id: true },
    })
    if (existing && existing.id !== session.user.id) {
      return apiError('Aquest nickname ja està en ús', 400)
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { nickname: sanitizedNickname },
      select: { id: true, nickname: true },
    })

    const token = createSessionToken(user.id, user.nickname || '')
    if (!token && process.env.NODE_ENV === 'production') {
      return apiError('AUTH_SECRET no configurat a producció', 500)
    }

    return apiOk({ nickname: user.nickname, socketToken: token })
  } catch (error) {
    logError('Error completant perfil:', error)
    return apiError('Error completant el perfil', 500)
  }
}

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateNickname } from '@/lib/validation'
import { apiError, apiOk } from '@/lib/api-response'
import { logError } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: { nickname: string } }
) {
  try {
    const nickname = params?.nickname
    if (!nickname) {
      return apiError('Nickname invàlid', 400)
    }
    const nicknameValidation = validateNickname(nickname)
    if (!nicknameValidation.valid) {
      return apiError(nicknameValidation.error || 'Nickname invàlid', 400)
    }

    const user = await prisma.user.findUnique({
      where: { nickname },
      select: {
        nickname: true,
      },
    })

    if (!user) {
      return apiError('Usuari no trobat', 404)
    }

    return apiOk(user)
  } catch (error) {
    logError('Error carregant usuari:', error)
    return apiError('Error carregant usuari', 500)
  }
}


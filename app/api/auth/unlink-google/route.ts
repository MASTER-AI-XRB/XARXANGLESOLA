import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth'
import { prisma } from '@/lib/prisma'
import { apiError, apiOk } from '@/lib/api-response'
import { logError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError('Usuari no autenticat', 401)
    }

    const deleted = await prisma.account.deleteMany({
      where: {
        userId: session.user.id,
        provider: 'google',
      },
    })

    if (deleted.count === 0) {
      return apiError('No tens cap compte de Google vinculat', 400)
    }

    return apiOk({ ok: true })
  } catch (error) {
    logError('Error desvinculant Google:', error)
    return apiError('Error desvinculant el compte de Google', 500)
  }
}

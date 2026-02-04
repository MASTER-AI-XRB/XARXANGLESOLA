import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUserId } from '@/lib/auth'
import { apiError, apiOk } from '@/lib/api-response'
import { logError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest) {
  try {
    const userId = getAuthUserId(request)

    if (!userId) {
      return apiError('Usuari no autenticat', 401)
    }

    // Verificar que l'usuari existeix
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, nickname: true },
    })

    if (!user) {
      return apiError('Usuari no trobat', 404)
    }

    // Eliminar totes les dades de l'usuari
    // Prisma eliminarà automàticament les relacions amb onDelete: Cascade
    await prisma.user.delete({
      where: { id: userId },
    })

    logError(`Usuari eliminat (GDPR): ${user.nickname || userId}`)

    return apiOk({ message: 'Compte i dades eliminats correctament' })
  } catch (error) {
    logError('Error eliminant compte GDPR:', error)
    return apiError('Error en eliminar el compte', 500)
  }
}

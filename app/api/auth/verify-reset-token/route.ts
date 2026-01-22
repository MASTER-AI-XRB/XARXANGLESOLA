import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { apiOk } from '@/lib/api-response'
import { logError } from '@/lib/logger'

// Forçar que aquesta ruta sigui dinàmica (no es pot pre-renderitzar)
export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return apiOk({ valid: false })
    }

    // Buscar usuari amb el token vàlid
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(), // Token encara vàlid
        },
      },
    })

    return apiOk({ valid: !!user })
  } catch (error) {
    logError('Error verificant token:', error)
    return apiOk({ valid: false })
  }
}


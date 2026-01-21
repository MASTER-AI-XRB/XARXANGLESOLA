import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { apiError, apiOk } from '@/lib/api-response'
import { logError } from '@/lib/logger'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token) {
      return apiError('Token de recuperació requerit', 400)
    }

    if (!password) {
      return apiError('La contrasenya és obligatòria', 400)
    }

    if (password.length < 6) {
      return apiError('La contrasenya ha de tenir almenys 6 caràcters', 400)
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

    if (!user) {
      return apiError('Token invàlid o expirat', 400)
    }

    // Encriptar nova contrasenya
    const hashedPassword = await bcrypt.hash(password, 10)

    // Actualitzar contrasenya i eliminar token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    })

    return apiOk({
      message: 'Contrasenya restablida correctament',
    })
  } catch (error) {
    logError('Error en reset-password:', error)
    return apiError('Error restablint la contrasenya', 500)
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Token de recuperació requerit' },
        { status: 400 }
      )
    }

    if (!password) {
      return NextResponse.json(
        { error: 'La contrasenya és obligatòria' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contrasenya ha de tenir almenys 6 caràcters' },
        { status: 400 }
      )
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
      return NextResponse.json(
        { error: 'Token invàlid o expirat' },
        { status: 400 }
      )
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

    return NextResponse.json({
      message: 'Contrasenya restablida correctament',
    })
  } catch (error) {
    console.error('Error en reset-password:', error)
    return NextResponse.json(
      { error: 'Error restablint la contrasenya' },
      { status: 500 }
    )
  }
}


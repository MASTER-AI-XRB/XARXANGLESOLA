import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ valid: false })
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

    return NextResponse.json({ valid: !!user })
  } catch (error) {
    console.error('Error verificant token:', error)
    return NextResponse.json({ valid: false })
  }
}


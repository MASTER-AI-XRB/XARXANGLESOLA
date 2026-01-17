import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { nickname: string } }
) {
  try {
    const user = await prisma.user.findUnique({
      where: { nickname: params.nickname },
      select: {
        id: true,
        nickname: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuari no trobat' },
        { status: 404 }
      )
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error carregant usuari:', error)
    return NextResponse.json(
      { error: 'Error carregant usuari' },
      { status: 500 }
    )
  }
}


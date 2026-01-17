import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

// Funció helper per obtenir instància de Prisma
function getPrisma() {
  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
  } catch (error) {
    console.error('Error creant PrismaClient:', error)
    throw error
  }
}

// Obtenir tots els preferits de l'usuari
export async function GET(request: NextRequest) {
  const prisma = getPrisma()
  try {
    const userId = request.headers.get('x-user-id') || 
                   new URL(request.url).searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'Usuari no autenticat' },
        { status: 401 }
      )
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            user: {
              select: {
                nickname: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const products = favorites.map((fav) => ({
      ...fav.product,
      images: JSON.parse(fav.product.images),
    }))

    return NextResponse.json(products)
  } catch (error) {
    console.error('Error carregant preferits:', error)
    return NextResponse.json(
      { error: 'Error carregant preferits' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// Afegir producte als preferits
export async function POST(request: NextRequest) {
  const prisma = getPrisma()
  try {
    const { userId, productId } = await request.json()

    console.log('POST /api/favorites - userId:', userId, 'productId:', productId)
    console.log('Prisma disponible:', !!prisma)

    if (!prisma) {
      console.error('Prisma no està inicialitzat')
      return NextResponse.json(
        { error: 'Error de servidor: Prisma no inicialitzat' },
        { status: 500 }
      )
    }

    if (!userId || !productId) {
      console.error('Falten dades necessàries')
      return NextResponse.json(
        { error: 'Falten dades necessàries' },
        { status: 400 }
      )
    }

    // Comprovar si ja existeix
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    })

    if (existing) {
      console.log('El preferit ja existeix')
      return NextResponse.json({ message: 'Ja està als preferits', isFavorite: true })
    }

    console.log('Creant nou preferit...')
    const favorite = await prisma.favorite.create({
      data: {
        userId,
        productId,
      },
      include: {
        product: true,
      },
    })

    console.log('Preferit creat exitosament:', favorite.id)
    return NextResponse.json({ 
      ...favorite,
      message: 'Afegit als preferits',
      isFavorite: true 
    })
  } catch (error) {
    console.error('Error afegint preferit:', error)
    return NextResponse.json(
      { error: 'Error afegint preferit', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// Eliminar producte dels preferits
export async function DELETE(request: NextRequest) {
  const prisma = getPrisma()
  try {
    const { userId, productId } = await request.json()

    if (!userId || !productId) {
      return NextResponse.json(
        { error: 'Falten dades necessàries' },
        { status: 400 }
      )
    }

    await prisma.favorite.delete({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    })

    return NextResponse.json({ message: 'Preferit eliminat' })
  } catch (error) {
    console.error('Error eliminant preferit:', error)
    return NextResponse.json(
      { error: 'Error eliminant preferit' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}


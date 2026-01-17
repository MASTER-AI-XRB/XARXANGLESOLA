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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const prisma = getPrisma()
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const { userId, reserved } = await request.json()

    console.log('PATCH /api/products/reserve - userId:', userId, 'reserved:', reserved)
    console.log('Prisma disponible:', !!prisma)

    if (!userId) {
      return NextResponse.json(
        { error: 'Usuari no autenticat' },
        { status: 401 }
      )
    }

    // Comprovar que l'usuari és el propietari
    const product = await prisma.product.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Producte no trobat' },
        { status: 404 }
      )
    }

    if (product.userId !== userId) {
      return NextResponse.json(
        { error: 'No tens permisos per modificar aquest producte' },
        { status: 403 }
      )
    }

    const updatedProduct = await prisma.product.update({
      where: { id: resolvedParams.id },
      data: { reserved: reserved },
      include: {
        user: {
          select: {
            nickname: true,
          },
        },
      },
    })

    return NextResponse.json({
      ...updatedProduct,
      images: JSON.parse(updatedProduct.images),
    })
  } catch (error) {
    console.error('Error actualitzant reserva:', error)
    return NextResponse.json(
      { error: 'Error actualitzant reserva' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}


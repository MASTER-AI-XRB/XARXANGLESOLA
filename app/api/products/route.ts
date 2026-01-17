import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { validateProductName, validateDescription, validateImageFile, sanitizeString } from '@/lib/validation'

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        user: {
          select: {
            nickname: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Parsear les imatges JSON
    const productsWithParsedImages = products.map((product) => ({
      ...product,
      images: JSON.parse(product.images),
    }))

    return NextResponse.json(productsWithParsedImages)
  } catch (error) {
    console.error('Error carregant productes:', error)
    return NextResponse.json(
      { error: 'Error carregant productes' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const userId = formData.get('userId') as string

    if (!userId) {
      return NextResponse.json(
        { error: 'Usuari no autenticat' },
        { status: 401 }
      )
    }

    const name = formData.get('name') as string
    const description = formData.get('description') as string | null
    const images = formData.getAll('images') as File[]

    // Validar nom
    const nameValidation = validateProductName(name)
    if (!nameValidation.valid) {
      return NextResponse.json(
        { error: nameValidation.error },
        { status: 400 }
      )
    }

    // Validar descripció
    const descValidation = validateDescription(description)
    if (!descValidation.valid) {
      return NextResponse.json(
        { error: descValidation.error },
        { status: 400 }
      )
    }

    if (images.length === 0) {
      return NextResponse.json(
        { error: 'Afegeix almenys una imatge' },
        { status: 400 }
      )
    }

    if (images.length > 4) {
      return NextResponse.json(
        { error: 'Màxim 4 imatges' },
        { status: 400 }
      )
    }

    // Validar cada imatge
    for (const image of images) {
      const imageValidation = validateImageFile(image)
      if (!imageValidation.valid) {
        return NextResponse.json(
          { error: imageValidation.error },
          { status: 400 }
        )
      }
    }

    // Crear directori d'uploads si no existeix
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Guardar imatges
    const imagePaths: string[] = []
    for (const image of images) {
      const bytes = await image.arrayBuffer()
      const buffer = Buffer.from(bytes)
      
      // Sanititzar el nom del fitxer
      const sanitizedName = sanitizeString(image.name, 100)
        .replace(/[^a-zA-Z0-9.-]/g, '_')
      const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}-${sanitizedName}`
      const filepath = join(uploadsDir, filename)
      await writeFile(filepath, buffer)
      imagePaths.push(`/uploads/${filename}`)
    }

    // Crear producte
    const product = await prisma.product.create({
      data: {
        name: sanitizeString(name, 100),
        description: description ? sanitizeString(description, 2000) : null,
        images: JSON.stringify(imagePaths),
        userId,
      },
      include: {
        user: {
          select: {
            nickname: true,
          },
        },
      },
    })

    return NextResponse.json({
      ...product,
      images: JSON.parse(product.images),
    })
  } catch (error) {
    console.error('Error creant producte:', error)
    return NextResponse.json(
      { error: 'Error al crear el producte' },
      { status: 500 }
    )
  }
}


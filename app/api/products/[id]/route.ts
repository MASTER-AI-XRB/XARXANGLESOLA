import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { put } from '@vercel/blob'
import { getAuthUserId } from '@/lib/auth'
import { mapProduct } from '@/lib/product-map'
import {
  validateProductName,
  validateDescription,
  validateImageFile,
  sanitizeString,
  validateUuid,
} from '@/lib/validation'
import { apiError, apiOk } from '@/lib/api-response'
import { logError } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const idValidation = validateUuid(resolvedParams.id, 'producte')
    if (!idValidation.valid) {
      return apiError(idValidation.error || 'Producte no vàlid', 400)
    }
    const product = await prisma.product.findUnique({
      where: { id: resolvedParams.id },
      include: {
        user: { select: { nickname: true } },
        reservedBy: { select: { nickname: true } },
        _count: { select: { favorites: true } },
      },
    })

    if (!product) {
      return apiError('Producte no trobat', 404)
    }

    return apiOk(mapProduct(product))
  } catch (error) {
    logError('Error carregant producte:', error)
    return apiError('Error carregant producte', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const idValidation = validateUuid(resolvedParams.id, 'producte')
    if (!idValidation.valid) {
      return apiError(idValidation.error || 'Producte no vàlid', 400)
    }
    const authUserId = getAuthUserId(request)

    if (!authUserId) {
      return apiError('Usuari no autenticat', 401)
    }

    // Comprovar que l'usuari és el propietari
    const product = await prisma.product.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!product) {
      return apiError('Producte no trobat', 404)
    }

    if (product.userId !== authUserId) {
      return apiError('No tens permisos per eliminar aquest producte', 403)
    }

    // Eliminar el producte (les imatges s'eliminaran manualment si cal)
    await prisma.product.delete({
      where: { id: resolvedParams.id },
    })

    return apiOk({ message: 'Producte eliminat correctament' })
  } catch (error) {
    logError('Error eliminant producte:', error)
    return apiError('Error eliminant producte', 500)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const formData = await request.formData()
    const authUserId = getAuthUserId(request)

    if (!authUserId) {
      return NextResponse.json(
        { error: 'Usuari no autenticat' },
        { status: 401 }
      )
    }

    const product = await prisma.product.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Producte no trobat' },
        { status: 404 }
      )
    }

    if (product.userId !== authUserId) {
      return NextResponse.json(
        { error: 'No tens permisos per modificar aquest producte' },
        { status: 403 }
      )
    }

    const name = formData.get('name') as string
    const description = formData.get('description') as string | null
    const existingImagesRaw = formData.get('existingImages') as string | null
    const newImages = formData.getAll('images') as File[]

    const nameValidation = validateProductName(name)
    if (!nameValidation.valid) {
      return NextResponse.json(
        { error: nameValidation.error || 'Nom de producte no vàlid' },
        { status: 400 }
      )
    }

    const descValidation = validateDescription(description)
    if (!descValidation.valid) {
      return NextResponse.json(
        { error: descValidation.error || 'Descripció no vàlida' },
        { status: 400 }
      )
    }

    let existingImages: string[] = []
    if (existingImagesRaw) {
      try {
        const parsed = JSON.parse(existingImagesRaw)
        if (Array.isArray(parsed)) {
          existingImages = parsed.filter((item) => typeof item === 'string')
        }
      } catch {
        return NextResponse.json(
          { error: 'Imatges existents no vàlides' },
          { status: 400 }
        )
      }
    }

    const totalImages = existingImages.length + newImages.length
    if (totalImages === 0) {
      return NextResponse.json(
        { error: 'Afegeix almenys una imatge' },
        { status: 400 }
      )
    }

    if (totalImages > 4) {
      return NextResponse.json(
        { error: 'Màxim 4 imatges' },
        { status: 400 }
      )
    }

    for (const image of newImages) {
      const imageValidation = validateImageFile(image)
      if (!imageValidation.valid) {
        return NextResponse.json(
          { error: imageValidation.error || 'Imatge no vàlida' },
          { status: 400 }
        )
      }
    }

    const imagePaths: string[] = [...existingImages]

    if (newImages.length > 0) {
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.warn('BLOB_READ_WRITE_TOKEN no configurat, intentant usar sistema de fitxers local...')
        try {
          const { writeFile, mkdir } = await import('fs/promises')
          const { join } = await import('path')
          const { existsSync } = await import('fs')

          const uploadsDir = join(process.cwd(), 'public', 'uploads')
          if (!existsSync(uploadsDir)) {
            await mkdir(uploadsDir, { recursive: true })
          }

          for (const image of newImages) {
            const bytes = await image.arrayBuffer()
            const buffer = Buffer.from(bytes)

            const sanitizedName = sanitizeString(image.name, 100)
              .replace(/[^a-zA-Z0-9.-]/g, '_')
            const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}-${sanitizedName}`
            const filepath = join(uploadsDir, filename)
            await writeFile(filepath, buffer)
            imagePaths.push(`/uploads/${filename}`)
          }
        } catch (fallbackError) {
          console.error('Error amb fallback local:', fallbackError)
          return NextResponse.json(
            { error: 'Error al pujar imatges. Configura Vercel Blob Storage per producció.' },
            { status: 500 }
          )
        }
      } else {
        for (const image of newImages) {
          try {
            const bytes = await image.arrayBuffer()
            const buffer = Buffer.from(bytes)

            const sanitizedName = sanitizeString(image.name, 100)
              .replace(/[^a-zA-Z0-9.-]/g, '_')
            const filename = `product-${Date.now()}-${Math.random().toString(36).substring(7)}-${sanitizedName}`

            const blob = await put(filename, buffer, {
              access: 'public',
              addRandomSuffix: true,
              contentType: image.type,
            })

            imagePaths.push(blob.url)
          } catch (blobError) {
            console.error('Error pujant imatge a Blob:', blobError)
            const errorMessage =
              blobError instanceof Error && blobError.message.includes('token')
                ? 'Error d\'autenticació amb Vercel Blob. Verifica BLOB_READ_WRITE_TOKEN.'
                : 'Error al pujar imatges a Vercel Blob'

            return NextResponse.json(
              { error: errorMessage },
              { status: 500 }
            )
          }
        }
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id: resolvedParams.id },
      data: {
        name: sanitizeString(name, 100),
        description: description ? sanitizeString(description, 2000) : null,
        images: JSON.stringify(imagePaths),
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
      ...updatedProduct,
      images: JSON.parse(updatedProduct.images),
    })
  } catch (error) {
    console.error('Error actualitzant producte:', error)
    return NextResponse.json(
      { error: 'Error actualitzant producte' },
      { status: 500 }
    )
  }
}


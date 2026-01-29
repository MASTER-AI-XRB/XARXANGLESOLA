import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { put } from '@vercel/blob'
import {
  validateProductName,
  validateDescription,
  validateImageFile,
  sanitizeString,
} from '@/lib/validation'
import { getAuthUserId } from '@/lib/auth'
import { mapProduct } from '@/lib/product-map'
import { apiError, apiOk } from '@/lib/api-response'
import { logError, logWarn } from '@/lib/logger'

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        user: { select: { nickname: true } },
        reservedBy: { select: { nickname: true } },
        _count: { select: { favorites: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const productsWithParsedImages = products.map(mapProduct)

    return apiOk(productsWithParsedImages)
  } catch (error) {
    logError('Error carregant productes:', error)
    return apiError('Error carregant productes', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const authUserId = getAuthUserId(request)

    if (!authUserId) {
      return apiError('Usuari no autenticat', 401)
    }

    const name = formData.get('name') as string
    const description = formData.get('description') as string | null
    const images = formData.getAll('images') as File[]

    // Validar nom
    const nameValidation = validateProductName(name)
    if (!nameValidation.valid) {
      return apiError(nameValidation.error || 'Nom de producte no vàlid', 400)
    }

    // Validar descripció
    const descValidation = validateDescription(description)
    if (!descValidation.valid) {
      return apiError(descValidation.error || 'Descripció no vàlida', 400)
    }

    if (images.length === 0) {
      return apiError('Afegeix almenys una imatge', 400)
    }

    if (images.length > 4) {
      return apiError('Màxim 4 imatges', 400)
    }

    // Validar cada imatge
    for (const image of images) {
      const imageValidation = validateImageFile(image)
      if (!imageValidation.valid) {
        return apiError(imageValidation.error || 'Imatge no vàlida', 400)
      }
    }

    // Guardar imatges a Vercel Blob Storage
    const imagePaths: string[] = []
    
    // Verificar si BLOB_READ_WRITE_TOKEN està configurat (Vercel Blob)
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      logWarn(
        'BLOB_READ_WRITE_TOKEN no configurat, intentant usar sistema de fitxers local...'
      )
      // Fallback a sistema local (no funcionarà a Vercel però sí localment)
      try {
        const { writeFile, mkdir } = await import('fs/promises')
        const { join } = await import('path')
        const { existsSync } = await import('fs')
        
        const uploadsDir = join(process.cwd(), 'public', 'uploads')
        if (!existsSync(uploadsDir)) {
          await mkdir(uploadsDir, { recursive: true })
        }

        for (const image of images) {
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
        logError('Error amb fallback local:', fallbackError)
        return apiError(
          'Error al pujar imatges. Configura Vercel Blob Storage per producció.',
          500
        )
      }
    } else {
      // Usar Vercel Blob Storage
      for (const image of images) {
        try {
          const bytes = await image.arrayBuffer()
          const buffer = Buffer.from(bytes)
          
          // Sanititzar el nom del fitxer
          const sanitizedName = sanitizeString(image.name, 100)
            .replace(/[^a-zA-Z0-9.-]/g, '_')
          const filename = `product-${Date.now()}-${Math.random().toString(36).substring(7)}-${sanitizedName}`
          
          // Pujar a Vercel Blob
          const blob = await put(filename, buffer, {
            access: 'public',
            addRandomSuffix: true,
            contentType: image.type,
          })
          
          imagePaths.push(blob.url)
        } catch (blobError) {
          logError('Error pujant imatge a Blob:', blobError)

          // Verificar si és un error d'autenticació amb Blob
          const errorMessage = blobError instanceof Error && blobError.message.includes('token')
            ? 'Error d\'autenticació amb Vercel Blob. Verifica BLOB_READ_WRITE_TOKEN.'
            : 'Error al pujar imatges a Vercel Blob'
          
          return apiError(errorMessage, 500)
        }
      }
    }

    // Crear producte
    const product = await prisma.product.create({
      data: {
        name: sanitizeString(name, 100),
        description: description ? sanitizeString(description, 2000) : null,
        images: JSON.stringify(imagePaths),
        userId: authUserId,
      },
      include: {
        user: {
          select: {
            nickname: true,
          },
        },
      },
    })

    return apiOk(mapProduct(product))
  } catch (error) {
    logError('Error creant producte:', error)

    // Retornar més informació en desenvolupament
    const errorMessage = process.env.NODE_ENV === 'production'
      ? 'Error al crear el producte'
      : error instanceof Error ? error.message : 'Error desconegut'
    
    return apiError(errorMessage, 500)
  }
}


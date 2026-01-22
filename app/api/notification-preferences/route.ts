import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getAuthUserId } from '@/lib/auth'
import { apiError, apiOk } from '@/lib/api-response'
import { logError } from '@/lib/logger'

function getPrisma() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

const parseList = (value?: string | null): string[] =>
  value
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : []

const normalizeList = (items: string[], maxItems: number, maxLength: number) => {
  const normalized = items
    .map((item) => item.trim().slice(0, maxLength))
    .filter(Boolean)
  return normalized.slice(0, maxItems)
}

export async function GET(request: NextRequest) {
  const prisma = getPrisma()
  try {
    const authUserId = getAuthUserId(request)
    if (!authUserId) {
      return apiError('Usuari no autenticat', 401)
    }

    const existing = await prisma.notificationPreference.findUnique({
      where: { userId: authUserId },
    })

    if (!existing) {
      return apiOk({
        receiveAll: true,
        allowedNicknames: [],
        allowedProductKeywords: [],
        enabledTypes: [],
      })
    }

    return apiOk({
      receiveAll: existing.receiveAll,
      allowedNicknames: existing.allowedNicknames ? JSON.parse(existing.allowedNicknames) : [],
      allowedProductKeywords: existing.allowedProductKeywords
        ? JSON.parse(existing.allowedProductKeywords)
        : [],
      enabledTypes: existing.enabledTypes ? JSON.parse(existing.enabledTypes) : [],
    })
  } catch (error) {
    logError('Error carregant preferències de notificació:', error)
    return apiError('Error carregant preferències de notificació', 500)
  } finally {
    await prisma.$disconnect()
  }
}

export async function PUT(request: NextRequest) {
  const prisma = getPrisma()
  try {
    const { receiveAll, allowedNicknames, allowedProductKeywords, enabledTypes } =
      await request.json()
    const authUserId = getAuthUserId(request)

    if (!authUserId) {
      return apiError('Usuari no autenticat', 401)
    }

    const nicknamesRaw = Array.isArray(allowedNicknames)
      ? allowedNicknames
      : parseList(allowedNicknames)
    const keywordsRaw = Array.isArray(allowedProductKeywords)
      ? allowedProductKeywords
      : parseList(allowedProductKeywords)
    const typesRaw = Array.isArray(enabledTypes) ? enabledTypes : parseList(enabledTypes)

    const nicknames = normalizeList(nicknamesRaw, 25, 20)
    const keywords = normalizeList(keywordsRaw, 25, 50)
    const types = normalizeList(typesRaw, 25, 30)

    const saved = await prisma.notificationPreference.upsert({
      where: { userId: authUserId },
      create: {
        userId: authUserId,
        receiveAll: receiveAll !== false,
        allowedNicknames: JSON.stringify(nicknames),
        allowedProductKeywords: JSON.stringify(keywords),
        enabledTypes: JSON.stringify(types),
      },
      update: {
        receiveAll: receiveAll !== false,
        allowedNicknames: JSON.stringify(nicknames),
        allowedProductKeywords: JSON.stringify(keywords),
        enabledTypes: JSON.stringify(types),
      },
    })

    return apiOk({
      receiveAll: saved.receiveAll,
      allowedNicknames: nicknames,
      allowedProductKeywords: keywords,
      enabledTypes: types,
    })
  } catch (error) {
    logError('Error guardant preferències de notificació:', error)
    return apiError('Error guardant preferències de notificació', 500)
  } finally {
    await prisma.$disconnect()
  }
}

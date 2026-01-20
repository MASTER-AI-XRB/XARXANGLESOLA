import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

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

export async function GET(request: NextRequest) {
  const prisma = getPrisma()
  try {
    const userId = request.headers.get('x-user-id') || new URL(request.url).searchParams.get('userId')
    if (!userId) {
      return NextResponse.json({ error: 'Usuari no autenticat' }, { status: 401 })
    }

    const existing = await prisma.notificationPreference.findUnique({
      where: { userId },
    })

    if (!existing) {
      return NextResponse.json({
        userId,
        receiveAll: true,
        allowedNicknames: [],
        allowedProductKeywords: [],
        enabledTypes: [],
      })
    }

    return NextResponse.json({
      userId,
      receiveAll: existing.receiveAll,
      allowedNicknames: existing.allowedNicknames ? JSON.parse(existing.allowedNicknames) : [],
      allowedProductKeywords: existing.allowedProductKeywords
        ? JSON.parse(existing.allowedProductKeywords)
        : [],
      enabledTypes: existing.enabledTypes ? JSON.parse(existing.enabledTypes) : [],
    })
  } catch (error) {
    console.error('Error carregant preferències de notificació:', error)
    return NextResponse.json(
      { error: 'Error carregant preferències de notificació' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function PUT(request: NextRequest) {
  const prisma = getPrisma()
  try {
    const { userId, receiveAll, allowedNicknames, allowedProductKeywords, enabledTypes } =
      await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'Usuari no autenticat' }, { status: 401 })
    }

    const nicknames = Array.isArray(allowedNicknames)
      ? allowedNicknames
      : parseList(allowedNicknames)
    const keywords = Array.isArray(allowedProductKeywords)
      ? allowedProductKeywords
      : parseList(allowedProductKeywords)
    const types = Array.isArray(enabledTypes) ? enabledTypes : parseList(enabledTypes)

    const saved = await prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
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

    return NextResponse.json({
      userId: saved.userId,
      receiveAll: saved.receiveAll,
      allowedNicknames: nicknames,
      allowedProductKeywords: keywords,
      enabledTypes: types,
    })
  } catch (error) {
    console.error('Error guardant preferències de notificació:', error)
    return NextResponse.json(
      { error: 'Error guardant preferències de notificació' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

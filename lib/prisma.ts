import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

let prismaInstance: PrismaClient

function getPrismaClient(): PrismaClient {
  if (prismaInstance) {
    return prismaInstance
  }

  if (globalThis.prisma) {
    prismaInstance = globalThis.prisma
    return prismaInstance
  }

  try {
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
    
    if (process.env.NODE_ENV !== 'production') {
      globalThis.prisma = prismaInstance
    }
    
    return prismaInstance
  } catch (error) {
    console.error('Error creant PrismaClient:', error)
    throw error
  }
}

export const prisma = getPrismaClient()


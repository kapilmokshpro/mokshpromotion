import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
    return new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
}

declare global {
    var pgPool: undefined | ReturnType<typeof pgPoolSingleton>
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

export const db = globalThis.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalThis.prisma = db

// Ensure graceful shutdown
if (process.env.NODE_ENV === 'production') {
    process.on('beforeExit', async () => {
        await db.$disconnect()
    })
}

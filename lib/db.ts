import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL

const pgPoolSingleton = () => {
    if (!connectionString) {
        throw new Error('DATABASE_URL is not configured')
    }

    return new Pool({
        connectionString,
        ssl: connectionString.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
    })
}

const prismaClientSingleton = () => {
    const pool = globalThis.pgPool ?? pgPoolSingleton()
    if (process.env.NODE_ENV !== 'production') globalThis.pgPool = pool

    const adapter = new PrismaPg(pool)

    return new PrismaClient({
        adapter,
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

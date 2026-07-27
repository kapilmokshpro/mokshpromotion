import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
    return new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
}

declare global {
    // eslint-disable-next-line no-var
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

export const db = globalThis.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalThis.prisma = db

/**
 * Helper function to retry DB queries when Neon Cloud DB is waking up or experiencing transient connection issues (P1001, P1002, timeouts).
 */
export async function withDbRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 600): Promise<T> {
    let lastErr: unknown
    for (let i = 0; i < retries; i++) {
        try {
            return await fn()
        } catch (err: any) {
            lastErr = err
            const isConnError =
                err?.code === 'P1001' ||
                err?.code === 'P1002' ||
                err?.message?.includes("Can't reach database") ||
                err?.message?.includes("Connection pool") ||
                err?.message?.includes("ETIMEDOUT")

            if (isConnError && i < retries - 1) {
                console.warn(`[DB Retry] Connection issue (${err?.code || 'P1001'}). Retrying in ${delayMs * (i + 1)}ms... (Attempt ${i + 1}/${retries})`)
                await new Promise((res) => setTimeout(res, delayMs * (i + 1)))
                continue
            }
            throw err
        }
    }
    throw lastErr
}

// Ensure graceful shutdown
if (process.env.NODE_ENV === 'production') {
    process.on('beforeExit', async () => {
        await db.$disconnect()
    })
}

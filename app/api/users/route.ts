import { db } from "@/lib/db"
import { userCreateSchema } from "@/lib/schemas"
import { Prisma } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"

const USER_ID_SEQUENCE_SYNC_SQL = `
SELECT setval(
    pg_get_serial_sequence('"User"', 'id'),
    COALESCE((SELECT MAX(id) FROM "User"), 0) + 1,
    false
)
`

const canManageUsers = (role?: string) => role === "ADMIN" || role === "SUPER_ADMIN"
const apiError = (status: number, message: string) => ({ status, message } as const)

const getUniqueTargets = (error: Prisma.PrismaClientKnownRequestError) => {
    const target = error.meta?.target
    if (Array.isArray(target)) return target.map(String)
    if (typeof target === "string") return [target]
    return []
}

const createUserWithRecovery = async (data: {
    name: string
    email: string
    password: string
    role: "ADMIN" | "SALES" | "FINANCE" | "OPERATIONS" | "VENDOR"
}) => {
    try {
        return await db.user.create({ data })
    } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
            throw error
        }

        const targets = getUniqueTargets(error)

        if (targets.includes("email")) {
            throw apiError(409, "User already exists")
        }

        if (targets.includes("id")) {
            await db.$executeRawUnsafe(USER_ID_SEQUENCE_SYNC_SQL)
            return db.user.create({ data })
        }

        throw error
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || !canManageUsers(session.user.role)) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const body = await req.json()
        const parsed = userCreateSchema.safeParse({
            ...body,
            email: typeof body?.email === "string" ? body.email.trim().toLowerCase() : body?.email,
            name: typeof body?.name === "string" ? body.name.trim() : body?.name,
        })

        if (!parsed.success) {
            return new NextResponse(parsed.error.issues[0]?.message || "Invalid request data", { status: 400 })
        }

        const { email, password, name, role } = parsed.data

        const hashedPassword = await bcrypt.hash(password, 10)

        const existingUser = await db.user.findUnique({
            where: { email }
        })

        if (existingUser) {
            return new NextResponse("User already exists", { status: 409 })
        }

        const user = await createUserWithRecovery({
            name,
            email,
            password: hashedPassword,
            role: role || "SALES",
        })

        // Remove password from response
        const { password: _password, ...userWithoutPassword } = user
        void _password

        return NextResponse.json(userWithoutPassword)
    } catch (error) {
        if (
            typeof error === "object" &&
            error !== null &&
            "status" in error &&
            "message" in error &&
            typeof (error as { status: unknown }).status === "number" &&
            typeof (error as { message: unknown }).message === "string"
        ) {
            const typedError = error as { status: number; message: string }
            return new NextResponse(typedError.message, { status: typedError.status })
        }

        if (error instanceof Prisma.PrismaClientInitializationError) {
            return new NextResponse("Database unavailable", { status: 503 })
        }

        console.error("USERS_POST", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session || !canManageUsers(session.user.role)) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const users = await db.user.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true
            }
        })

        return NextResponse.json(users)
    } catch (error) {
        console.error("USERS_GET", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

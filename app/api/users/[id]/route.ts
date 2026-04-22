import { db } from "@/lib/db"
import { userUpdateSchema } from "@/lib/schemas"
import { Prisma } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"

const canManageUsers = (role?: string) => role === "ADMIN" || role === "SUPER_ADMIN"
const isSuperAdmin = (role?: string) => role === "SUPER_ADMIN"

const parseUserId = (value: string) => {
    const id = Number(value)
    return Number.isInteger(id) && id > 0 ? id : null
}

const sanitizeUpdateBody = (body: any) => ({
    ...body,
    email: typeof body?.email === "string" ? body.email.trim().toLowerCase() : body?.email,
    name: typeof body?.name === "string" ? body.name.trim() : body?.name,
    password: typeof body?.password === "string" ? body.password : "",
})

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || !canManageUsers(session.user.role)) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const userId = parseUserId(params.id)
        if (!userId) {
            return new NextResponse("Invalid user id", { status: 400 })
        }

        const targetUser = await db.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true }
        })

        if (!targetUser) {
            return new NextResponse("User not found", { status: 404 })
        }

        if (targetUser.role === "SUPER_ADMIN" && !isSuperAdmin(session.user.role)) {
            return new NextResponse("Only SUPER_ADMIN can modify SUPER_ADMIN accounts", { status: 403 })
        }

        const body = await req.json()
        const parsed = userUpdateSchema.safeParse(sanitizeUpdateBody(body))
        if (!parsed.success) {
            return new NextResponse(parsed.error.issues[0]?.message || "Invalid request data", { status: 400 })
        }

        const { name, email, role, password } = parsed.data

        const emailTakenByAnotherUser = await db.user.findFirst({
            where: {
                email,
                id: { not: userId }
            },
            select: { id: true }
        })

        if (emailTakenByAnotherUser) {
            return new NextResponse("Email already in use", { status: 409 })
        }

        const updateData: Prisma.UserUpdateInput = {
            name,
            email,
            role,
        }

        if (password) {
            updateData.password = await bcrypt.hash(password, 10)
        }

        const updatedUser = await db.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true
            }
        })

        return NextResponse.json(updatedUser)
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return new NextResponse("Email already in use", { status: 409 })
        }

        if (error instanceof Prisma.PrismaClientInitializationError) {
            return new NextResponse("Database unavailable", { status: 503 })
        }

        console.error("USERS_PUT", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || !canManageUsers(session.user.role)) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const userId = parseUserId(params.id)
        if (!userId) {
            return new NextResponse("Invalid user id", { status: 400 })
        }

        const sessionUserId = Number(session.user.id)
        if (Number.isInteger(sessionUserId) && sessionUserId === userId) {
            return new NextResponse("You cannot delete your own account", { status: 400 })
        }

        const targetUser = await db.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true }
        })

        if (!targetUser) {
            return new NextResponse("User not found", { status: 404 })
        }

        if (targetUser.role === "SUPER_ADMIN" && !isSuperAdmin(session.user.role)) {
            return new NextResponse("Only SUPER_ADMIN can delete SUPER_ADMIN accounts", { status: 403 })
        }

        await db.user.delete({
            where: { id: userId }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
            return new NextResponse("Cannot delete this user because related records exist", { status: 409 })
        }

        if (error instanceof Prisma.PrismaClientInitializationError) {
            return new NextResponse("Database unavailable", { status: 503 })
        }

        console.error("USERS_DELETE", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

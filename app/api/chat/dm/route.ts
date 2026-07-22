import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// POST /api/chat/dm — Get or create a 1-on-1 direct message channel
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const currentUserId = Number(session.user.id)
        const body = await req.json()
        const targetUserId = Number(body.targetUserId)

        if (!targetUserId || isNaN(targetUserId) || targetUserId === currentUserId) {
            return NextResponse.json({ error: "Invalid target user" }, { status: 400 })
        }

        const targetUser = await db.user.findUnique({
            where: { id: targetUserId },
            select: { id: true, name: true, email: true, role: true, employeeId: true, department: true },
        })

        if (!targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        // Find existing DM channel between currentUserId and targetUserId
        const existingDm = await db.chatChannel.findFirst({
            where: {
                isDirect: true,
                AND: [
                    { members: { some: { userId: currentUserId } } },
                    { members: { some: { userId: targetUserId } } },
                ],
            },
            include: {
                members: {
                    include: {
                        user: { select: { id: true, name: true, email: true, role: true, employeeId: true, department: true } },
                    },
                },
            },
        })

        if (existingDm) {
            return NextResponse.json({
                id: existingDm.id,
                name: targetUser.name || targetUser.email,
                description: `1-on-1 chat with ${targetUser.name}`,
                isDefault: false,
                isDirect: true,
                memberCount: existingDm.members.length,
                targetUser,
            })
        }

        // Create new DM channel
        const newDm = await db.chatChannel.create({
            data: {
                name: `DM-${Math.min(currentUserId, targetUserId)}-${Math.max(currentUserId, targetUserId)}`,
                isDirect: true,
                isDefault: false,
                createdById: currentUserId,
                members: {
                    create: [
                        { userId: currentUserId },
                        { userId: targetUserId },
                    ],
                },
            },
        })

        return NextResponse.json({
            id: newDm.id,
            name: targetUser.name || targetUser.email,
            description: `1-on-1 chat with ${targetUser.name}`,
            isDefault: false,
            isDirect: true,
            memberCount: 2,
            targetUser,
        })
    } catch (error) {
        console.error("[DM API Error]", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// GET /api/chat/channels — List channels the user is a member of (with unread counts)
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

    const userId = Number(session.user.id)

    // Ensure default "General" channel exists and user is a member
    await ensureDefaultChannel(userId)

    const memberships = await db.chatChannelMember.findMany({
        where: { userId },
        include: {
            channel: {
                include: {
                    _count: { select: { members: true } },
                    createdBy: { select: { name: true } },
                    members: {
                        include: {
                            user: {
                                select: { id: true, name: true, email: true, role: true, employeeId: true },
                            },
                        },
                    },
                },
            },
        },
        orderBy: { channel: { updatedAt: "desc" } },
    })

    // Get unread counts and format names for DM channels
    const channels = await Promise.all(
        memberships.map(async (m) => {
            const unreadCount = await db.chatMessage.count({
                where: {
                    channelId: m.channelId,
                    createdAt: { gt: m.lastReadAt },
                    senderId: { not: userId },
                },
            })

            let channelName = m.channel.name
            let targetUser = null

            if (m.channel.isDirect) {
                const otherMember = m.channel.members.find((member) => member.userId !== userId)
                if (otherMember) {
                    targetUser = otherMember.user
                    channelName = otherMember.user.name || otherMember.user.email
                }
            }

            return {
                id: m.channel.id,
                name: channelName,
                description: m.channel.description,
                isDefault: m.channel.isDefault,
                isDirect: m.channel.isDirect,
                memberCount: m.channel._count.members,
                createdBy: m.channel.createdBy.name,
                lastReadAt: m.lastReadAt.toISOString(),
                unreadCount,
                targetUser,
            }
        })
    )

        return NextResponse.json(channels)
    } catch (error) {
        console.error("[Channels GET API Error]", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// POST /api/chat/channels — Create a new channel
export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = Number(session.user.id)
    const role = session.user.role

    // Only admin and super admin can create group channels
    if (!["ADMIN", "SUPER_ADMIN"].includes(role || "")) {
        return NextResponse.json({ error: "Only admins can create group channels" }, { status: 403 })
    }

    const body = await req.json()
    const { name, description, memberIds } = body as {
        name: string
        description?: string
        memberIds?: number[]
    }

    if (!name || name.trim().length < 2) {
        return NextResponse.json({ error: "Channel name must be at least 2 characters" }, { status: 400 })
    }

    // Create channel and add creator + specified members
    const allMemberIds = new Set([userId, ...(memberIds || [])])

    const channel = await db.chatChannel.create({
        data: {
            name: name.trim(),
            description: description?.trim() || null,
            createdById: userId,
            isDirect: false,
            members: {
                create: Array.from(allMemberIds).map((id) => ({
                    userId: id,
                })),
            },
        },
        include: {
            _count: { select: { members: true } },
        },
    })

    return NextResponse.json({
        id: channel.id,
        name: channel.name,
        description: channel.description,
        isDefault: channel.isDefault,
        isDirect: false,
        memberCount: channel._count.members,
    })
}

/**
 * Ensure the default "General" channel exists and the user is a member
 */
async function ensureDefaultChannel(userId: number) {
    let defaultChannel = await db.chatChannel.findFirst({
        where: { isDefault: true },
    })

    if (!defaultChannel) {
        // Create the default channel with the first admin or current user as creator
        const admin = await db.user.findFirst({
            where: { role: { in: ["SUPER_ADMIN", "ADMIN"] } },
            select: { id: true },
        })

        const creatorId = admin?.id || userId

        // Get all CRM users (excluding vendors and site-media) to add to the default channel
        const allUsers = await db.user.findMany({
            where: { role: { notIn: ["VENDOR", "SITE_MEDIA"] } },
            select: { id: true },
        })

        defaultChannel = await db.chatChannel.create({
            data: {
                name: "General",
                description: "Team-wide chat for coordination",
                isDefault: true,
                createdById: creatorId,
                members: {
                    create: allUsers.map((u) => ({
                        userId: u.id,
                    })),
                },
            },
        })

        return
    }

    // Ensure current user is a member
    const membership = await db.chatChannelMember.findUnique({
        where: { channelId_userId: { channelId: defaultChannel.id, userId } },
    })

    if (!membership) {
        await db.chatChannelMember.create({
            data: {
                channelId: defaultChannel.id,
                userId,
            },
        })
    }
}

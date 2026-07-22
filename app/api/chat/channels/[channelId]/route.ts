import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// GET /api/chat/channels/[channelId] — Get channel details + members
export async function GET(
    _req: Request,
    { params }: { params: { channelId: string } }
) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = Number(session.user.id)
    const { channelId } = params

    // Check membership
    const membership = await db.chatChannelMember.findUnique({
        where: { channelId_userId: { channelId, userId } },
    })

    if (!membership) {
        return NextResponse.json({ error: "Not a member of this channel" }, { status: 403 })
    }

    const channel = await db.chatChannel.findUnique({
        where: { id: channelId },
        include: {
            members: {
                include: {
                    user: {
                        select: { id: true, name: true, email: true, role: true, employeeId: true, department: true },
                    },
                },
                orderBy: { joinedAt: "asc" },
            },
            createdBy: { select: { id: true, name: true } },
            _count: { select: { messages: true } },
        },
    })

    if (!channel) {
        return NextResponse.json({ error: "Channel not found" }, { status: 404 })
    }

    return NextResponse.json({
        id: channel.id,
        name: channel.name,
        description: channel.description,
        isDefault: channel.isDefault,
        createdBy: channel.createdBy,
        messageCount: channel._count.messages,
        members: channel.members.map((m) => ({
            ...m.user,
            joinedAt: m.joinedAt.toISOString(),
        })),
    })
}

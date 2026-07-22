import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// GET /api/chat/unread — Get total unread count across all channels
export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = Number(session.user.id)

    const memberships = await db.chatChannelMember.findMany({
        where: { userId },
        select: { channelId: true, lastReadAt: true },
    })

    if (memberships.length === 0) {
        return NextResponse.json({ total: 0 })
    }

    let total = 0
    for (const m of memberships) {
        const count = await db.chatMessage.count({
            where: {
                channelId: m.channelId,
                createdAt: { gt: m.lastReadAt },
                senderId: { not: userId },
            },
        })
        total += count
    }

    return NextResponse.json({ total })
}

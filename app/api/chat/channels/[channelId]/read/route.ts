import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// POST /api/chat/channels/[channelId]/read — Mark channel as read
export async function POST(
    _req: Request,
    { params }: { params: { channelId: string } }
) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = Number(session.user.id)
    const { channelId } = params

    const membership = await db.chatChannelMember.findUnique({
        where: { channelId_userId: { channelId, userId } },
    })

    if (!membership) {
        return NextResponse.json({ error: "Not a member" }, { status: 403 })
    }

    await db.chatChannelMember.update({
        where: { channelId_userId: { channelId, userId } },
        data: { lastReadAt: new Date() },
    })

    return NextResponse.json({ success: true })
}

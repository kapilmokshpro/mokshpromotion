import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// POST /api/chat/channels/[channelId]/members — Add members
export async function POST(
    req: Request,
    { params }: { params: { channelId: string } }
) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = session.user.role
    if (!["ADMIN", "SUPER_ADMIN"].includes(role || "")) {
        return NextResponse.json({ error: "Only admins can manage members" }, { status: 403 })
    }

    const { channelId } = params
    const body = await req.json()
    const { userIds } = body as { userIds: number[] }

    if (!userIds || userIds.length === 0) {
        return NextResponse.json({ error: "No user IDs provided" }, { status: 400 })
    }

    const channel = await db.chatChannel.findUnique({
        where: { id: channelId },
    })

    if (!channel) {
        return NextResponse.json({ error: "Channel not found" }, { status: 404 })
    }

    // Upsert members (skip if already exists)
    const results = await Promise.allSettled(
        userIds.map((userId) =>
            db.chatChannelMember.upsert({
                where: { channelId_userId: { channelId, userId } },
                create: { channelId, userId },
                update: {}, // No-op if exists
            })
        )
    )

    const added = results.filter((r) => r.status === "fulfilled").length

    return NextResponse.json({ added })
}

// DELETE /api/chat/channels/[channelId]/members — Remove a member
export async function DELETE(
    req: Request,
    { params }: { params: { channelId: string } }
) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = session.user.role
    if (!["ADMIN", "SUPER_ADMIN"].includes(role || "")) {
        return NextResponse.json({ error: "Only admins can manage members" }, { status: 403 })
    }

    const { channelId } = params
    const body = await req.json()
    const { userId } = body as { userId: number }

    if (!userId) {
        return NextResponse.json({ error: "No user ID provided" }, { status: 400 })
    }

    // Don't allow removing from the default channel
    const channel = await db.chatChannel.findUnique({
        where: { id: channelId },
    })

    if (channel?.isDefault) {
        return NextResponse.json({ error: "Cannot remove members from the default channel" }, { status: 400 })
    }

    await db.chatChannelMember.deleteMany({
        where: { channelId, userId },
    })

    return NextResponse.json({ success: true })
}

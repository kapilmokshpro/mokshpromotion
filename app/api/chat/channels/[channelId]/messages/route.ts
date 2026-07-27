import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db, withDbRetry } from "@/lib/db"
import { notifyInactiveMembers } from "@/lib/chat-notifications"

// GET /api/chat/channels/[channelId]/messages — Fetch messages (paginated)
export async function GET(
    req: Request,
    { params }: { params: { channelId: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const userId = Number(session.user.id)
        const { channelId } = params
        const { searchParams } = new URL(req.url)
        const before = searchParams.get("before") // cursor: message ID
        const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)
        const after = searchParams.get("after") // for polling: get messages after this timestamp

        // Check membership with retry
        const membership = await withDbRetry(() =>
            db.chatChannelMember.findUnique({
                where: { channelId_userId: { channelId, userId } },
            })
        )

        if (!membership) {
            return NextResponse.json({ error: "Not a member" }, { status: 403 })
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = { channelId }

        if (before) {
            // Pagination: older messages before this cursor
            const cursorMsg = await withDbRetry(() =>
                db.chatMessage.findUnique({
                    where: { id: before },
                    select: { createdAt: true },
                })
            )
            if (cursorMsg) {
                where.createdAt = { lt: cursorMsg.createdAt }
            }
        } else if (after) {
            // Polling: newer messages after this timestamp
            where.createdAt = { gt: new Date(after) }
        }

        const messages = await withDbRetry(() =>
            db.chatMessage.findMany({
                where,
                include: {
                    sender: {
                        select: { id: true, name: true, email: true, role: true, employeeId: true },
                    },
                },
                orderBy: { createdAt: before ? "desc" : "asc" },
                take: limit,
            })
        )

        // If using "before" cursor, reverse to chronological order
        if (before) {
            messages.reverse()
        }

        const hasMore = messages.length === limit

        const resolveMediaUrl = (url: string | null, key: string | null) => {
            if (!url && !key) return null
            if (url && !url.includes("REPLACE-WITH-YOUR") && url.startsWith("http")) {
                return url
            }
            if (key) {
                return `/api/chat/voice-file?key=${encodeURIComponent(key)}`
            }
            return url
        }

        return NextResponse.json({
            messages: messages.map((m) => ({
                id: m.id,
                channelId: m.channelId,
                senderId: m.senderId,
                sender: m.sender,
                type: m.type,
                content: m.content,
                mediaUrl: resolveMediaUrl(m.mediaUrl, m.mediaKey),
                mediaDuration: m.mediaDuration,
                isSystem: m.isSystem,
                createdAt: m.createdAt.toISOString(),
            })),
            hasMore,
        })
    } catch (error: any) {
        console.error("[Messages GET API Error]", error)
        return NextResponse.json(
            { error: "Database service temporarily unavailable, retrying...", messages: [], hasMore: false },
            { status: 503 }
        )
    }
}

// POST /api/chat/channels/[channelId]/messages — Send a text message
export async function POST(
    req: Request,
    { params }: { params: { channelId: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const userId = Number(session.user.id)
        const { channelId } = params

        // Check membership with retry
        const membership = await withDbRetry(() =>
            db.chatChannelMember.findUnique({
                where: { channelId_userId: { channelId, userId } },
            })
        )

        if (!membership) {
            return NextResponse.json({ error: "Not a member" }, { status: 403 })
        }

        const body = await req.json()
        const { content } = body as { content: string }

        if (!content || content.trim().length === 0) {
            return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 })
        }

        if (content.length > 5000) {
            return NextResponse.json({ error: "Message too long (max 5000 characters)" }, { status: 400 })
        }

        const message = await withDbRetry(() =>
            db.chatMessage.create({
                data: {
                    channelId,
                    senderId: userId,
                    type: "TEXT",
                    content: content.trim(),
                },
                include: {
                    sender: {
                        select: { id: true, name: true, email: true, role: true, employeeId: true },
                    },
                },
            })
        )

        // Update channel's updatedAt and sender's lastReadAt in parallel
        await Promise.all([
            withDbRetry(() =>
                db.chatChannel.update({
                    where: { id: channelId },
                    data: { updatedAt: new Date() },
                })
            ),
            withDbRetry(() =>
                db.chatChannelMember.update({
                    where: { channelId_userId: { channelId, userId } },
                    data: { lastReadAt: new Date() },
                })
            ),
        ])

        // Notify inactive members (fire-and-forget)
        notifyInactiveMembers(channelId, userId).catch(() => {})

        return NextResponse.json({
            id: message.id,
            channelId: message.channelId,
            senderId: message.senderId,
            sender: message.sender,
            type: message.type,
            content: message.content,
            mediaUrl: message.mediaUrl,
            mediaDuration: message.mediaDuration,
            isSystem: message.isSystem,
            createdAt: message.createdAt.toISOString(),
        })
    } catch (error: any) {
        console.error("[Messages POST API Error]", error)
        return NextResponse.json(
            { error: "Database connection failed. Please try sending again in a moment." },
            { status: 503 }
        )
    }
}

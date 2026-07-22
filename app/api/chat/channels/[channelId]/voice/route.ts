import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { uploadVoiceNote } from "@/lib/chat-storage"
import { notifyInactiveMembers } from "@/lib/chat-notifications"

// POST /api/chat/channels/[channelId]/voice — Upload a voice note
export async function POST(
    req: Request,
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
        return NextResponse.json({ error: "Not a member" }, { status: 403 })
    }

    try {
        const formData = await req.formData()
        const audioFile = formData.get("audio") as File | null
        const durationStr = formData.get("duration") as string | null

        if (!audioFile) {
            return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
        }

        // Validate file size (max 5MB)
        if (audioFile.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: "Voice note too large (max 5MB)" }, { status: 400 })
        }

        // Validate MIME type
        const mimeType = audioFile.type || "audio/webm"
        if (!mimeType.startsWith("audio/")) {
            return NextResponse.json({ error: "Invalid file type. Only audio files allowed." }, { status: 400 })
        }

        const duration = durationStr ? parseInt(durationStr, 10) : null

        // Convert File to Buffer
        const arrayBuffer = await audioFile.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Upload to R2
        const { key, url } = await uploadVoiceNote(channelId, buffer, mimeType, audioFile.name)

        // Create message
        const message = await db.chatMessage.create({
            data: {
                channelId,
                senderId: userId,
                type: "VOICE",
                content: null,
                mediaUrl: url,
                mediaKey: key,
                mediaDuration: duration,
            },
            include: {
                sender: {
                    select: { id: true, name: true, email: true, role: true, employeeId: true },
                },
            },
        })

        // Update channel's updatedAt
        await db.chatChannel.update({
            where: { id: channelId },
            data: { updatedAt: new Date() },
        })

        // Update sender's lastReadAt
        await db.chatChannelMember.update({
            where: { channelId_userId: { channelId, userId } },
            data: { lastReadAt: new Date() },
        })

        // Notify inactive members
        notifyInactiveMembers(channelId, userId).catch(() => {})

        return NextResponse.json({
            id: message.id,
            channelId: message.channelId,
            senderId: message.senderId,
            sender: message.sender,
            type: message.type,
            content: message.content,
            mediaUrl: (message.mediaUrl && !message.mediaUrl.includes("REPLACE-WITH-YOUR") && message.mediaUrl.startsWith("http"))
                ? message.mediaUrl
                : `/api/chat/voice-file?key=${encodeURIComponent(key)}`,
            mediaDuration: message.mediaDuration,
            isSystem: message.isSystem,
            createdAt: message.createdAt.toISOString(),
        })
    } catch (error) {
        console.error("[Voice Upload Error]", error)
        const errMsg = error instanceof Error ? error.message : "Failed to upload voice note"
        return NextResponse.json({ error: errMsg }, { status: 500 })
    }
}

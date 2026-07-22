import { db } from "@/lib/db"
import { sendEmail } from "@/lib/email"
import { getChatNotificationEmailTemplate } from "@/lib/chat-email-template"

const INACTIVE_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes
const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000"

/**
 * Notify inactive channel members about new messages.
 * "Inactive" = their lastReadAt is older than 5 minutes ago.
 * Sends one email per inactive user with a digest of unread messages.
 */
export async function notifyInactiveMembers(
    channelId: string,
    senderId: number
) {
    try {
        const now = new Date()
        const threshold = new Date(now.getTime() - INACTIVE_THRESHOLD_MS)

        // Find all channel members who are inactive (haven't read in 5+ minutes)
        // and are NOT the sender
        const inactiveMembers = await db.chatChannelMember.findMany({
            where: {
                channelId,
                userId: { not: senderId },
                lastReadAt: { lt: threshold },
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
            },
        })

        if (inactiveMembers.length === 0) return

        // Get channel name
        const channel = await db.chatChannel.findUnique({
            where: { id: channelId },
            select: { name: true },
        })

        if (!channel) return

        // For each inactive member, get their unread messages
        for (const member of inactiveMembers) {
            if (!member.user.email) continue

            const unreadMessages = await db.chatMessage.findMany({
                where: {
                    channelId,
                    createdAt: { gt: member.lastReadAt },
                    isSystem: false,
                },
                include: {
                    sender: { select: { name: true } },
                },
                orderBy: { createdAt: "asc" },
                take: 15, // Cap at 15 messages for the email
            })

            if (unreadMessages.length === 0) continue

            const chatUrl = `${APP_URL}/crm-dashboard/chat?channel=${channelId}`

            const { subject, html } = getChatNotificationEmailTemplate({
                recipientName: member.user.name || "Team Member",
                channelName: channel.name,
                messages: unreadMessages.map((msg) => ({
                    senderName: msg.sender.name || "Unknown",
                    content: msg.content,
                    type: msg.type as "TEXT" | "VOICE",
                    mediaDuration: msg.mediaDuration,
                    createdAt: msg.createdAt.toISOString(),
                })),
                chatUrl,
            })

            // Send email (fire-and-forget, don't block the message send)
            sendEmail({ to: member.user.email, subject, html }).catch((err) => {
                console.error(`[Chat Notification] Failed to send email to ${member.user.email}:`, err)
            })
        }
    } catch (error) {
        // Never let notification failures block the main flow
        console.error("[Chat Notification] Error:", error)
    }
}

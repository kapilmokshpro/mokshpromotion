/**
 * Chat notification email template for Moksh Promotion CRM
 */
export function getChatNotificationEmailTemplate(data: {
    recipientName: string
    channelName: string
    messages: Array<{
        senderName: string
        content: string | null
        type: "TEXT" | "VOICE"
        mediaDuration: number | null
        createdAt: string
    }>
    chatUrl: string
}) {
    const subject = `💬 ${data.messages.length} new message${data.messages.length > 1 ? "s" : ""} in ${data.channelName} — Moksh CRM`

    const messageRows = data.messages
        .slice(0, 10) // Max 10 messages in email
        .map((msg) => {
            const time = new Date(msg.createdAt).toLocaleTimeString("en-IN", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
            })

            const initial = (msg.senderName || "?")[0].toUpperCase()

            let preview: string
            if (msg.type === "VOICE") {
                const dur = msg.mediaDuration || 0
                const mins = Math.floor(dur / 60)
                const secs = dur % 60
                preview = `🎤 Voice Note (${mins}:${secs.toString().padStart(2, "0")})`
            } else {
                preview = msg.content
                    ? msg.content.length > 120
                        ? msg.content.substring(0, 120) + "…"
                        : msg.content
                    : "(empty message)"
            }

            return `
            <tr>
                <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0;">
                    <table cellpadding="0" cellspacing="0" style="width: 100%;">
                        <tr>
                            <td style="width: 36px; vertical-align: top;">
                                <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #002147, #1a4b8c); color: white; font-size: 14px; font-weight: 600; text-align: center; line-height: 32px;">
                                    ${initial}
                                </div>
                            </td>
                            <td style="padding-left: 10px;">
                                <div style="font-weight: 600; font-size: 14px; color: #1a1a1a;">${msg.senderName} <span style="font-weight: 400; color: #888; font-size: 12px;">${time}</span></div>
                                <div style="font-size: 14px; color: #555; margin-top: 2px;">${preview}</div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>`
        })
        .join("")

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Chat Messages</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
    
    <div style="background: linear-gradient(135deg, #002147 0%, #1a4b8c 100%); padding: 24px 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 600;">💬 New Messages in Team Chat</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 14px;">#${data.channelName}</p>
    </div>
    
    <div style="background: white; border-radius: 0 0 12px 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <div style="padding: 20px 24px 12px;">
            <p style="margin: 0; font-size: 14px; color: #666;">Hi ${data.recipientName},</p>
            <p style="margin: 8px 0 0; font-size: 14px; color: #666;">You have ${data.messages.length} unread message${data.messages.length > 1 ? "s" : ""}:</p>
        </div>

        <table cellpadding="0" cellspacing="0" style="width: 100%;">
            ${messageRows}
        </table>

        ${data.messages.length > 10 ? `
        <div style="padding: 8px 16px; text-align: center; color: #888; font-size: 13px;">
            ... and ${data.messages.length - 10} more messages
        </div>
        ` : ""}

        <div style="padding: 20px 24px; text-align: center;">
            <a href="${data.chatUrl}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #002147, #1a4b8c); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                Open Chat →
            </a>
        </div>
    </div>

    <div style="text-align: center; padding: 16px 0; color: #999; font-size: 12px;">
        Moksh Promotion Ltd. — CRM Team Chat
    </div>
</body>
</html>`

    return { subject, html }
}

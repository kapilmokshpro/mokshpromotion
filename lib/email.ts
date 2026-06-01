type SendEmailParams = {
    to: string
    subject: string
    html: string
    replyTo?: string
    attachments?: Array<{
        filename: string
        content: string
    }>
}

type SendEmailResult =
    | { success: true; simulated?: true; provider?: "resend" }
    | { success: false; error: unknown; code?: string; reason?: "AUTH_FAILED" | "SEND_FAILED" }

const cleanEnvValue = (value?: string) => {
    const trimmed = (value || "").trim()
    if (!trimmed) return ""

    const startsWithQuote = trimmed.startsWith('"') || trimmed.startsWith("'")
    const endsWithQuote = trimmed.endsWith('"') || trimmed.endsWith("'")
    if (startsWithQuote && endsWithQuote && trimmed.length >= 2) {
        return trimmed.slice(1, -1).trim()
    }

    return trimmed
}

const getFirstEnv = (keys: string[]) => {
    for (const key of keys) {
        const value = cleanEnvValue(process.env[key])
        if (value) return value
    }
    return ""
}

const getResendApiKey = () => getFirstEnv(["RESEND_API_KEY", "RESEND_KEY"])

const getPrimaryFrom = () => {
    const from = getFirstEnv(["INFO_FROM", "RESEND_FROM", "EMAIL_FROM", "MAIL_FROM"])
    if (from) return from
    const infoEmail = getFirstEnv(["INFO_EMAIL"])
    if (infoEmail) return `"Moksh Promotion Ltd." <${infoEmail}>`
    return '"Moksh Promotion Ltd." <no-reply@mokshpromotion.com>'
}

export async function sendEmail({ to, subject, html, replyTo, attachments }: SendEmailParams) {
    console.log(`Attempting to send email to ${to}`)

    const resendApiKey = getResendApiKey()
    const from = getPrimaryFrom()

    if (!resendApiKey) {
        console.warn("RESEND_API_KEY missing. Email not sent (simulated).")
        return { success: true, simulated: true }
    }

    const payload: {
        from: string
        to: string[]
        subject: string
        html: string
        reply_to?: string
        attachments?: Array<{
            filename: string
            content: string
        }>
    } = {
        from,
        to: [to],
        subject,
        html,
    }

    if (replyTo) payload.reply_to = replyTo
    if (attachments && attachments.length > 0) payload.attachments = attachments

    try {
        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${resendApiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        })

        if (!response.ok) {
            let errorPayload: unknown = null
            try {
                errorPayload = await response.json()
            } catch {
                errorPayload = await response.text().catch(() => null)
            }

            const authFailed = response.status === 401 || response.status === 403
            const code = authFailed ? "EAUTH" : `HTTP_${response.status}`
            const reason = authFailed ? "AUTH_FAILED" : "SEND_FAILED"

            console.error("EMAIL_SEND_ERROR_RESEND", {
                status: response.status,
                errorPayload,
            })
            return { success: false, error: errorPayload, code, reason } satisfies SendEmailResult
        }

        const result = (await response.json().catch(() => null)) as { id?: string } | null
        if (result?.id) console.log("Resend message queued:", result.id)
        return { success: true, provider: "resend" }
    } catch (error) {
        console.error("EMAIL_SEND_ERROR_RESEND", error)
        return { success: false, error, code: "NETWORK_ERROR", reason: "SEND_FAILED" } satisfies SendEmailResult
    }
}

import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
})

export async function sendWorkAssignedEmail(email: string, title: string, adminName: string) {
    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaec; border-radius: 8px;">
            <h2 style="color: #333;">New Task Assigned</h2>
            <p style="color: #555;">Hello,</p>
            <p style="color: #555;">You have been assigned a new task: <strong style="color: #000;">${title}</strong></p>
            <p style="color: #555;">Assigned by: <strong>${adminName}</strong></p>
            <p style="color: #555; margin-top: 20px;">Please log in to the Moksh Promotion portal to view the details and update the task status.</p>
            <br/>
            <p style="color: #777; font-size: 14px;">Best regards,<br/>Moksh Promotion Ltd.</p>
        </div>
    `

    try {
        await transporter.sendMail({
            from: getPrimaryFrom(),
            to: email,
            subject: `New Task Assigned: ${title}`,
            html,
        })
        console.log(`Task assignment email sent to ${email} via nodemailer`)
        return { success: true }
    } catch (error) {
        console.error("EMAIL_SEND_ERROR_NODEMAILER", error)
        // Fallback to resend if nodemailer fails or is not configured
        return sendEmail({
            to: email,
            subject: `New Task Assigned: ${title}`,
            html,
        })
    }
}

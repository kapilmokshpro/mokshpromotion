type SendEmailParams = {
    to: string
    subject: string
    html: string
    replyTo?: string
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

export async function sendEmail({ to, subject, html, replyTo }: SendEmailParams) {
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
    } = {
        from,
        to: [to],
        subject,
        html,
    }

    if (replyTo) payload.reply_to = replyTo

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

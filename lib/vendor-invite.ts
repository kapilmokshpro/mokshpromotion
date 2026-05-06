import crypto from "crypto"
import { db } from "@/lib/db"

const VENDOR_INVITE_PREFIX = "vendor-invite"
const VENDOR_INVITE_EXPIRY_HOURS = 24

const getIdentifier = (userId: number, email: string) =>
    `${VENDOR_INVITE_PREFIX}:${userId}:${email.trim().toLowerCase()}`

const hashToken = (token: string) =>
    crypto.createHash("sha256").update(token).digest("hex")

export function generateVendorInviteToken() {
    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + VENDOR_INVITE_EXPIRY_HOURS * 60 * 60 * 1000)
    return { token, expiresAt }
}

export async function createVendorInvite(params: {
    userId: number
    email: string
}) {
    const { token, expiresAt } = generateVendorInviteToken()
    const identifier = getIdentifier(params.userId, params.email)
    const tokenHash = hashToken(token)

    await db.verificationToken.deleteMany({
        where: { identifier }
    })

    await db.verificationToken.create({
        data: {
            identifier,
            token: tokenHash,
            expires: expiresAt
        }
    })

    return { token, expiresAt }
}

export async function verifyVendorInvite(params: {
    userId: number
    email: string
    token: string
}) {
    const identifier = getIdentifier(params.userId, params.email)
    const tokenHash = hashToken(params.token)

    const record = await db.verificationToken.findUnique({
        where: {
            identifier_token: {
                identifier,
                token: tokenHash
            }
        }
    })

    if (!record) return { valid: false as const, reason: "INVALID" as const }
    if (record.expires < new Date()) return { valid: false as const, reason: "EXPIRED" as const }

    return { valid: true as const, identifier, tokenHash }
}

export async function consumeVendorInvite(params: {
    userId: number
    email: string
    token: string
}) {
    const identifier = getIdentifier(params.userId, params.email)
    const tokenHash = hashToken(params.token)

    await db.verificationToken.deleteMany({
        where: {
            identifier,
            token: tokenHash
        }
    })
}


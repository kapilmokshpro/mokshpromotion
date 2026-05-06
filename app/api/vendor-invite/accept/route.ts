import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { db } from "@/lib/db"
import { verifyVendorInvite, consumeVendorInvite } from "@/lib/vendor-invite"
import { createAuditLog } from "@/lib/audit"

const vendorInviteAcceptSchema = z.object({
    vendorId: z.coerce.number().int().positive(),
    email: z.string().trim().toLowerCase().email(),
    token: z.string().min(10),
    password: z.string().min(6, "Password must be at least 6 characters"),
})

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const parsed = vendorInviteAcceptSchema.safeParse(body)
        if (!parsed.success) {
            return new NextResponse(parsed.error.issues[0]?.message || "Invalid request", { status: 400 })
        }

        const { vendorId, email, token, password } = parsed.data
        const vendor = await db.user.findUnique({
            where: { id: vendorId },
            select: { id: true, email: true, role: true }
        })

        if (!vendor || vendor.role !== "VENDOR" || vendor.email.toLowerCase() !== email.toLowerCase()) {
            return new NextResponse("Vendor invite is invalid", { status: 400 })
        }

        const verification = await verifyVendorInvite({
            userId: vendorId,
            email,
            token
        })
        if (!verification.valid) {
            return new NextResponse(
                verification.reason === "EXPIRED" ? "Invite link has expired" : "Invalid invite link",
                { status: 400 }
            )
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        await db.user.update({
            where: { id: vendorId },
            data: { password: hashedPassword }
        })

        await consumeVendorInvite({ userId: vendorId, email, token })

        await createAuditLog(
            vendorId,
            "VENDOR_PASSWORD_SET",
            "User",
            String(vendorId),
            { via: "invite" }
        )

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("VENDOR_INVITE_ACCEPT", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

